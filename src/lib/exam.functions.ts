import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Verify token and start/resume attempt — returns attempt id
export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string; token: string }) =>
    z.object({ examId: z.string().uuid(), token: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: exam, error: ex } = await context.supabase
      .from("exams")
      .select("id, token, waktu_mulai, waktu_selesai, status")
      .eq("id", data.examId)
      .maybeSingle();
    if (ex || !exam) throw new Error("Ujian tidak ditemukan");
    if (exam.status !== "aktif") throw new Error("Ujian belum aktif");
    if (exam.token.trim() !== data.token.trim()) throw new Error("Token salah");
    const now = new Date();
    if (now < new Date(exam.waktu_mulai)) throw new Error("Ujian belum dimulai");
    if (now > new Date(exam.waktu_selesai)) throw new Error("Ujian telah berakhir");

    // Find or create attempt
    const { data: existing } = await context.supabase
      .from("exam_attempts")
      .select("id, status")
      .eq("exam_id", data.examId)
      .eq("siswa_id", context.userId)
      .maybeSingle();
    if (existing) {
      if (existing.status === "selesai") throw new Error("Anda sudah menyelesaikan ujian ini");
      return { attemptId: existing.id };
    }
    const { data: created, error: ce } = await context.supabase
      .from("exam_attempts")
      .insert({ exam_id: data.examId, siswa_id: context.userId })
      .select("id")
      .single();
    if (ce) throw new Error(ce.message);
    return { attemptId: created.id };
  });

// Get exam data for student during attempt (sanitized — no answer keys)
export const getAttemptForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: attempt, error } = await context.supabase
      .from("exam_attempts")
      .select("id, exam_id, siswa_id, waktu_mulai, status, skor, exams(id, judul, durasi_menit, waktu_mulai, waktu_selesai, acak_soal, acak_opsi)")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (error || !attempt) throw new Error("Attempt tidak ditemukan");
    if (attempt.siswa_id !== context.userId) throw new Error("Forbidden");
    const exam = attempt.exams as { id: string; judul: string; durasi_menit: number; waktu_mulai: string; waktu_selesai: string; acak_soal: boolean; acak_opsi: boolean };

    // Use admin client to read questions (siswa cannot via RLS) — sanitize
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: eqs } = await supabaseAdmin
      .from("exam_questions")
      .select("urutan, questions(id, pertanyaan, opsi_jawaban, gambar_url, bobot, tipe)")
      .eq("exam_id", exam.id)
      .order("urutan");

    type RawQ = { id: string; pertanyaan: string; opsi_jawaban: string[]; gambar_url: string | null; bobot: number; tipe: string };
    let questions: RawQ[] = (eqs ?? []).map((r) => {
      const q = r.questions as unknown as { id: string; pertanyaan: string; opsi_jawaban: unknown; gambar_url: string | null; bobot: number; tipe: string };
      return { ...q, opsi_jawaban: Array.isArray(q.opsi_jawaban) ? (q.opsi_jawaban as string[]) : [] };
    }).filter(Boolean);

    // Deterministic shuffle by attempt id
    const seed = hashSeed(attempt.id);
    if (exam.acak_soal) questions = shuffle(questions, seed);
    if (exam.acak_opsi) {
      questions = questions.map((q, i) => ({ ...q, opsi_jawaban: shuffle(q.opsi_jawaban, seed + i + 1) }));
    }

    // Load existing answers
    const { data: answers } = await context.supabase
      .from("answers")
      .select("question_id, jawaban_siswa")
      .eq("attempt_id", data.attemptId);

    return {
      attempt: { id: attempt.id, waktu_mulai: attempt.waktu_mulai, status: attempt.status, skor: attempt.skor },
      exam,
      questions,
      answers: answers ?? [],
    };
  });

// Auto-save answer
export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; questionId: string; jawaban: string | null }) =>
    z.object({ attemptId: z.string().uuid(), questionId: z.string().uuid(), jawaban: z.string().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    // Verify ownership
    const { data: a } = await context.supabase.from("exam_attempts").select("siswa_id, status").eq("id", data.attemptId).maybeSingle();
    if (!a || a.siswa_id !== context.userId) throw new Error("Forbidden");
    if (a.status === "selesai") throw new Error("Ujian sudah selesai");
    const { error } = await context.supabase
      .from("answers")
      .upsert({ attempt_id: data.attemptId, question_id: data.questionId, jawaban_siswa: data.jawaban, updated_at: new Date().toISOString() }, { onConflict: "attempt_id,question_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Submit attempt — grade MC automatically
export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: attempt } = await context.supabase
      .from("exam_attempts").select("id, siswa_id, exam_id, status").eq("id", data.attemptId).maybeSingle();
    if (!attempt || attempt.siswa_id !== context.userId) throw new Error("Forbidden");
    if (attempt.status === "selesai") return { ok: true, skor: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: eqs } = await supabaseAdmin
      .from("exam_questions")
      .select("questions(id, kunci_jawaban, bobot, tipe)")
      .eq("exam_id", attempt.exam_id);
    type Q = { id: string; kunci_jawaban: string; bobot: number; tipe: string };
    const questions: Q[] = (eqs ?? []).map((r) => r.questions as Q).filter(Boolean);

    const { data: answers } = await supabaseAdmin
      .from("answers").select("question_id, jawaban_siswa").eq("attempt_id", data.attemptId);
    const ansMap = new Map((answers ?? []).map((a) => [a.question_id, a.jawaban_siswa]));

    let totalBobot = 0, earned = 0;
    const updates: { id: string; benar: boolean }[] = [];
    for (const q of questions) {
      if (q.tipe !== "pg") continue;
      totalBobot += q.bobot;
      const userAns = ansMap.get(q.id);
      const correct = userAns != null && String(userAns).trim().toUpperCase() === q.kunci_jawaban.trim().toUpperCase();
      if (correct) earned += q.bobot;
      // Update benar flag
      if (userAns != null) {
        await supabaseAdmin.from("answers").update({ benar: correct }).eq("attempt_id", data.attemptId).eq("question_id", q.id);
      } else {
        await supabaseAdmin.from("answers").upsert({ attempt_id: data.attemptId, question_id: q.id, jawaban_siswa: null, benar: false }, { onConflict: "attempt_id,question_id" });
      }
    }
    void updates;
    const skor = totalBobot > 0 ? Math.round((earned / totalBobot) * 100 * 100) / 100 : 0;
    await context.supabase
      .from("exam_attempts")
      .update({ status: "selesai", waktu_selesai: new Date().toISOString(), skor })
      .eq("id", data.attemptId);
    return { ok: true, skor };
  });

// Get result detail
export const getResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: attempt } = await context.supabase
      .from("exam_attempts")
      .select("id, siswa_id, skor, status, waktu_mulai, waktu_selesai, exam_id, exams(judul, durasi_menit)")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Tidak ditemukan");
    // Allow siswa own, or guru/admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const isOwn = attempt.siswa_id === context.userId;
    if (!isOwn && !isAdmin) {
      const { data: exam } = await context.supabase.from("exams").select("pembuat_id").eq("id", attempt.exam_id).maybeSingle();
      if (!exam || exam.pembuat_id !== context.userId) throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: answers } = await supabaseAdmin
      .from("answers")
      .select("question_id, jawaban_siswa, benar, questions(pertanyaan, kunci_jawaban, bobot, opsi_jawaban)")
      .eq("attempt_id", data.attemptId);
    return { attempt, answers: answers ?? [] };
  });

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptForStudent, saveAnswer, submitAttempt } from "@/lib/exam.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Clock, Flag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/siswa/exam/$attemptId")({
  component: ExamPage,
});

type Question = { id: string; pertanyaan: string; opsi_jawaban: string[]; gambar_url: string | null; bobot: number; tipe: string };

function ExamPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const getData = useServerFn(getAttemptForStudent);
  const save = useServerFn(saveAnswer);
  const submit = useServerFn(submitAttempt);

  const { data, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getData({ data: { attemptId } }),
    refetchOnWindowFocus: false,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);
  const submittedRef = useRef(false);

  // Initialize answers from server
  useEffect(() => {
    if (data) {
      const map: Record<string, string> = {};
      for (const a of data.answers) if (a.jawaban_siswa != null) map[a.question_id] = a.jawaban_siswa;
      setAnswers(map);
    }
  }, [data]);

  // Timer
  useEffect(() => {
    if (!data) return;
    const startMs = new Date(data.attempt.waktu_mulai).getTime();
    const endMs = startMs + data.exam.durasi_menit * 60_000;
    const examEndMs = new Date(data.exam.waktu_selesai).getTime();
    const deadline = Math.min(endMs, examEndMs);
    const tick = () => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !submittedRef.current) {
        submittedRef.current = true;
        handleSubmit(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Fullscreen
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  const questions = useMemo(() => (data?.questions ?? []) as Question[], [data]);

  async function selectAnswer(qid: string, letter: string) {
    setAnswers((p) => ({ ...p, [qid]: letter }));
    try { await save({ data: { attemptId, questionId: qid, jawaban: letter } }); }
    catch (e) { toast.error("Gagal menyimpan: " + (e as Error).message); }
  }

  async function handleSubmit(auto = false) {
    setSubmitting(true);
    try {
      const res = await submit({ data: { attemptId } });
      toast.success(auto ? `Waktu habis. Skor: ${res.skor}` : `Selesai. Skor: ${res.skor}`);
      navigate({ to: "/siswa/result/$attemptId", params: { attemptId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  if (isLoading || !data) return <div className="min-h-screen grid place-items-center">Memuat ujian...</div>;
  if (data.attempt.status === "selesai") {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <p className="mb-3">Anda sudah menyelesaikan ujian ini.</p>
          <Button onClick={() => navigate({ to: "/siswa/result/$attemptId", params: { attemptId } })}>Lihat Hasil</Button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const warning = remaining < 60;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-sm sm:text-base">{data.exam.judul}</h1>
            <p className="text-xs text-muted-foreground">Soal {current + 1} dari {questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 font-mono font-semibold ${warning ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-[1fr,260px] gap-6">
        {/* Question area */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Soal {current + 1}</span>
              <span className="text-muted-foreground">Bobot {q.bobot}</span>
              <button onClick={() => setFlags((p) => ({ ...p, [q.id]: !p[q.id] }))} className={`ml-auto flex items-center gap-1 text-xs rounded px-2 py-1 ${flags[q.id] ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                <Flag className="h-3 w-3" />Ragu-ragu
              </button>
            </div>
            <p className="text-base whitespace-pre-wrap">{q.pertanyaan}</p>
            {q.gambar_url && <img src={q.gambar_url} alt="" className="max-h-72 rounded border" />}
            <div className="space-y-2 pt-2">
              {q.opsi_jawaban.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const selected = answers[q.id] === letter;
                return (
                  <button key={i} onClick={() => selectAnswer(q.id, letter)} className={`w-full text-left rounded-lg border-2 p-3 transition ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <span className={`inline-grid h-7 w-7 mr-3 place-items-center rounded-md font-semibold ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{letter}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>Sebelumnya</Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>Selanjutnya</Button>
              ) : (
                <Button onClick={() => setConfirmOpen(true)}>Selesaikan Ujian</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigator */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((qq, i) => {
                const answered = !!answers[qq.id];
                const ragu = flags[qq.id];
                const active = i === current;
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrent(i)}
                    className={`relative aspect-square rounded-md text-sm font-medium border-2 transition
                      ${active ? "ring-2 ring-primary" : ""}
                      ${ragu ? "bg-warning text-warning-foreground border-warning" : answered ? "bg-success text-success-foreground border-success" : "bg-muted text-foreground border-border"}`}
                  >{i + 1}</button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1 text-xs">
              <Legend className="bg-success" label="Sudah dijawab" />
              <Legend className="bg-warning" label="Ragu-ragu" />
              <Legend className="bg-muted border" label="Belum dijawab" />
            </div>
            <Button className="w-full mt-4" variant="destructive" onClick={() => setConfirmOpen(true)}>Selesaikan Ujian</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Selesaikan ujian?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda telah menjawab {Object.keys(answers).length} dari {questions.length} soal. Jawaban tidak bisa diubah setelah submit.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>Ya, Selesaikan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`inline-block h-4 w-4 rounded ${className}`} />{label}</div>;
}

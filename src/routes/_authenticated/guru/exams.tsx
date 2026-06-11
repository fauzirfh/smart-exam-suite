import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Exam = {
  id: string;
  judul: string;
  subject_id: string;
  durasi_menit: number;
  waktu_mulai: string;
  waktu_selesai: string;
  token: string;
  acak_soal: boolean;
  acak_opsi: boolean;
  status: "draft" | "aktif" | "selesai";
};

export const Route = createFileRoute("/_authenticated/guru/exams")({
  component: ExamsPage,
});

function ExamsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("nama_mapel")).data ?? [],
  });
  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data as Exam[];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("exams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["exams"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Kelola Ujian</CardTitle>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Buat Ujian</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{editing ? "Edit Ujian" : "Buat Ujian"}</DialogTitle></DialogHeader>
              <ExamForm subjects={subjects ?? []} exam={editing} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["exams"] }); }} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? "Memuat..." : (exams?.length === 0 ? <p className="text-muted-foreground">Belum ada ujian.</p> : (
            <div className="space-y-3">
              {exams!.map((e) => {
                const subj = subjects?.find((s) => s.id === e.subject_id);
                return (
                  <div key={e.id} className="rounded-lg border p-4 flex justify-between items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{e.judul}</h3>
                        <Badge variant={e.status === "aktif" ? "default" : "secondary"} className="capitalize">{e.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {subj?.nama_mapel} • Durasi {e.durasi_menit} menit • Token: <span className="font-mono">{e.token}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(e.waktu_mulai).toLocaleString("id-ID")} → {new Date(e.waktu_selesai).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus ujian?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ExamForm({ subjects, exam, onSaved }: { subjects: { id: string; nama_mapel: string }[]; exam: Exam | null; onSaved: () => void }) {
  const [judul, setJudul] = useState(exam?.judul ?? "");
  const [subjectId, setSubjectId] = useState(exam?.subject_id ?? subjects[0]?.id ?? "");
  const [durasi, setDurasi] = useState(exam?.durasi_menit ?? 60);
  const [mulai, setMulai] = useState(exam?.waktu_mulai ? toLocalDT(exam.waktu_mulai) : toLocalDT(new Date().toISOString()));
  const [selesai, setSelesai] = useState(exam?.waktu_selesai ? toLocalDT(exam.waktu_selesai) : toLocalDT(new Date(Date.now() + 7 * 86400000).toISOString()));
  const [token, setToken] = useState(exam?.token ?? randomToken());
  const [acakSoal, setAcakSoal] = useState(exam?.acak_soal ?? false);
  const [acakOpsi, setAcakOpsi] = useState(exam?.acak_opsi ?? false);
  const [status, setStatus] = useState<"draft" | "aktif" | "selesai">(exam?.status ?? "draft");
  const [loading, setLoading] = useState(false);

  const { data: allQ } = useQuery({
    queryKey: ["all-questions", subjectId],
    queryFn: async () => (await supabase.from("questions").select("id, pertanyaan, bobot").eq("subject_id", subjectId)).data ?? [],
    enabled: !!subjectId,
  });
  const { data: existingEQ } = useQuery({
    queryKey: ["exam-questions", exam?.id],
    queryFn: async () => exam ? (await supabase.from("exam_questions").select("question_id").eq("exam_id", exam.id)).data ?? [] : [],
    enabled: !!exam,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Initialize selected when existing loads
  if (existingEQ && selected.size === 0 && existingEQ.length > 0) {
    setSelected(new Set(existingEQ.map((r) => r.question_id)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (selected.size === 0) { setLoading(false); return toast.error("Pilih minimal 1 soal"); }
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      judul, subject_id: subjectId, pembuat_id: userData.user?.id,
      durasi_menit: durasi, waktu_mulai: new Date(mulai).toISOString(), waktu_selesai: new Date(selesai).toISOString(),
      token, acak_soal: acakSoal, acak_opsi: acakOpsi, status,
    };
    let examId = exam?.id;
    if (exam) {
      const { error } = await supabase.from("exams").update(payload).eq("id", exam.id);
      if (error) { setLoading(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("exams").insert(payload).select("id").single();
      if (error) { setLoading(false); return toast.error(error.message); }
      examId = data.id;
    }
    // Replace exam_questions
    if (examId) {
      await supabase.from("exam_questions").delete().eq("exam_id", examId);
      const rows = Array.from(selected).map((qid, i) => ({ exam_id: examId!, question_id: qid, urutan: i + 1 }));
      if (rows.length > 0) {
        const { error } = await supabase.from("exam_questions").insert(rows);
        if (error) { setLoading(false); return toast.error(error.message); }
      }
    }
    setLoading(false); toast.success("Tersimpan"); onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
      <div><Label>Judul</Label><Input value={judul} onChange={(e) => setJudul(e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Mata Pelajaran</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama_mapel}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Durasi (menit)</Label><Input type="number" value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} min={1} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Mulai</Label><Input type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)} /></div>
        <div><Label>Selesai</Label><Input type="datetime-local" value={selesai} onChange={(e) => setSelesai(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Token Akses</Label><Input value={token} onChange={(e) => setToken(e.target.value)} className="font-mono" /></div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "aktif" | "selesai")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2"><Switch checked={acakSoal} onCheckedChange={setAcakSoal} /> Acak urutan soal</label>
        <label className="flex items-center gap-2"><Switch checked={acakOpsi} onCheckedChange={setAcakOpsi} /> Acak opsi jawaban</label>
      </div>
      <div>
        <Label>Pilih Soal ({selected.size} dipilih)</Label>
        <div className="rounded border max-h-60 overflow-y-auto p-2 space-y-1">
          {(allQ ?? []).map((q) => (
            <label key={q.id} className="flex items-start gap-2 p-2 hover:bg-accent rounded cursor-pointer">
              <Checkbox checked={selected.has(q.id)} onCheckedChange={(v) => { const n = new Set(selected); if (v) n.add(q.id); else n.delete(q.id); setSelected(n); }} />
              <span className="text-sm flex-1">{q.pertanyaan} <span className="text-muted-foreground">(bobot {q.bobot})</span></span>
            </label>
          ))}
          {(allQ ?? []).length === 0 && <p className="text-sm text-muted-foreground p-2">Tidak ada soal untuk mata pelajaran ini.</p>}
        </div>
      </div>
      <DialogFooter><Button type="submit" disabled={loading}>Simpan</Button></DialogFooter>
    </form>
  );
}

function toLocalDT(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function randomToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

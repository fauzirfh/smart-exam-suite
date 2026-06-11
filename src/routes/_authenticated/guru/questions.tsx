import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";

type Question = {
  id: string;
  subject_id: string;
  pertanyaan: string;
  opsi_jawaban: string[];
  kunci_jawaban: string;
  bobot: number;
  tingkat_kesulitan: string;
  gambar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/guru/questions")({
  component: QuestionsPage,
});

function QuestionsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Question | null>(null);
  const [open, setOpen] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("nama_mapel")).data ?? [],
  });
  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((q) => ({ ...q, opsi_jawaban: Array.isArray(q.opsi_jawaban) ? (q.opsi_jawaban as string[]) : [] })) as Question[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("questions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["questions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bank Soal</CardTitle>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Tambah Soal</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Edit Soal" : "Tambah Soal"}</DialogTitle></DialogHeader>
              <QuestionForm
                subjects={subjects ?? []}
                question={editing}
                onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["questions"] }); }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? "Memuat..." : (questions?.length === 0 ? <p className="text-muted-foreground">Belum ada soal.</p> : (
            <div className="space-y-3">
              {questions!.map((q) => {
                const subj = subjects?.find((s) => s.id === q.subject_id);
                return (
                  <div key={q.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex gap-2 text-xs text-muted-foreground mb-1">
                          <span>{subj?.nama_mapel}</span>
                          <span>• Bobot {q.bobot}</span>
                          <span>• {q.tingkat_kesulitan}</span>
                        </div>
                        <p className="font-medium">{q.pertanyaan}</p>
                        {q.gambar_url && <img src={q.gambar_url} alt="" className="mt-2 max-h-40 rounded" />}
                        <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm">
                          {q.opsi_jawaban.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const correct = letter === q.kunci_jawaban;
                            return <div key={i} className={correct ? "text-success font-medium" : ""}>{letter}. {opt}{correct && " ✓"}</div>;
                          })}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(q); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus soal ini?")) del.mutate(q.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
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

function QuestionForm({ subjects, question, onSaved }: { subjects: { id: string; nama_mapel: string }[]; question: Question | null; onSaved: () => void }) {
  const [subjectId, setSubjectId] = useState(question?.subject_id ?? subjects[0]?.id ?? "");
  const [pertanyaan, setPertanyaan] = useState(question?.pertanyaan ?? "");
  const [opsi, setOpsi] = useState<string[]>(question?.opsi_jawaban ?? ["", "", "", ""]);
  const [kunci, setKunci] = useState(question?.kunci_jawaban ?? "A");
  const [bobot, setBobot] = useState(question?.bobot ?? 1);
  const [kesulitan, setKesulitan] = useState(question?.tingkat_kesulitan ?? "sedang");
  const [gambarUrl, setGambarUrl] = useState(question?.gambar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = await supabase.storage.from("question-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) setGambarUrl(data.signedUrl);
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const filteredOpsi = opsi.filter((o) => o.trim() !== "");
    if (filteredOpsi.length < 2) { setLoading(false); return toast.error("Minimal 2 opsi"); }
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      subject_id: subjectId,
      pembuat_id: userData.user?.id,
      tipe: "pg" as const,
      pertanyaan,
      opsi_jawaban: filteredOpsi,
      kunci_jawaban: kunci.toUpperCase(),
      bobot,
      tingkat_kesulitan: kesulitan,
      gambar_url: gambarUrl || null,
    };
    const op = question
      ? supabase.from("questions").update(payload).eq("id", question.id)
      : supabase.from("questions").insert(payload);
    const { error } = await op;
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan");
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label>Mata Pelajaran</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama_mapel}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Pertanyaan</Label><Textarea value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} required rows={3} /></div>
      <div>
        <Label>Gambar (opsional)</Label>
        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} disabled={uploading} />
        {gambarUrl && <div className="relative mt-2 inline-block"><img src={gambarUrl} alt="" className="max-h-32 rounded" /><Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setGambarUrl("")}><X className="h-3 w-3" /></Button></div>}
      </div>
      <div>
        <Label>Opsi Jawaban (A–E)</Label>
        <div className="space-y-2">
          {opsi.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 font-semibold text-center">{String.fromCharCode(65 + i)}</span>
              <Input value={o} onChange={(e) => { const n = [...opsi]; n[i] = e.target.value; setOpsi(n); }} />
              {opsi.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setOpsi(opsi.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
            </div>
          ))}
          {opsi.length < 5 && <Button type="button" variant="outline" size="sm" onClick={() => setOpsi([...opsi, ""])}><Plus className="h-3 w-3 mr-1" />Tambah Opsi</Button>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Kunci Jawaban</Label>
          <Select value={kunci} onValueChange={setKunci}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{opsi.map((_, i) => <SelectItem key={i} value={String.fromCharCode(65 + i)}>{String.fromCharCode(65 + i)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Bobot</Label><Input type="number" min={1} value={bobot} onChange={(e) => setBobot(Number(e.target.value))} /></div>
        <div>
          <Label>Tingkat</Label>
          <Select value={kesulitan} onValueChange={setKesulitan}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mudah">Mudah</SelectItem>
              <SelectItem value="sedang">Sedang</SelectItem>
              <SelectItem value="sulit">Sulit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter><Button type="submit" disabled={loading || uploading}>Simpan</Button></DialogFooter>
    </form>
  );
}

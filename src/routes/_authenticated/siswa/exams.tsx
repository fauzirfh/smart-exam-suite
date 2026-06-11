import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { startAttempt } from "@/lib/exam.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/siswa/exams")({
  component: SiswaExamsPage,
});

type ExamRow = {
  id: string; judul: string; durasi_menit: number; waktu_mulai: string; waktu_selesai: string; status: string;
  subjects: { nama_mapel: string } | null;
};

function SiswaExamsPage() {
  const navigate = useNavigate();
  const start = useServerFn(startAttempt);
  const [openId, setOpenId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: exams } = useQuery({
    queryKey: ["siswa-exams"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("exams")
        .select("id, judul, durasi_menit, waktu_mulai, waktu_selesai, status, subjects(nama_mapel)")
        .eq("status", "aktif")
        .lte("waktu_mulai", nowIso)
        .gte("waktu_selesai", nowIso)
        .order("waktu_mulai", { ascending: false });
      return (data ?? []) as ExamRow[];
    },
  });

  const { data: myAttempts } = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => (await supabase.from("exam_attempts").select("id, exam_id, status, skor")).data ?? [],
  });

  async function handleStart() {
    if (!openId) return;
    setLoading(true);
    try {
      const { attemptId } = await start({ data: { examId: openId, token } });
      navigate({ to: "/siswa/exam/$attemptId", params: { attemptId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Daftar Ujian</h1>
      {(exams ?? []).length === 0 ? <p className="text-muted-foreground">Belum ada ujian aktif.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {exams!.map((e) => {
            const att = myAttempts?.find((a) => a.exam_id === e.id);
            return (
              <Card key={e.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{e.judul}</h3>
                      <p className="text-sm text-muted-foreground">{e.subjects?.nama_mapel}</p>
                    </div>
                    {att?.status === "selesai" && <Badge variant="secondary">Selesai • {att.skor}</Badge>}
                    {att?.status === "berlangsung" && <Badge>Berlangsung</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.durasi_menit} menit</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Token diperlukan</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Berakhir: {new Date(e.waktu_selesai).toLocaleString("id-ID")}
                  </div>
                  <div className="mt-4 flex gap-2">
                    {att?.status === "selesai" ? (
                      <Button variant="outline" onClick={() => navigate({ to: "/siswa/result/$attemptId", params: { attemptId: att.id } })}>Lihat Hasil</Button>
                    ) : att?.status === "berlangsung" ? (
                      <Button onClick={() => navigate({ to: "/siswa/exam/$attemptId", params: { attemptId: att.id } })}>Lanjutkan</Button>
                    ) : (
                      <Button onClick={() => { setOpenId(e.id); setToken(""); }}>Mulai</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Masukkan Token</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Token ujian</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} className="font-mono uppercase" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>Batal</Button>
            <Button onClick={handleStart} disabled={loading || !token}>Mulai Ujian</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

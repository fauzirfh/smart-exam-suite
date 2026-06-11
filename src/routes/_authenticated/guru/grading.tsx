import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/guru/grading")({
  component: GradingPage,
});

function GradingPage() {
  const { data: exams } = useQuery({
    queryKey: ["my-exams"],
    queryFn: async () => (await supabase.from("exams").select("id, judul").order("created_at", { ascending: false })).data ?? [],
  });
  const [examId, setExamId] = useState<string>("");
  const { data: attempts } = useQuery({
    queryKey: ["attempts", examId],
    queryFn: async () => {
      if (!examId) return [];
      const { data } = await supabase
        .from("exam_attempts")
        .select("id, siswa_id, status, skor, waktu_mulai, waktu_selesai, profiles!exam_attempts_siswa_id_fkey(nama, kelas)")
        .eq("exam_id", examId)
        .order("waktu_mulai", { ascending: false });
      return data ?? [];
    },
    enabled: !!examId,
  });
  // Fallback: profiles join may not have FK alias — fetch separately
  const { data: profilesMap } = useQuery({
    queryKey: ["profile-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nama, kelas");
      return new Map((data ?? []).map((p) => [p.id, p]));
    },
  });

  return (
    <AppShell>
      <Card>
        <CardHeader><CardTitle>Penilaian</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger><SelectValue placeholder="Pilih ujian" /></SelectTrigger>
              <SelectContent>{(exams ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.judul}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {examId && (
            <Table>
              <TableHeader><TableRow><TableHead>Siswa</TableHead><TableHead>Kelas</TableHead><TableHead>Status</TableHead><TableHead>Skor</TableHead><TableHead>Selesai</TableHead></TableRow></TableHeader>
              <TableBody>
                {(attempts ?? []).map((a) => {
                  const p = profilesMap?.get(a.siswa_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{p?.nama ?? a.siswa_id.slice(0, 8)}</TableCell>
                      <TableCell>{p?.kelas ?? "-"}</TableCell>
                      <TableCell className="capitalize">{a.status}</TableCell>
                      <TableCell className="font-semibold">{a.skor ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.waktu_selesai ? new Date(a.waktu_selesai).toLocaleString("id-ID") : "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {(attempts ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Belum ada percobaan.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

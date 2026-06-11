import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getResult } from "@/lib/exam.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/siswa/result/$attemptId")({
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  const fn = useServerFn(getResult);
  const { data, isLoading } = useQuery({ queryKey: ["result", attemptId], queryFn: () => fn({ data: { attemptId } }) });

  if (isLoading || !data) return <AppShell>Memuat...</AppShell>;
  const { attempt, answers } = data;
  const exam = attempt.exams as { judul: string; durasi_menit: number };
  const correct = answers.filter((a) => a.benar).length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle>Hasil Ujian</CardTitle></CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">{exam.judul}</p>
            <div className="my-4">
              <div className="text-6xl font-bold text-primary">{attempt.skor ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">dari 100</div>
            </div>
            <p className="text-sm">Benar {correct} dari {answers.length} soal</p>
            <Link to="/siswa/exams"><Button className="mt-6">Kembali ke Daftar Ujian</Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pembahasan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a, i) => {
              const q = a.questions as { pertanyaan: string; kunci_jawaban: string; bobot: number; opsi_jawaban: string[] };
              const opts = Array.isArray(q.opsi_jawaban) ? q.opsi_jawaban : [];
              return (
                <div key={a.question_id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    {a.benar ? <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium">{i + 1}. {q.pertanyaan}</p>
                      <p className="text-sm mt-1">Jawaban Anda: <span className="font-mono">{a.jawaban_siswa ?? "—"}</span></p>
                      <p className="text-sm">Kunci: <span className="font-mono text-success">{q.kunci_jawaban}</span> ({opts[q.kunci_jawaban.charCodeAt(0) - 65]})</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

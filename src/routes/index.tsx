import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, ShieldCheck, Timer, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ujian CBT — Computer Based Test untuk Sekolah" },
      { name: "description", content: "Platform ujian online yang modern, aman, dan mudah digunakan untuk admin, guru, dan siswa." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/40">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck className="h-5 w-5" /></div>
          Ujian CBT
        </div>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="ghost">Masuk</Button></Link>
          <Link to="/auth" search={{ tab: "register" } as never}><Button>Daftar</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
          Platform Ujian Berbasis Komputer untuk <span className="text-primary">Sekolah Modern</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Kelola bank soal, jadwal ujian, dan penilaian otomatis dalam satu tempat. Aman, cepat, dan ramah untuk siswa.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth"><Button size="lg">Mulai Sekarang</Button></Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto text-left">
          <Feature icon={<Users className="h-5 w-5" />} title="3 Peran Pengguna" desc="Admin, Guru, dan Siswa dengan hak akses yang aman." />
          <Feature icon={<Timer className="h-5 w-5" />} title="Timer & Auto-Save" desc="Jawaban tersimpan otomatis, submit otomatis saat waktu habis." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Aman & Adil" desc="Acak soal, token ujian, dan penilaian otomatis." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, ClipboardList, FileText, GraduationCap, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <AppShell><div className="text-muted-foreground">Memuat...</div></AppShell>;
  if (!profile) return null;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Selamat datang, {profile.nama}</h1>
        <p className="text-muted-foreground capitalize">Peran: {profile.role}</p>
      </div>
      {profile.role === "admin" && <AdminHome />}
      {profile.role === "guru" && <GuruHome />}
      {profile.role === "siswa" && <SiswaHome />}
    </AppShell>
  );
}

function AdminHome() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [siswa, guru, exams] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "siswa"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "guru"),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "aktif"),
      ]);
      return { siswa: siswa.count ?? 0, guru: guru.count ?? 0, exams: exams.count ?? 0 };
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon={<GraduationCap />} label="Siswa" value={data?.siswa ?? "-"} />
      <StatCard icon={<Users />} label="Guru" value={data?.guru ?? "-"} />
      <StatCard icon={<ClipboardList />} label="Ujian Aktif" value={data?.exams ?? "-"} />
      <div className="sm:col-span-3 grid gap-3 sm:grid-cols-2">
        <NavCard to="/admin/users" icon={<Users />} title="Kelola Pengguna" desc="Atur peran dan hapus pengguna" />
        <NavCard to="/admin/subjects" icon={<BookOpen />} title="Mata Pelajaran" desc="Tambah, edit, atau hapus mata pelajaran" />
      </div>
    </div>
  );
}

function GuruHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <NavCard to="/guru/questions" icon={<FileText />} title="Bank Soal" desc="Kelola soal pilihan ganda" />
      <NavCard to="/guru/exams" icon={<ClipboardList />} title="Kelola Ujian" desc="Buat dan atur paket ujian" />
      <NavCard to="/guru/grading" icon={<FileCheck2 />} title="Penilaian" desc="Lihat hasil ujian siswa" />
    </div>
  );
}

function SiswaHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <NavCard to="/siswa/exams" icon={<GraduationCap />} title="Daftar Ujian" desc="Lihat ujian yang tersedia dan mulai mengerjakan" />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">{icon}{label}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

function NavCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="block rounded-xl border bg-card p-5 hover:border-primary hover:shadow-sm transition">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary mb-3">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}

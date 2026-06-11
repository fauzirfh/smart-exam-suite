import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, LogOut, Users, BookOpen, FileText, ClipboardList, GraduationCap, LayoutDashboard, FileCheck2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = { to: string; label: string; icon: ReactNode };

const navByRole: Record<string, NavItem[]> = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/admin/users", label: "Pengguna", icon: <Users className="h-4 w-4" /> },
    { to: "/admin/subjects", label: "Mata Pelajaran", icon: <BookOpen className="h-4 w-4" /> },
  ],
  guru: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/guru/questions", label: "Bank Soal", icon: <FileText className="h-4 w-4" /> },
    { to: "/guru/exams", label: "Kelola Ujian", icon: <ClipboardList className="h-4 w-4" /> },
    { to: "/guru/grading", label: "Penilaian", icon: <FileCheck2 className="h-4 w-4" /> },
  ],
  siswa: [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/siswa/exams", label: "Daftar Ujian", icon: <GraduationCap className="h-4 w-4" /> },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navByRole[profile?.role ?? "siswa"] ?? [];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><BookOpenCheck className="h-4 w-4" /></div>
            <span className="hidden sm:inline">Ujian CBT</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {items.map((it) => {
              const active = pathname.startsWith(it.to) && (it.to !== "/dashboard" || pathname === "/dashboard");
              return (
                <Link key={it.to} to={it.to} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
                  {it.icon}{it.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-medium text-foreground">{profile?.nama}</div>
              <div className="text-muted-foreground capitalize">{profile?.role}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Keluar"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="md:hidden border-t">
          <div className="container mx-auto px-2 py-2 flex gap-1 overflow-x-auto">
            {items.map((it) => {
              const active = pathname.startsWith(it.to) && (it.to !== "/dashboard" || pathname === "/dashboard");
              return (
                <Link key={it.to} to={it.to} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs whitespace-nowrap ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
                  {it.icon}{it.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

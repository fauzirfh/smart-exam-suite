import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, updateUserRole, deleteUser } from "@/lib/admin.functions";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { data: me } = useProfile();
  const list = useServerFn(listUsers);
  const updateRole = useServerFn(updateUserRole);
  const del = useServerFn(deleteUser);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  const updateMut = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "guru" | "siswa" }) => updateRole({ data: vars }),
    onSuccess: () => { toast.success("Peran diperbarui"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => { toast.success("Pengguna dihapus"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me && me.role !== "admin") return <AppShell><div>Akses ditolak.</div></AppShell>;

  return (
    <AppShell>
      <Card>
        <CardHeader><CardTitle>Kelola Pengguna</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Memuat...</div> : error ? <div className="text-destructive">Error: {(error as Error).message}</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Kelas</TableHead><TableHead>Peran</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(data ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nama}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.kelas ?? "-"}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => updateMut.mutate({ userId: u.id, role: v as "admin" | "guru" | "siswa" })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="guru">Guru</SelectItem>
                            <SelectItem value="siswa">Siswa</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Hapus ${u.nama}?`)) delMut.mutate(u.id); }} disabled={u.id === me?.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

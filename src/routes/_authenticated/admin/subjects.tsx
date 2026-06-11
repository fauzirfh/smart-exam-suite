import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  component: SubjectsPage,
});

function SubjectsPage() {
  const qc = useQueryClient();
  const [nama, setNama] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("nama_mapel");
      if (error) throw error; return data;
    },
  });
  const add = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("subjects").insert({ nama_mapel: n });
      if (error) throw error;
    },
    onSuccess: () => { setNama(""); toast.success("Mata pelajaran ditambahkan"); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("subjects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <Card>
        <CardHeader><CardTitle>Mata Pelajaran</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); if (nama.trim()) add.mutate(nama.trim()); }} className="flex gap-2">
            <Input placeholder="Nama mata pelajaran" value={nama} onChange={(e) => setNama(e.target.value)} />
            <Button type="submit" disabled={add.isPending}>Tambah</Button>
          </form>
          {isLoading ? "Memuat..." : (
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.nama_mapel}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus mata pelajaran ini?")) del.mutate(s.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

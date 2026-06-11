import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Admin: list users with emails
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: usersData }] = await Promise.all([
      context.supabase.from("profiles").select("id, nama, role, kelas, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email]));
    return (profiles ?? []).map((p) => ({ ...p, email: emailMap.get(p.id) ?? "" }));
  });

// Admin: update role
export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "guru" | "siswa" }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "guru", "siswa"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ role: data.role }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: delete user
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("Tidak bisa menghapus diri sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

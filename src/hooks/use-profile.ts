import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  nama: string;
  role: "admin" | "guru" | "siswa";
  kelas: string | null;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, role, kelas")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

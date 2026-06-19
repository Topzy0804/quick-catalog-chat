import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSeller() {
  return useQuery({
    queryKey: ["my-seller"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

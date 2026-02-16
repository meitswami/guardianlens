import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHiddenModules() {
  const queryClient = useQueryClient();

  const { data: hiddenModules = [], isLoading } = useQuery({
    queryKey: ["hidden-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "hidden_modules")
        .single();
      if (error) throw error;
      return (data?.value as string[]) || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (modules: string[]) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: JSON.stringify(modules) as any, updated_at: new Date().toISOString() })
        .eq("key", "hidden_modules");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-modules"] });
    },
  });

  return { hiddenModules, isLoading, setHiddenModules: mutation.mutateAsync };
}

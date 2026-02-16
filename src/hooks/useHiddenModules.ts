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
    onMutate: async (newModules) => {
      await queryClient.cancelQueries({ queryKey: ["hidden-modules"] });
      const previous = queryClient.getQueryData<string[]>(["hidden-modules"]);
      queryClient.setQueryData(["hidden-modules"], newModules);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["hidden-modules"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-modules"] });
    },
  });

  return { hiddenModules, isLoading, setHiddenModules: mutation.mutateAsync };
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStats(enabled = true) {
  return useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
    enabled,
  });
}

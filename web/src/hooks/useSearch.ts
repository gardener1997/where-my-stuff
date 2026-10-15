import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchQuery } from "@/types";

export function useSearch(params: SearchQuery) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => api.search(params),
    enabled: params.q.trim().length > 0,
  });
}

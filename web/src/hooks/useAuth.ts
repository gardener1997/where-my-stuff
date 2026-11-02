import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LoginRequest } from "@/types";

/** Current logged-in user, or 401 when there is no session (or auth is off). */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me,
    enabled,
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LoginRequest) => api.login(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.clear();
      window.location.href = "/login";
    },
  });
}

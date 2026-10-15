import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateContainer } from "@/types";

export function useContainers(parentId?: string) {
  return useQuery({
    queryKey: ["containers", "list", parentId],
    queryFn: () => api.getContainers(parentId),
  });
}

export function useContainerTree() {
  return useQuery({
    queryKey: ["containers", "tree"],
    queryFn: api.getContainerTree,
  });
}

export function useContainer(id: string) {
  return useQuery({
    queryKey: ["containers", id],
    queryFn: () => api.getContainer(id),
    enabled: !!id,
  });
}

export function useCreateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContainer) => api.createContainer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContainer> }) =>
      api.updateContainer(id, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["containers", variables.id] });
    },
  });
}

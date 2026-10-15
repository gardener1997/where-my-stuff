const BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Stats
  getStats: () => request<import("@/types").Stats>("/stats"),

  // Search
  search: (params: import("@/types").SearchQuery) => {
    const qs = new URLSearchParams();
    qs.set("q", params.q);
    if (params.category_id) qs.set("category_id", params.category_id);
    if (params.container_id) qs.set("container_id", params.container_id);
    if (params.source_type) qs.set("source_type", params.source_type);
    if (params.page) qs.set("page", String(params.page));
    if (params.size) qs.set("size", String(params.size));
    return request<import("@/types").SearchResult>(`/search?${qs}`);
  },

  // Categories
  getCategories: () => request<import("@/types").Category[]>("/categories"),
  getCategoryTree: () => request<import("@/types").CategoryNode[]>("/categories/tree"),
  createCategory: (data: import("@/types").CreateCategory) =>
    request<import("@/types").Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<import("@/types").CreateCategory>) =>
    request<import("@/types").Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),

  // Containers
  getContainers: (parentId?: string) => {
    const qs = parentId ? `?parent_id=${parentId}` : "";
    return request<import("@/types").Container[]>(`/containers${qs}`);
  },
  getContainerTree: () => request<import("@/types").ContainerNode[]>("/containers/tree"),
  getContainer: (id: string) => request<import("@/types").ContainerDetail>(`/containers/${id}`),
  createContainer: (data: import("@/types").CreateContainer) =>
    request<import("@/types").Container>("/containers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateContainer: (id: string, data: Partial<import("@/types").CreateContainer>) =>
    request<import("@/types").Container>(`/containers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteContainer: (id: string) =>
    request<{ ok: boolean }>(`/containers/${id}`, { method: "DELETE" }),

  // Items
  getItems: (params: import("@/types").ListItemsQuery = {}) => {
    const qs = new URLSearchParams();
    if (params.category_id) qs.set("category_id", params.category_id);
    if (params.container_id) qs.set("container_id", params.container_id);
    if (params.source_type) qs.set("source_type", params.source_type);
    if (params.tag_id) qs.set("tag_id", params.tag_id);
    if (params.page) qs.set("page", String(params.page));
    if (params.size) qs.set("size", String(params.size));
    return request<import("@/types").PaginatedItems>(`/items?${qs}`);
  },
  getItem: (id: string) => request<import("@/types").ItemDetail>(`/items/${id}`),
  createItem: (data: import("@/types").CreateItem) =>
    request<import("@/types").ItemDetail>("/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateItem: (id: string, data: import("@/types").UpdateItem) =>
    request<import("@/types").ItemDetail>(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteItem: (id: string) => request<{ ok: boolean }>(`/items/${id}`, { method: "DELETE" }),

  // Tags
  getTags: () => request<import("@/types").Tag[]>("/tags"),
  createTag: (name: string) =>
    request<import("@/types").Tag>("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateTag: (id: string, name: string) =>
    request<import("@/types").Tag>(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  deleteTag: (id: string) => request<{ ok: boolean }>(`/tags/${id}`, { method: "DELETE" }),
  autocompleteTags: (q: string) =>
    request<import("@/types").Tag[]>(`/tags/autocomplete?q=${encodeURIComponent(q)}`),

  // Image upload (multipart)
  uploadItemImage: async (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/items/${itemId}/images`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    return res.json() as Promise<import("@/types").ItemImage>;
  },

  deleteItemImage: (itemId: string, imageId: string) =>
    request<{ ok: boolean }>(`/items/${itemId}/images/${imageId}`, {
      method: "DELETE",
    }),

  // Documents
  uploadItemDocument: async (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/items/${itemId}/documents`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    return res.json() as Promise<import("@/types").ItemDocument>;
  },

  deleteItemDocument: (itemId: string, docId: string) =>
    request<{ ok: boolean }>(`/items/${itemId}/documents/${docId}`, {
      method: "DELETE",
    }),
};

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import { containerPathText, formatDate } from "@/lib/utils";
import { Search, Package } from "lucide-react";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string; page: number } => ({
    q: (search.q as string) || "",
    page: (search.page as number) || 1,
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initialQ, page } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQ);

  useEffect(() => setQ(initialQ), [initialQ]);

  const { data, isLoading } = useSearch({ q: initialQ, page });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索物品、标签、容器…"
          className="w-full pl-12 pr-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </form>

      {/* Results */}
      {initialQ && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {isLoading ? "搜索中…" : data ? `找到 ${data.total} 个结果` : ""}
          </p>

          <div className="space-y-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border p-5">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-200/70 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-5 w-1/2 rounded-lg bg-gray-200/70 animate-pulse" />
                      <div className="h-3.5 w-2/3 rounded-lg bg-gray-200/70 animate-pulse" />
                      <div className="h-3 w-1/3 rounded-lg bg-gray-200/70 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            {!isLoading &&
              data?.items.map((hit) => (
                <Link
                  key={hit.item.id}
                  to="/items/$id"
                  params={{ id: hit.item.id }}
                  className="block bg-white rounded-2xl border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex gap-4">
                    {hit.item.thumb_path ? (
                      <img
                        src={`/images/${hit.item.thumb_path}`}
                        alt={hit.item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Package size={20} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{hit.item.name}</h3>
                      {hit.highlight && (
                        <p
                          className="text-sm text-gray-500 mt-1 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: hit.highlight }}
                        />
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>📍 {containerPathText(hit.item.container_path)}</span>
                        {hit.item.category_name && <span>📂 {hit.item.category_name}</span>}
                        <span>{formatDate(hit.item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>

          {!isLoading && data && data.items.length === 0 && (
            <div className="text-center py-12 text-gray-400">没有找到相关物品</div>
          )}

          {/* Pagination */}
          {data && data.total > data.size && (
            <div className="flex items-center justify-center gap-4 mt-8">
              {page > 1 && (
                <Link
                  to="/search"
                  search={{ q: initialQ, page: page - 1 }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  上一页
                </Link>
              )}
              <span className="text-sm text-gray-500">
                第 {page} 页 / 共 {Math.ceil(data.total / data.size)} 页
              </span>
              {page * data.size < data.total && (
                <Link
                  to="/search"
                  search={{ q: initialQ, page: page + 1 }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  下一页
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import { containerPathText, formatDate, imageUrl } from "@/lib/utils";
import { Search, Package, MapPin, ChevronRight } from "lucide-react";

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
    <div className="page max-w-4xl">
      <div className="page-head">
        <div>
          <h2 className="page-title">搜索</h2>
          <p className="page-sub">物品名、描述、位置说明、标签和存放路径都能搜到。</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card mb-7 flex items-center gap-2 p-2 transition-colors focus-within:border-line-strong"
      >
        <Search size={18} className="ml-2.5 shrink-0 text-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="充电器、说明书、蓝色箱子…"
          aria-label="搜索物品"
          className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-ink outline-none placeholder:text-muted/70"
          autoFocus
        />
        <button type="submit" className="btn btn-primary shrink-0 px-5 py-2.5">
          查找
        </button>
      </form>

      {initialQ && (
        <div>
          <p className="mb-3 text-sm text-muted">
            {isLoading ? "正在翻找…" : data ? `找到 ${data.total} 条记录` : ""}
          </p>

          <div className="space-y-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card flex gap-4 p-4">
                  <div className="h-16 w-16 shrink-0 animate-pulse rounded-tab bg-line/70" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-line/70" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-line/60" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-line/50" />
                  </div>
                </div>
              ))}

            {!isLoading &&
              data?.items.map((hit) => {
                const thumb = imageUrl(hit.item.thumb_path);
                return (
                  <Link
                    key={hit.item.id}
                    to="/items/$id"
                    params={{ id: hit.item.id }}
                    className="card card-hover flex gap-4 p-4"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-tab border border-line object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-tab border border-line bg-paper">
                        <Package size={18} className="text-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-ink">{hit.item.name}</h3>
                      {hit.highlight && (
                        <p
                          className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted"
                          dangerouslySetInnerHTML={{ __html: hit.highlight }}
                        />
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {containerPathText(hit.item.container_path)}
                        </span>
                        {hit.item.category_name && <span>{hit.item.category_name}</span>}
                        <span>{formatDate(hit.item.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>

          {!isLoading && data && data.items.length === 0 && (
            <div className="empty">
              <p>没有找到「{initialQ}」。</p>
              <p className="mt-1 text-sm">试试更短的关键词，或者换个说法。</p>
            </div>
          )}

          {data && data.total > data.size && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && (
                <Link to="/search" search={{ q: initialQ, page: page - 1 }} className="btn btn-ghost">
                  上一页
                </Link>
              )}
              <span className="text-sm text-muted">
                第 {page} 页 / 共 {Math.ceil(data.total / data.size)} 页
              </span>
              {page * data.size < data.total && (
                <Link to="/search" search={{ q: initialQ, page: page + 1 }} className="btn btn-ghost">
                  下一页
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

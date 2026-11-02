import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems } from "@/hooks/useItems";
import { containerPathText, formatDate, imageUrl } from "@/lib/utils";
import { Plus, Package, MapPin } from "lucide-react";

export const Route = createFileRoute("/items/")({
  validateSearch: (search: Record<string, unknown>): { page: number } => ({
    page: (search.page as number) || 1,
  }),
  component: ItemsPage,
});

function ItemsPage() {
  const { page } = Route.useSearch();
  const { data, isLoading } = useItems({ page, size: 20 });

  return (
    <div className="page max-w-6xl">
      <div className="page-head">
        <div>
          <h2 className="page-title">物品</h2>
          <p className="page-sub">
            {data ? `共 ${data.total} 件，最近归档在前` : "你的物品档案"}
          </p>
        </div>
        <Link to="/items/new" className="btn btn-primary">
          <Plus size={16} />
          添加物品
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex gap-3.5 p-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-tab bg-line/70" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 w-2/3 animate-pulse rounded bg-line/70" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-line/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-line/50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="empty">
          <p>还没有物品。</p>
          <p className="mt-1 text-sm">把第一件东西记下来，之后就不必到处翻找了。</p>
          <Link to="/items/new" className="btn btn-primary mt-5">
            <Plus size={16} />
            添加物品
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-3">
            {data.items.map((item) => {
              const thumb = imageUrl(item.thumb_path);
              return (
                <Link
                  key={item.id}
                  to="/items/$id"
                  params={{ id: item.id }}
                  className="card card-hover flex gap-3.5 p-4 hover:bg-card"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 shrink-0 rounded-tab border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tab border border-line bg-paper">
                      <Package size={18} className="text-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-medium text-ink">{item.name}</h3>
                      {item.category_name && (
                        <span className="tag-tab shrink-0">{item.category_name}</span>
                      )}
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin size={11} className="shrink-0" />
                      {containerPathText(item.container_path)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted/80">{formatDate(item.created_at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {data.total > data.size && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && (
                <Link to="/items" search={{ page: page - 1 }} className="btn btn-ghost">
                  上一页
                </Link>
              )}
              <span className="text-sm text-muted">
                第 {page} 页 / 共 {Math.ceil(data.total / data.size)} 页
              </span>
              {page * data.size < data.total && (
                <Link to="/items" search={{ page: page + 1 }} className="btn btn-ghost">
                  下一页
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

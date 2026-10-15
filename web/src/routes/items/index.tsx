import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems } from "@/hooks/useItems";
import { containerPathText, formatDate } from "@/lib/utils";
import { Plus, Package } from "lucide-react";

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
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">物品</h2>
        <Link
          to="/items/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          添加物品
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-5">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-200/70 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-5 w-2/3 rounded-lg bg-gray-200/70 animate-pulse" />
                  <div className="h-3.5 w-1/2 rounded-lg bg-gray-200/70 animate-pulse" />
                  <div className="h-3 w-1/3 rounded-lg bg-gray-200/70 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.items.map((item) => (
              <Link
                key={item.id}
                to="/items/$id"
                params={{ id: item.id }}
                className="bg-white rounded-2xl border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex gap-3">
                  {item.thumb_path ? (
                    <img
                      src={`/images/${item.thumb_path}`}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    <p className="text-xs text-gray-400 mt-1.5">
                      📍 {containerPathText(item.container_path)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.total > data.size && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {page > 1 && (
                <Link
                  to="/items"
                  search={{ page: page - 1 }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  上一页
                </Link>
              )}
              <span className="text-sm text-gray-500">
                第 {page} 页 / 共 {Math.ceil(data.total / data.size)} 页
              </span>
              {page * data.size < data.total && (
                <Link
                  to="/items"
                  search={{ page: page + 1 }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
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

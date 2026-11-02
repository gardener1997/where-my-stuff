import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStats } from "@/hooks/useStats";
import { useItems } from "@/hooks/useItems";
import { containerPathText, formatDate, imageUrl } from "@/lib/utils";
import { Search, Package, FolderTree, Layers, Tag, ChevronRight, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: stats } = useStats();
  const { data: recent } = useItems({ page: 1, size: 4 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
    }
  };

  return (
    <div className="page max-w-4xl">
      <header className="mb-8">
        <h2 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-ink sm:text-[40px]">
          东西在哪
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          每件物品都有一张卡片，记着它放在哪个房间、哪个柜子、哪一层。
        </p>
      </header>

      {/* Catalog query */}
      <form
        onSubmit={handleSubmit}
        className="card flex items-center gap-2 rounded-full p-1.5 pl-4 shadow-card transition-[border-color,box-shadow] focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgb(61_82_244/0.10),var(--shadow-card-hover)]"
      >
        <Search size={18} className="shrink-0 text-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="充电器、说明书、蓝色箱子…"
          aria-label="搜索物品"
          className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-ink outline-none placeholder:text-muted/70"
          autoFocus
        />
        <button type="submit" className="btn btn-primary shrink-0 rounded-full px-6 py-2.5">
          查找
        </button>
      </form>

      {/* Ledger: the numbers are the hero */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell
            to="/items"
            label="物品"
            value={stats.total_items}
            icon={<Package size={13} />}
            featured
          />
          <StatCell
            to="/containers"
            label="容器"
            value={stats.total_containers}
            icon={<FolderTree size={13} />}
          />
          <StatCell
            to="/categories"
            label="分类"
            value={stats.total_categories}
            icon={<Layers size={13} />}
          />
          <StatCell
            to="/tags"
            label="标签"
            value={stats.total_tags}
            icon={<Tag size={13} />}
          />
        </div>
      )}

      {/* Recently filed */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="section-title">最近归档</h3>
          <Link
            to="/items"
            search={{ page: 1 }}
            className="inline-flex items-center gap-0.5 text-xs text-muted transition-colors hover:text-ink"
          >
            全部物品
            <ChevronRight size={13} />
          </Link>
        </div>

        {recent && recent.items.length > 0 ? (
          <div className="card divide-y divide-line">
            {recent.items.map((item) => (
              <Link
                key={item.id}
                to="/items/$id"
                params={{ id: item.id }}
                className="flex items-center gap-3.5 px-4 py-3 transition-colors first:rounded-t-card last:rounded-b-card hover:bg-paper/70"
              >
                {imageUrl(item.thumb_path) ? (
                  <img
                    src={imageUrl(item.thumb_path) ?? ""}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-11 w-11 shrink-0 rounded-tab border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tab border border-line bg-paper">
                    <Package size={16} className="text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                    <MapPin size={11} className="shrink-0" />
                    {containerPathText(item.container_path)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDate(item.created_at)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>还没有归档任何物品。</p>
            <Link to="/items/new" className="btn btn-primary mt-4">
              记下第一件
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCell({
  to,
  label,
  value,
  icon,
  featured = false,
}: {
  to: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`card block rounded-card px-5 py-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        featured
          ? "border-accent/40 bg-accent-soft/50 hover:border-accent/60"
          : "hover:border-line-strong"
      }`}
    >
      <span className="font-display block text-[34px] font-semibold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </span>
      <span
        className={`mt-2 flex items-center gap-1 text-xs ${
          featured ? "font-medium text-accent" : "text-muted"
        }`}
      >
        {icon}
        {label}
      </span>
    </Link>
  );
}

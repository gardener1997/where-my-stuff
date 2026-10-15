import { createFileRoute, Link } from "@tanstack/react-router";
import { useStats } from "@/hooks/useStats";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package, FolderTree, Tag, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: stats } = useStats();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">找东西</h2>
      <p className="text-gray-500 mb-6 sm:mb-8">输入关键词，立刻找到你的物品</p>

      {/* Search box */}
      <form onSubmit={handleSubmit} className="relative mb-8 sm:mb-12">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索物品、标签、容器…"
          className="w-full pl-13 pr-5 py-4 text-base sm:text-lg border border-gray-200 rounded-2xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          autoFocus
        />
      </form>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Package size={20} className="text-blue-600" />}
            label="物品"
            value={stats.total_items}
            to="/items"
            color="bg-blue-50"
          />
          <StatCard
            icon={<FolderTree size={20} className="text-emerald-600" />}
            label="容器"
            value={stats.total_containers}
            to="/containers"
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Layers size={20} className="text-amber-600" />}
            label="分类"
            value={stats.total_categories}
            to="/categories"
            color="bg-amber-50"
          />
          <StatCard
            icon={<Tag size={20} className="text-purple-600" />}
            label="标签"
            value={stats.total_tags}
            to="/tags"
            color="bg-purple-50"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  to,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  to: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl p-5 border hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </Link>
  );
}

import { createRootRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Package,
  FolderTree,
  Tag,
  Home,
  Layers,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { useStats } from "@/hooks/useStats";
import { useMe, useLogout } from "@/hooks/useAuth";

export const Route = createRootRoute({
  component: RootLayout,
});

const NAV = [
  { to: "/", label: "首页", icon: Home, exact: true },
  { to: "/search", label: "搜索", icon: Search, exact: false },
  { to: "/items", label: "物品", icon: Package, exact: false },
  { to: "/containers", label: "容器", icon: FolderTree, exact: false },
  { to: "/categories", label: "分类", icon: Layers, exact: false },
  { to: "/tags", label: "标签", icon: Tag, exact: false },
] as const;

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLogin = useRouterState({
    select: (s) => s.location.pathname === "/login",
  });
  const { data: stats } = useStats(!isLogin);
  const { data: me } = useMe(!isLogin);
  const logout = useLogout();

  const close = () => setSidebarOpen(false);

  // The login page stands alone: no chrome, no sidebar.
  if (isLogin) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-paper">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-cabinet px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="-ml-2 rounded-tab p-2 text-panel-muted transition-colors hover:bg-white/[0.08] hover:text-card"
          aria-label="打开导航"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="flex items-center gap-2.5 text-card" onClick={close}>
          <LogoMark size={26} />
          <span className="font-display text-lg leading-none">东西在哪</span>
        </Link>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 animate-fade-in lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar — the spine of the filing cabinet */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-cabinet transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link to="/" onClick={close} className="flex items-center gap-2.5 text-card">
            <LogoMark size={34} />
            <span>
              <span className="block font-display text-lg font-semibold leading-tight tracking-tight">东西在哪</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-panel-muted">
                个人物品档案
              </span>
            </span>
          </Link>
          <button
            onClick={close}
            className="rounded-tab p-1.5 text-panel-muted hover:bg-white/[0.06] hover:text-card lg:hidden"
            aria-label="关闭导航"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} onClick={close} />
          ))}
          <div className="my-3 h-px bg-white/10" />
          {NAV.slice(2).map((item) => (
            <NavItem key={item.to} {...item} onClick={close} />
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-panel-muted">
            {stats ? `本机保存 · ${stats.total_items} 件物品` : "本机保存"}
          </p>
          {me && (
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-panel-muted transition-colors hover:text-card disabled:opacity-50"
            >
              <LogOut size={12} />
              {me.username} · 退出登录
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  exact: boolean;
  onClick?: () => void;
}) {
  return (
    <Link to={to} onClick={onClick} activeOptions={{ exact }} className="nav-link">
      <Icon size={17} />
      {label}
    </Link>
  );
}

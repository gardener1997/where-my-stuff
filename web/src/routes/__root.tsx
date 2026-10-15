import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Search, Package, FolderTree, Tag, Home, Layers, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={22} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <MapPin size={15} className="text-white" />
          </div>
          <h1 className="text-base font-bold text-gray-900">东西在哪</h1>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r bg-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Desktop logo / mobile close */}
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <MapPin size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">东西在哪</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <NavLink
            to="/"
            icon={<Home size={18} />}
            label="首页"
            onClick={() => setSidebarOpen(false)}
          />
          <NavLink
            to="/search"
            icon={<Search size={18} />}
            label="搜索"
            onClick={() => setSidebarOpen(false)}
          />
          <NavLink
            to="/items"
            icon={<Package size={18} />}
            label="物品"
            onClick={() => setSidebarOpen(false)}
          />
          <NavLink
            to="/containers"
            icon={<FolderTree size={18} />}
            label="容器"
            onClick={() => setSidebarOpen(false)}
          />
          <NavLink
            to="/categories"
            icon={<Layers size={18} />}
            label="分类"
            onClick={() => setSidebarOpen(false)}
          />
          <NavLink
            to="/tags"
            icon={<Tag size={18} />}
            label="标签"
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        <div className="p-4 border-t">
          <p className="text-xs text-gray-400">个人物品管理</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      activeProps={{
        className: "bg-blue-50 text-blue-700 font-medium",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

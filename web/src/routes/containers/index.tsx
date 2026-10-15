import { createFileRoute, Link } from "@tanstack/react-router";
import { useContainerTree, useCreateContainer } from "@/hooks/useContainers";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { FolderTree, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/containers/")({
  component: ContainersPage,
});

function ContainersPage() {
  const { data: tree, isLoading } = useContainerTree();
  const createContainer = useCreateContainer();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [containerType, setContainerType] = useState("room");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createContainer.mutateAsync({
      name: name.trim(),
      label: label || undefined,
      container_type: containerType,
    });
    setName("");
    setLabel("");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">容器</h2>

      {/* Create */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 sm:items-end mb-6">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="容器名称"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="箱子上的标签"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">类型</label>
          <Select
            value={containerType}
            onChange={setContainerType}
            placeholder="选择类型"
            options={[
              { value: "room", label: "房间" },
                { value: "table", label: "桌子" },
              { value: "shelf", label: "架子" },
              { value: "box", label: "箱子" },
              { value: "drawer", label: "抽屉" },
              { value: "bag", label: "袋子" },
              { value: "other", label: "其他" },
            ]}
          />
        </div>
        <button
          type="submit"
          disabled={createContainer.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} />
          添加
        </button>
      </form>

      {isLoading && <SkeletonList count={4} />}

      {tree && tree.length === 0 && (
        <div className="text-center py-12 text-gray-400">还没有容器</div>
      )}

      {tree && tree.length > 0 && (
        <div className="space-y-1">
          {tree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, depth }: { node: import("@/types").ContainerNode; depth: number }) {
  return (
    <div>
      <Link
        to="/containers/$id"
        params={{ id: node.id }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <FolderTree size={16} className="text-gray-400" />
        <span className="text-gray-900">{node.name}</span>
        {node.label && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {node.label}
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{node.container_type}</span>
        <ChevronRight size={14} className="text-gray-300" />
      </Link>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useContainerTree, useCreateContainer } from "@/hooks/useContainers";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { containerTypeLabel } from "@/lib/utils";
import { FolderTree, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/containers/")({
  component: ContainersPage,
});

const CONTAINER_TYPES = [
  { value: "room", label: "房间" },
  { value: "table", label: "桌子" },
  { value: "shelf", label: "架子" },
  { value: "box", label: "箱子" },
  { value: "drawer", label: "抽屉" },
  { value: "cabinet", label: "柜子" },
  { value: "bag", label: "袋子" },
  { value: "other", label: "其他" },
];

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
    <div className="page max-w-4xl">
      <div className="page-head">
        <div>
          <h2 className="page-title">容器</h2>
          <p className="page-sub">房间、柜子、抽屉、箱子——按实际层级摆放。</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="card mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="field-label">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：电视柜"
              className="input"
            />
          </div>
          <div className="sm:w-36">
            <label className="field-label">标签</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="箱子上的字"
              className="input"
            />
          </div>
          <div className="sm:w-32">
            <label className="field-label">类型</label>
            <Select
              value={containerType}
              onChange={setContainerType}
              placeholder="选择类型"
              options={CONTAINER_TYPES}
            />
          </div>
          <button
            type="submit"
            disabled={createContainer.isPending}
            className="btn btn-primary"
          >
            <Plus size={16} />
            添加
          </button>
        </div>
      </form>

      {isLoading && <SkeletonList count={4} />}

      {tree && tree.length === 0 && (
        <div className="empty">
          <p>还没有容器。</p>
          <p className="mt-1 text-sm">先建一个房间，再往里放柜子和抽屉。</p>
        </div>
      )}

      {tree && tree.length > 0 && (
        <div className="card overflow-hidden">
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
        className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-paper/60"
        style={{ paddingLeft: `${depth * 22 + 16}px` }}
      >
        <FolderTree size={15} className="shrink-0 text-muted" />
        <span className="text-sm text-ink">{node.name}</span>
        {node.label && <span className="tag-tab">{node.label}</span>}
        <span className="ml-auto text-xs text-muted">{containerTypeLabel(node.container_type)}</span>
        <ChevronRight size={14} className="shrink-0 text-line-strong" />
      </Link>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories";
import { flattenTree } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { Plus, Trash2, Layers, Edit, Check, X } from "lucide-react";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: tree, isLoading } = useCategoryTree();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { confirm, dialog } = useConfirm();
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createCategory.mutateAsync({
      name,
      parent_id: newParentId || undefined,
    });
    setNewName("");
    setNewParentId("");
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "删除分类",
      message: "删除后，已关联此分类的物品将变为未分类。",
      confirmLabel: "删除",
      variant: "danger",
    });
    if (ok) {
      await deleteCategory.mutateAsync(id);
    }
  };

  return (
    <div className="page max-w-3xl">
      <div className="page-head">
        <div>
          <h2 className="page-title">分类</h2>
          <p className="page-sub">按用途归类，比如「电子」「厨房」「工具」。</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="card mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="field-label">名称</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="分类名"
              className="input"
            />
          </div>
          <div className="sm:w-44">
            <label className="field-label">上级分类</label>
            <Select
              value={newParentId}
              onChange={setNewParentId}
              placeholder="顶层分类"
              options={flattenTree(tree || [])}
              searchable
            />
          </div>
          <button type="submit" disabled={createCategory.isPending} className="btn btn-primary">
            <Plus size={16} />
            添加
          </button>
        </div>
      </form>

      {isLoading && <SkeletonList count={4} />}

      {tree && tree.length === 0 && (
        <div className="empty">
          <p>还没有分类。</p>
          <p className="mt-1 text-sm">先建一个宽泛的分类，再往下细分。</p>
        </div>
      )}

      {tree && tree.length > 0 && (
        <div className="card overflow-hidden">
          {tree.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              allNodes={tree}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}

function CategoryNode({
  node,
  depth,
  allNodes,
  onDelete,
}: {
  node: import("@/types").CategoryNode;
  depth: number;
  allNodes: import("@/types").CategoryNode[];
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const [parentId, setParentId] = useState(node.parent_id || "");
  const updateCategory = useUpdateCategory();

  const handleSave = async () => {
    await updateCategory.mutateAsync({
      id: node.id,
      data: { name, parent_id: parentId || undefined },
    });
    setEditing(false);
  };

  return (
    <div>
      {editing ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-line bg-cabinet-soft/50 px-3 py-2 last:border-b-0"
          style={{ paddingLeft: `${depth * 22 + 12}px` }}
        >
          <Layers size={15} className="shrink-0 text-cabinet" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input min-w-32 flex-1 py-1.5"
          />
          <div className="w-32">
            <Select
              value={parentId}
              onChange={setParentId}
              placeholder="顶层"
              options={flattenTree(allNodes).filter((c) => c.value !== node.id)}
              searchable
            />
          </div>
          <button
            onClick={handleSave}
            className="rounded-tab p-1.5 text-cabinet transition-colors hover:bg-cabinet-soft"
            aria-label="保存"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(node.name);
              setParentId(node.parent_id || "");
            }}
            className="rounded-tab p-1.5 text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
            aria-label="取消"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className="group flex items-center gap-2.5 border-b border-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-paper/60"
          style={{ paddingLeft: `${depth * 22 + 12}px` }}
        >
          <Layers size={15} className="shrink-0 text-muted" />
          <span className="flex-1 text-sm text-ink">{node.name}</span>
          <button
            onClick={() => setEditing(true)}
            className="rounded-tab p-1.5 text-muted opacity-0 transition-colors group-hover:opacity-100 hover:bg-cabinet-soft hover:text-cabinet focus-visible:opacity-100"
            aria-label="编辑分类"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="rounded-tab p-1.5 text-muted opacity-0 transition-colors group-hover:opacity-100 hover:bg-signal-soft hover:text-signal focus-visible:opacity-100"
            aria-label="删除分类"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {node.children.map((child) => (
        <CategoryNode
          key={child.id}
          node={child}
          depth={depth + 1}
          allNodes={allNodes}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

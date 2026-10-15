import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCategoryTree, useCreateCategory } from "@/hooks/useCategories";
import { api } from "@/lib/api";
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
      await api.deleteCategory(id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">分类</h2>

      {/* Create */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="分类名…"
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="sm:w-40">
          <Select
            value={newParentId}
            onChange={setNewParentId}
            placeholder="顶层分类"
            options={flattenTree(tree || []).map((c) => ({
              value: c.id,
              label: c.name,
              indent: c.indent,
            }))}
          />
        </div>
        <button
          type="submit"
          disabled={createCategory.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
          添加
        </button>
      </form>

      {/* List */}
      {isLoading && <SkeletonList count={4} />}

      {tree && tree.length === 0 && (
        <div className="text-center py-12 text-gray-400">还没有分类</div>
      )}

      {tree && tree.length > 0 && (
        <div className="space-y-1">
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

  const handleSave = async () => {
    await api.updateCategory(node.id, {
      name,
      parent_id: parentId || undefined,
    });
    setEditing(false);
  };

  return (
    <div>
      {editing ? (
        <div
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <Layers size={16} className="text-blue-400" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <div className="w-32">
            <Select
              value={parentId}
              onChange={setParentId}
              placeholder="顶层"
              options={flattenTree(allNodes)
                .filter((c) => c.id !== node.id)
                .map((c) => ({
                  value: c.id,
                  label: c.name,
                  indent: c.indent,
                }))}
            />
          </div>
          <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-100 rounded">
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(node.name);
              setParentId(node.parent_id || "");
            }}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <Layers size={16} className="text-gray-400" />
          <span className="flex-1 text-gray-900">{node.name}</span>
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
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

function flattenTree(
  nodes: import("@/types").CategoryNode[],
  depth = 0,
): { id: string; name: string; indent: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, indent: "  ".repeat(depth) },
    ...flattenTree(n.children, depth + 1),
  ]);
}

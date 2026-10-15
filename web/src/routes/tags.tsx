import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import { useConfirm } from "@/hooks/useConfirm";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Plus, X, Tag, Search } from "lucide-react";

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});

function TagsPage() {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const { confirm, dialog } = useConfirm();
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const filtered = tags?.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createTag.mutateAsync(name);
    setNewName("");
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    setEditingId(null);
    if (!name) return;
    await updateTag.mutateAsync({ id, name });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "删除标签",
      message: "删除后，已关联该标签的物品将失去此标签。",
      confirmLabel: "删除",
      variant: "danger",
    });
    if (ok) await deleteTag.mutateAsync(id);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">标签</h2>
      <p className="text-sm text-gray-500 mb-6">
        {tags?.length ? `共 ${tags.length} 个标签` : "管理你的标签"}
      </p>

      {/* Create */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="输入标签名，回车添加"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white"
        />
        <button
          type="submit"
          disabled={createTag.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={18} />
          添加
        </button>
      </form>

      {/* Filter */}
      {tags && tags.length > 3 && (
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选标签…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <SkeletonList count={5} />}

      {/* Empty */}
      {tags && tags.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Tag size={28} className="text-purple-400" />
          </div>
          <p className="text-gray-500">还没有标签</p>
          <p className="text-sm text-gray-400 mt-1">在上方输入标签名，回车即可创建</p>
        </div>
      )}

      {/* Tag chips */}
      {filtered && filtered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filtered.map((tag) =>
            editingId === tag.id ? (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 pl-3.5 pr-2 py-1.5 bg-white border-2 border-blue-400 rounded-full text-sm shadow-sm"
              >
                <Tag size={13} className="text-blue-400" />
                <input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleRename(tag.id)}
                  className="w-24 bg-transparent outline-none text-gray-900"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleRename(tag.id)}
                  className="p-1 text-green-500 hover:bg-green-50 rounded-full"
                >
                  <X size={13} className="rotate-45" />
                </button>
              </span>
            ) : (
              <span
                key={tag.id}
                className="group inline-flex items-center gap-1.5 pl-3.5 pr-1.5 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                <Tag size={13} className="text-gray-400" />
                <button
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                  title="点击编辑"
                  className="hover:text-blue-600 transition-colors"
                >
                  {tag.name}
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  title="删除标签"
                  className="ml-0.5 p-1 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X size={13} />
                </button>
              </span>
            ),
          )}
        </div>
      )}

      {tags && tags.length > 0 && filtered && filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400">没有匹配的标签</div>
      )}

      {dialog}
    </div>
  );
}

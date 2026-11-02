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
    <div className="page max-w-3xl">
      <div className="page-head">
        <div>
          <h2 className="page-title">标签</h2>
          <p className="page-sub">
            {tags?.length ? `共 ${tags.length} 个标签，点击名称可改名` : "用它给物品加几个关键词"}
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="输入标签名，回车添加"
          className="input flex-1"
        />
        <button type="submit" disabled={createTag.isPending} className="btn btn-primary">
          <Plus size={16} />
          添加
        </button>
      </form>

      {tags && tags.length > 3 && (
        <div className="relative mt-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选标签"
            className="input pl-9"
          />
        </div>
      )}

      {isLoading && <SkeletonList count={5} />}

      {tags && tags.length === 0 && (
        <div className="empty mt-6">
          <p>还没有标签。</p>
          <p className="mt-1 text-sm">标签适合记录「常用」「备用」「待处理」这类状态。</p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {filtered.map((tag) =>
            editingId === tag.id ? (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-tab border border-cabinet bg-white py-1 pl-2.5 pr-1 text-sm"
              >
                <Tag size={13} className="text-cabinet" />
                <input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleRename(tag.id)}
                  className="w-24 bg-transparent py-0.5 text-ink outline-none"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleRename(tag.id)}
                  className="rounded-tab p-1 text-cabinet hover:bg-cabinet-soft"
                  aria-label="保存标签名"
                >
                  <X size={12} className="rotate-45" />
                </button>
              </span>
            ) : (
              <span
                key={tag.id}
                className="group inline-flex items-center gap-1.5 rounded-tab border border-line bg-card py-1 pl-2.5 pr-1 text-sm text-ink transition-colors hover:border-line-strong"
              >
                <Tag size={13} className="text-muted" />
                <button
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                  title="点击改名"
                  className="transition-colors hover:text-cabinet"
                >
                  {tag.name}
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  title="删除标签"
                  className="rounded-tab p-1 text-muted/70 transition-colors hover:bg-signal-soft hover:text-signal"
                  aria-label="删除标签"
                >
                  <X size={12} />
                </button>
              </span>
            ),
          )}
        </div>
      )}

      {tags && tags.length > 0 && filtered && filtered.length === 0 && (
        <div className="empty mt-6 py-8">没有匹配的标签。</div>
      )}

      {dialog}
    </div>
  );
}

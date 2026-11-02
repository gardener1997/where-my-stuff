import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useContainer,
  useUpdateContainer,
  useCreateContainer,
  useContainerTree,
} from "@/hooks/useContainers";
import { containerTypeLabel, flattenTree, formatDate, imageUrl } from "@/lib/utils";
import { useState } from "react";
import { FolderTree, Package, Edit, Trash2, X, Check, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useConfirm } from "@/hooks/useConfirm";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { Lightbox } from "@/components/ui/Lightbox";

export const Route = createFileRoute("/containers/$id")({
  component: ContainerDetailPage,
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

function ContainerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useContainer(id);
  const updateContainer = useUpdateContainer();
  const { data: tree } = useContainerTree();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);

  if (isLoading)
    return (
      <div className="page max-w-5xl">
        <SkeletonText lines={1} className="mb-4" />
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
        <SkeletonText lines={2} />
      </div>
    );
  if (!data) return <div className="page max-w-5xl text-muted">容器不存在</div>;

  const { container, path, children, items } = data;
  const image = imageUrl(container.image_path);

  return (
    <div className="page max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {path.map((seg, i) => (
          <span key={seg.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-line-strong">/</span>}
            {i === path.length - 1 ? (
              <span className="font-medium text-ink">{seg.name}</span>
            ) : (
              <Link
                to="/containers/$id"
                params={{ id: seg.id }}
                className="transition-colors hover:text-cabinet"
              >
                {seg.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Header / Edit */}
      {editing ? (
        <EditContainerForm
          container={container}
          allContainers={tree || []}
          onSave={async (data) => {
            await updateContainer.mutateAsync({ id, data });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
          {image && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group w-28 shrink-0 overflow-hidden rounded-card border border-line"
            >
              <img
                src={image}
                alt={container.name}
                className="aspect-square h-28 w-28 object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </button>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl leading-tight text-ink">{container.name}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(true)} className="btn btn-ghost px-3 py-1.5">
                  <Edit size={14} />
                  编辑
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "删除容器",
                      message: "删除后，该容器下的物品将变为未归位。",
                      confirmLabel: "删除",
                      variant: "danger",
                    });
                    if (ok) {
                      await api.deleteContainer(id);
                      if (container.parent_id) {
                        navigate({ to: "/containers/$id", params: { id: container.parent_id } });
                      } else {
                        navigate({ to: "/containers" });
                      }
                    }
                  }}
                  className="btn btn-danger px-3 py-1.5"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="tag-tab">{containerTypeLabel(container.container_type)}</span>
              {container.label && <span className="tag-tab">标签 {container.label}</span>}
            </div>
            {container.description && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                {container.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add sub-container */}
      <div className="mb-6">
        <button onClick={() => setCreatingChild(true)} className="btn btn-ghost">
          <Plus size={16} />
          添加子容器
        </button>
      </div>

      {creatingChild && <CreateChildForm parentId={id} onDone={() => setCreatingChild(false)} />}

      {/* Sub-containers */}
      {children.length > 0 && (
        <section className="mb-8">
          <h3 className="section-title mb-3">子容器 · {children.length}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                to="/containers/$id"
                params={{ id: child.id }}
                className="card card-hover flex items-center gap-3 p-3.5"
              >
                <FolderTree size={18} className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{child.name}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {child.label || containerTypeLabel(child.container_type)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Items */}
      <section>
        <h3 className="section-title mb-3">物品 · {items.length}</h3>
        {items.length === 0 ? (
          <div className="empty py-8">这个容器里还没有物品。</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const thumb = imageUrl(item.thumb_path);
              return (
                <Link
                  key={item.id}
                  to="/items/$id"
                  params={{ id: item.id }}
                  className="card card-hover flex items-center gap-3 p-3.5"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-11 w-11 shrink-0 rounded-tab border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tab border border-line bg-paper">
                      <Package size={15} className="text-muted" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{item.name}</div>
                    <div className="mt-0.5 text-xs text-muted">{formatDate(item.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {lightboxOpen && image && (
        <Lightbox
          images={[{ src: image, alt: container.name }]}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      {dialog}
    </div>
  );
}

function EditContainerForm({
  container,
  allContainers,
  onSave,
  onCancel,
}: {
  container: import("@/types").Container;
  allContainers: import("@/types").ContainerNode[];
  onSave: (data: import("@/types").CreateContainer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(container.name);
  const [label, setLabel] = useState(container.label || "");
  const [description, setDescription] = useState(container.description || "");
  const [containerType, setContainerType] = useState(container.container_type);
  const [parentId, setParentId] = useState(container.parent_id || "");

  return (
    <div className="card mb-8 p-5 sm:p-6">
      <h3 className="mb-4 text-base font-medium text-ink">编辑容器</h3>
      <div className="space-y-4">
        <div>
          <label className="field-label">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="field-label">标签</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="贴在箱子上的标签"
            className="input"
          />
        </div>
        <div>
          <label className="field-label">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="textarea"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">类型</label>
            <Select
              value={containerType}
              onChange={setContainerType}
              placeholder="选择类型"
              options={CONTAINER_TYPES}
            />
          </div>
          <div>
            <label className="field-label">上级容器</label>
            <Select
              value={parentId}
              onChange={setParentId}
              placeholder="无（顶层）"
              options={flattenTree(allContainers).filter((c) => c.value !== container.id)}
              searchable
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() =>
              onSave({
                name,
                label: label || undefined,
                description: description || undefined,
                container_type: containerType,
                parent_id: parentId || undefined,
              })
            }
            className="btn btn-primary"
          >
            <Check size={16} />
            保存
          </button>
          <button onClick={onCancel} className="btn btn-ghost">
            <X size={16} />
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateChildForm({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const createContainer = useCreateContainer();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [containerType, setContainerType] = useState("box");

  return (
    <div className="card mb-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="子容器名称"
            className="input"
          />
        </div>
        <div className="sm:w-32">
          <label className="field-label">标签</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
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
          onClick={async () => {
            if (!name.trim()) return;
            await createContainer.mutateAsync({
              name: name.trim(),
              label: label || undefined,
              container_type: containerType,
              parent_id: parentId,
            });
            onDone();
          }}
          className="btn btn-primary"
        >
          创建
        </button>
        <button onClick={onDone} className="btn btn-ghost">
          取消
        </button>
      </div>
    </div>
  );
}

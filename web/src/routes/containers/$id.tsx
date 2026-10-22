import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useContainer,
  useUpdateContainer,
  useCreateContainer,
  useContainerTree,
} from "@/hooks/useContainers";
import { formatDate, flattenTree } from "@/lib/utils";
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
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <SkeletonText lines={1} className="mb-4" />
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <SkeletonText lines={2} />
      </div>
    );
  if (!data) return <div className="p-8 text-gray-400">容器不存在</div>;

  const { container, path, children, items } = data;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        {path.map((seg, i) => (
          <span key={seg.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300">/</span>}
            {i === path.length - 1 ? (
              <span className="text-gray-900 font-medium">{seg.name}</span>
            ) : (
              <Link to="/containers/$id" params={{ id: seg.id }} className="hover:text-blue-600">
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
        <div className="flex items-start gap-6 mb-8">
          {container.image_path && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative overflow-hidden rounded-xl border w-32 h-32 shrink-0"
            >
              <img
                src={`/images/${container.image_path}`}
                alt={container.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{container.name}</h2>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
            {container.label && (
              <div className="mt-1">
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                  标签: {container.label}
                </span>
              </div>
            )}
            {container.description && <p className="text-gray-500 mt-2">{container.description}</p>}
            <p className="text-sm text-gray-400 mt-2">类型: {container.container_type}</p>
          </div>
        </div>
      )}

      {/* Add sub-container button */}
      <div className="mb-6">
        <button
          onClick={() => setCreatingChild(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <Plus size={16} />
          添加子容器
        </button>
      </div>

      {creatingChild && <CreateChildForm parentId={id} onDone={() => setCreatingChild(false)} />}

      {/* Sub-containers */}
      {children.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-3">子容器 ({children.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {children.map((child) => (
              <Link
                key={child.id}
                to="/containers/$id"
                params={{ id: child.id }}
                className="flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-md transition-shadow"
              >
                <FolderTree size={20} className="text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">{child.name}</div>
                  {child.label && <div className="text-xs text-gray-400">{child.label}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Items in this container */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">物品 ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-gray-400 py-4">这个容器里没有物品</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <Link
                key={item.id}
                to="/items/$id"
                params={{ id: item.id }}
                className="flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-md transition-shadow"
              >
                {item.thumb_path ? (
                  <img
                    src={`/images/${item.thumb_path}`}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package size={18} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-400">{formatDate(item.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {lightboxOpen && container.image_path && (
        <Lightbox
          images={[{ src: `/images/${container.image_path}`, alt: container.name }]}
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
    <div className="bg-white border rounded-xl p-6 mb-8">
      <h3 className="text-lg font-medium mb-4">编辑容器</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="贴在箱子上的标签"
            className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">上级容器</label>
            <Select
              value={parentId}
              onChange={setParentId}
              placeholder="无（顶层）"
              options={flattenTree(allContainers).filter((c) => c.value !== container.id)}
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Check size={16} />
            保存
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
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
    <div className="bg-white border rounded-2xl p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="子容器名称"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div className="sm:w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          创建
        </button>
        <button onClick={onDone} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
          取消
        </button>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useItem, useDeleteItem } from "@/hooks/useItems";
import { useConfirm } from "@/hooks/useConfirm";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Lightbox } from "@/components/ui/Lightbox";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { DocumentList } from "@/components/ui/DocumentList";
import { formatDate, formatPrice, sourceTypeLabel } from "@/lib/utils";
import { ArrowLeft, Trash2, Edit, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/items/$id/")({
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useItem(id);
  const deleteItem = useDeleteItem();
  const { confirm, dialog } = useConfirm();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-20 ml-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="aspect-square rounded-2xl" />
        </div>
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-gray-400">物品不存在</div>;
  }

  const { item, images, tags, category_name, container_path, documents: docs } = data;

  const handleDelete = async () => {
    const ok = await confirm({
      title: "删除物品",
      message: "确定要删除这个物品吗？此操作不可撤销。",
      confirmLabel: "删除",
      variant: "danger",
    });
    if (ok) {
      await deleteItem.mutateAsync(id);
      navigate({ to: "/items", search: { page: 1 } });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6 flex-wrap">
        <Link to="/items" search={{ page: 1 }} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">
          {item.name}
        </h2>
        <Link
          to="/items/$id/edit"
          params={{ id: item.id }}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
        >
          <Edit size={15} />
          <span className="hidden sm:inline">编辑</span>
        </Link>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">删除</span>
        </button>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="group relative overflow-hidden rounded-xl border"
              >
                <img
                  src={`/images/${img.file_path}`}
                  alt=""
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
          {lightboxIndex !== null && (
            <Lightbox
              images={images.map((img) => ({
                src: `/images/${img.file_path}`,
                alt: item.name,
              }))}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
        </>
      )}

      {/* Info */}
      <div className="bg-white border rounded-xl divide-y">
        <InfoRow label="描述" value={item.description && <MarkdownText>{item.description}</MarkdownText>} />
        <InfoRow
          label="来源"
          value={
            item.source_type === "purchased"
              ? `购买 · ${item.bought_from || "未知平台"} · ${formatPrice(item.price)}`
              : sourceTypeLabel(item.source_type)
          }
        />
        {item.purchased_at && <InfoRow label="购买时间" value={formatDate(item.purchased_at)} />}
        <InfoRow label="分类" value={category_name} />
        <InfoRow
          label="位置"
          value={
            container_path.length > 0 ? (
              <div className="flex items-center gap-1">
                {container_path.map((seg, i) => (
                  <span key={seg.id} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    )}
                    <Link
                      to="/containers/$id"
                      params={{ id: seg.id }}
                      className="text-blue-600 hover:underline"
                    >
                      {seg.name}
                    </Link>
                  </span>
                ))}
              </div>
            ) : (
              "未归位"
            )
          }
        />
        <InfoRow
          label="标签"
          value={
            tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag.id} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              "无"
            )
          }
        />
        <InfoRow label="创建时间" value={formatDate(item.created_at)} />
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">说明书</h3>
          <DocumentList documents={docs} />
        </div>
      )}

      {dialog}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3">
      <div className="w-24 text-sm text-gray-500 shrink-0">{label}</div>
      <div className="text-sm text-gray-900">{value || "—"}</div>
    </div>
  );
}

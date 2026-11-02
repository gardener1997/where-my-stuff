import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useItem, useDeleteItem } from "@/hooks/useItems";
import { useConfirm } from "@/hooks/useConfirm";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Lightbox } from "@/components/ui/Lightbox";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { DocumentList } from "@/components/ui/DocumentList";
import {
  formatDate,
  formatPrice,
  imageUrl,
  sourceTypeLabel,
} from "@/lib/utils";
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
      <div className="page max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-tab" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="ml-auto h-9 w-20" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="aspect-square rounded-card" />
          <Skeleton className="aspect-square rounded-card" />
        </div>
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (!data) {
    return <div className="page max-w-4xl text-muted">物品不存在</div>;
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
    <div className="page max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/items" search={{ page: 1 }} className="btn btn-quiet px-2 py-2" aria-label="返回物品列表">
          <ArrowLeft size={18} />
        </Link>
        <h2 className="min-w-0 flex-1 truncate font-display text-2xl leading-tight text-ink sm:text-3xl">
          {item.name}
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="/items/$id/edit"
            params={{ id: item.id }}
            className="btn btn-ghost px-3 py-1.5"
          >
            <Edit size={14} />
            <span className="hidden sm:inline">编辑</span>
          </Link>
          <button onClick={handleDelete} className="btn btn-danger px-3 py-1.5">
            <Trash2 size={14} />
            <span className="hidden sm:inline">删除</span>
          </button>
        </div>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="group overflow-hidden rounded-card border border-line"
              >
                <img
                  src={imageUrl(img.file_path) ?? ""}
                  alt=""
                  className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
          {lightboxIndex !== null && (
            <Lightbox
              images={images.map((img) => ({
                src: imageUrl(img.file_path) ?? "",
                alt: item.name,
              }))}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
        </>
      )}

      {/* Description */}
      {item.description && (
        <section className="mb-6">
          <h3 className="mb-2 text-xs font-medium text-muted">描述</h3>
          <MarkdownText className="prose-sm prose-p:leading-relaxed prose-headings:font-display prose-headings:text-ink prose-p:text-ink/85 prose-li:text-ink/85 prose-strong:text-ink prose-a:text-cabinet">
            {item.description}
          </MarkdownText>
        </section>
      )}

      {/* Info */}
      <div className="card divide-y divide-line">
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
              <div className="flex flex-wrap items-center gap-1">
                {container_path.map((seg, i) => (
                  <span key={seg.id} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight size={13} className="shrink-0 text-line-strong" />}
                    <Link
                      to="/containers/$id"
                      params={{ id: seg.id }}
                      className="text-cabinet hover:underline"
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
        {item.location_note && <InfoRow label="位置说明" value={item.location_note} />}
        <InfoRow
          label="标签"
          value={
            tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag.id} className="tag-tab bg-card">
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              "无"
            )
          }
        />
        <InfoRow label="归档时间" value={formatDate(item.created_at)} />
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-medium text-muted">说明书</h3>
          <DocumentList documents={docs} />
        </section>
      )}

      {dialog}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="w-20 shrink-0 text-xs leading-6 text-muted">{label}</div>
      <div className="min-w-0 text-sm leading-6 text-ink">{value || "—"}</div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useItem, useUpdateItem } from "@/hooks/useItems";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useCategoryTree } from "@/hooks/useCategories";
import { useContainerTree } from "@/hooks/useContainers";
import { api } from "@/lib/api";
import { flattenTree } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { DocumentList } from "@/components/ui/DocumentList";
import { ArrowLeft, Plus, X, Check } from "lucide-react";

export const Route = createFileRoute("/items/$id/edit")({
  component: EditItemPage,
});

function EditItemPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useItem(id);
  const updateItem = useUpdateItem();
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const { data: categoryTree } = useCategoryTree();
  const { data: containerTree } = useContainerTree();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("handmade");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [boughtFrom, setBoughtFrom] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [containerId, setContainerId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [images, setImages] = useState<import("@/types").ItemImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<import("@/types").ItemDocument[]>([]);

  // Initialize form from loaded data
  useEffect(() => {
    if (data) {
      const { item, tags: itemTags } = data;
      setName(item.name);
      setDescription(item.description || "");
      setSourceType(item.source_type);
      setPurchasedAt(item.purchased_at || "");
      setBoughtFrom(item.bought_from || "");
      setPrice(item.price?.toString() || "");
      setCategoryId(item.category_id || "");
      setContainerId(item.container_id || "");
      setSelectedTagIds(itemTags.map((t) => t.id));
      setImages(data.images);
      setDocuments(data.documents);
    }
  }, [data]);

  if (isLoading)
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="h-8 w-32 rounded-lg bg-gray-200/70 animate-pulse mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 rounded bg-gray-200/70 animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-gray-200/70 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  if (!data) return <div className="p-8 text-gray-400">物品不存在</div>;

  const handleAddTag = async () => {
    const tagName = newTagName.trim();
    if (!tagName) return;
    const tag = await createTag.mutateAsync(tagName);
    if (!selectedTagIds.includes(tag.id)) {
      setSelectedTagIds([...selectedTagIds, tag.id]);
    }
    setNewTagName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await updateItem.mutateAsync({
      id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        source_type: sourceType,
        purchased_at: purchasedAt || undefined,
        bought_from: boughtFrom.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        category_id: categoryId || undefined,
        container_id: containerId || undefined,
        tag_ids: selectedTagIds,
      },
    });

    // Upload any pending images
    for (const file of files) {
      await api.uploadItemImage(id, file);
    }

    navigate({ to: "/items/$id", params: { id } });
  };

  const handleDeleteImage = async (imageId: string) => {
    await api.deleteItemImage(id, imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleDocUpload = async (file: File) => {
    const doc = await api.uploadItemDocument(id, file);
    setDocuments((prev) => [...prev, doc]);
  };

  const handleDocDelete = async (docId: string) => {
    await api.deleteItemDocument(id, docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate({ to: "/items/$id", params: { id } })}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">编辑物品</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="名称 *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="描述">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="支持 Markdown 格式（粗体、列表、链接等）"
            className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="来源">
          <Select
            value={sourceType}
            onChange={setSourceType}
            placeholder="选择来源"
            options={[
              { value: "purchased", label: "购买" },
              { value: "handmade", label: "自制" },
              { value: "gift", label: "赠送" },
              { value: "salvage", label: "拆卸" },
              { value: "other", label: "其他" },
            ]}
          />
        </Field>

        {sourceType === "purchased" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="购买时间">
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="购买平台">
              <input
                type="text"
                value={boughtFrom}
                onChange={(e) => setBoughtFrom(e.target.value)}
                placeholder="淘宝、京东…"
                className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="价格">
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>
        )}

        <Field label="分类">
          <Select
            value={categoryId}
            onChange={setCategoryId}
            placeholder="未分类"
            options={flattenTree(categoryTree || [])}
          />
        </Field>

        <Field label="存放位置">
          <Select
            value={containerId}
            onChange={setContainerId}
            placeholder="未归位"
            options={flattenTree(containerTree || [])}
          />
        </Field>

        <Field label="标签">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((tid) => tid !== tag.id)
                        : [...prev, tag.id],
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                placeholder="新标签…"
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </Field>

        <Field label="图片">
          <ImageUpload
            existingImages={images}
            onDeleteExisting={handleDeleteImage}
            onFilesChange={setFiles}
          />
        </Field>

        <Field label="说明书">
          <DocumentList
            documents={documents}
            editable
            onUpload={handleDocUpload}
            onDelete={handleDocDelete}
          />
        </Field>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={updateItem.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Check size={18} />
            {updateItem.isPending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/items/$id", params: { id } })}
            className="flex items-center gap-2 px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            <X size={18} />
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

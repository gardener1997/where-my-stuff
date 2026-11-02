import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateItem } from "@/hooks/useItems";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useCategoryTree } from "@/hooks/useCategories";
import { useContainerTree } from "@/hooks/useContainers";
import { api } from "@/lib/api";
import { flattenTree } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Field, FormSection } from "@/components/ui/Form";
import { ArrowLeft, Plus, Check, X } from "lucide-react";

export const Route = createFileRoute("/items/new")({
  component: NewItemPage,
});

const SOURCE_TYPES = [
  { value: "purchased", label: "购买" },
  { value: "handmade", label: "自制" },
  { value: "gift", label: "赠送" },
  { value: "salvage", label: "拆卸" },
  { value: "other", label: "其他" },
];

function NewItemPage() {
  const navigate = useNavigate();
  const createItem = useCreateItem();
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const { data: categoryTree } = useCategoryTree();
  const { data: containerTree } = useContainerTree();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [sourceType, setSourceType] = useState("handmade");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [boughtFrom, setBoughtFrom] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [containerId, setContainerId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [files, setFiles] = useState<File[]>([]);

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

    const result = await createItem.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      location_note: locationNote.trim() || undefined,
      source_type: sourceType,
      purchased_at: purchasedAt || undefined,
      bought_from: boughtFrom.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      category_id: categoryId || undefined,
      container_id: containerId || undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    });

    // Upload images
    for (const file of files) {
      await api.uploadItemImage(result.item.id, file);
    }

    navigate({ to: "/items/$id", params: { id: result.item.id } });
  };

  return (
    <div className="page max-w-4xl">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/items", search: { page: 1 } })}
          className="btn btn-quiet px-2 py-2"
          aria-label="返回物品列表"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="page-title text-2xl sm:text-3xl">添加物品</h2>
          <p className="page-sub">只有名称是必填的，其它可以以后补。</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="物品信息">
          <Field label="名称 *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </Field>

          <Field label="描述" hint="支持 Markdown：粗体、列表、链接等。">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="textarea"
            />
          </Field>

          <Field label="来源">
            <Select
              value={sourceType}
              onChange={setSourceType}
              placeholder="选择来源"
              options={SOURCE_TYPES}
            />
          </Field>

          {sourceType === "purchased" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="购买时间">
                <input
                  type="date"
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="购买平台">
                <input
                  type="text"
                  value={boughtFrom}
                  onChange={(e) => setBoughtFrom(e.target.value)}
                  placeholder="淘宝、京东…"
                  className="input"
                />
              </Field>
              <Field label="价格">
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="input"
                />
              </Field>
            </div>
          )}
        </FormSection>

        <FormSection title="归档位置">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="分类">
              <Select
                value={categoryId}
                onChange={setCategoryId}
                placeholder="未分类"
                options={flattenTree(categoryTree || [])}
                searchable
              />
            </Field>

            <Field label="存放位置">
              <Select
                value={containerId}
                onChange={setContainerId}
                placeholder="未归位"
                options={flattenTree(containerTree || [])}
                searchable
              />
            </Field>
          </div>

          <Field label="位置说明" hint="写清楚具体在哪一格，比只填容器更容易找到。">
            <textarea
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              rows={2}
              placeholder="例如：床底下的蓝色箱子、第三格…"
              className="textarea"
            />
          </Field>

          <Field label="标签">
            <div className="space-y-2.5">
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.id)
                              ? prev.filter((tid) => tid !== tag.id)
                              : [...prev, tag.id],
                          )
                        }
                        className={`rounded-tab border px-2.5 py-1 text-sm transition-colors ${
                          selected
                            ? "border-cabinet bg-cabinet text-card"
                            : "border-line bg-card text-muted hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="新建标签"
                  className="input py-1.5"
                />
                <button type="button" onClick={handleAddTag} className="btn btn-ghost px-3 py-1.5">
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </Field>
        </FormSection>

        <FormSection title="图片">
          <ImageUpload onFilesChange={setFiles} />
        </FormSection>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={createItem.isPending} className="btn btn-primary px-5">
            <Check size={16} />
            {createItem.isPending ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/items", search: { page: 1 } })}
            className="btn btn-ghost px-5"
          >
            <X size={16} />
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

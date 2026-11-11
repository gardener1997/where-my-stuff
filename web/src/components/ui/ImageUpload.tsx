import { useState, useRef } from "react";
import { Upload, X, Plus } from "lucide-react";
import { imageUrl } from "@/lib/utils";

interface PendingFile {
  file: File;
  preview: string;
  id: string;
}

interface ExistingImage {
  id: string;
  thumb_path: string;
}

interface ImageUploadProps {
  existingImages?: ExistingImage[];
  onDeleteExisting?: (id: string) => void;
  onFilesChange: (files: File[]) => void;
  className?: string;
}

export function ImageUpload({
  existingImages = [],
  onDeleteExisting,
  onFilesChange,
  className = "",
}: ImageUploadProps) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const mainRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    const mapped = arr.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    }));
    setPending((prev) => {
      const updated = [...prev, ...mapped];
      onFilesChange(updated.map((p) => p.file));
      return updated;
    });
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      const updated = prev.filter((p) => p.id !== id);
      onFilesChange(updated.map((p) => p.file));
      return updated;
    });
  };

  return (
    <div className={className}>
      {/* Upload drop zone */}
      <div
        onClick={() => mainRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-card border border-dashed transition-colors ${
          dragOver
            ? "border-cabinet bg-cabinet-soft/60"
            : "border-line bg-paper/50 hover:border-line-strong hover:bg-paper"
        } ${existingImages.length > 0 || pending.length > 0 ? "py-5" : "py-9"}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-tab bg-cabinet-soft">
          <Upload size={18} className="text-cabinet" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-ink">点击或拖拽图片到此处上传</p>
          <p className="mt-0.5 text-xs text-muted">JPG、PNG、WebP、AVIF、SVG</p>
        </div>
        <input
          ref={mainRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Preview grid */}
      {(existingImages.length > 0 || pending.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2.5">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative h-20 w-20 overflow-hidden rounded-tab border border-line">
              <img src={imageUrl(img.thumb_path) ?? ""} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                type="button"
                onClick={() => onDeleteExisting?.(img.id)}
                className="absolute right-1 top-1 rounded-tab bg-signal p-1 text-white opacity-0 transition-opacity hover:bg-signal-deep group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {pending.map((p) => (
            <div key={p.id} className="group relative h-20 w-20 overflow-hidden rounded-tab border border-dashed border-cabinet/60">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="absolute right-1 top-1 rounded-tab bg-signal p-1 text-white opacity-0 transition-opacity hover:bg-signal-deep group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={11} />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-cabinet/85 py-0.5 text-center text-[9px] text-card">待上传</div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-tab border border-dashed border-line text-muted transition-colors hover:border-line-strong hover:bg-paper hover:text-ink"
          >
            <Plus size={18} />
            <span className="text-[9px]">添加</span>
          </button>
          <input
            ref={addRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
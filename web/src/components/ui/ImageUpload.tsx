import { useState, useRef } from "react";
import { Upload, X, Plus } from "lucide-react";

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
        className={`relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? "border-blue-400 bg-blue-50/50 scale-[1.01]"
            : "border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30"
        } ${existingImages.length > 0 || pending.length > 0 ? "py-5" : "py-10"}`}
      >
        <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center">
          <Upload size={20} className="text-blue-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">点击或拖拽图片到此处上传</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG、PNG、WebP、AVIF</p>
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
        <div className="flex flex-wrap gap-2.5 mt-3">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
              <img src={`/images/${img.thumb_path}`} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                type="button"
                onClick={() => onDeleteExisting?.(img.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {pending.map((p) => (
            <div key={p.id} className="group relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-300 border-dashed">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={11} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-blue-500/80 text-white text-[9px] text-center py-0.5">待上传</div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-colors"
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
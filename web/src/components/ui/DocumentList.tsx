import { useState, useRef } from "react";
import { FileText, Upload, X, ExternalLink } from "lucide-react";
import type { ItemDocument } from "@/types";

interface DocumentListProps {
  documents: ItemDocument[];
  editable?: boolean;
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function openDoc(doc: ItemDocument) {
  window.open(`/docs/pdf/${doc.file_path}`, "_blank");
}

export function DocumentList({
  documents,
  editable = false,
  onUpload,
  onDelete,
}: DocumentListProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {/* Upload button — edit mode only */}
      {editable && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            <Upload size={15} />
            {uploading ? "上传中…" : "上传说明书"}
          </button>
          <span className="text-xs text-gray-400">PDF</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-3 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="text-sm text-gray-700 hover:text-blue-600 truncate block text-left w-full"
                  title="新标签页打开"
                >
                  {doc.filename}
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="新标签页打开"
                >
                  <ExternalLink size={15} />
                </button>
                {editable && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
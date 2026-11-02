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
            className="btn btn-ghost"
          >
            <Upload size={15} />
            {uploading ? "上传中…" : "上传说明书"}
          </button>
          <span className="text-xs text-muted">PDF</span>
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
              className="group flex items-center gap-3 rounded-tab border border-line bg-card px-3.5 py-2.5 transition-colors hover:border-line-strong hover:bg-paper/60"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tab bg-signal-soft">
                <FileText size={15} className="text-signal" />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="block w-full truncate text-left text-sm text-ink transition-colors hover:text-cabinet"
                  title="新标签页打开"
                >
                  {doc.filename}
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="rounded-tab p-1.5 text-muted transition-colors hover:bg-cabinet-soft hover:text-cabinet"
                  title="新标签页打开"
                >
                  <ExternalLink size={15} />
                </button>
                {editable && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="rounded-tab p-1.5 text-muted transition-colors hover:bg-signal-soft hover:text-signal"
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
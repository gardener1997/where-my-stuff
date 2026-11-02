import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";

interface PdfPreviewProps {
  src: string;
  filename: string;
  onClose: () => void;
}

export function PdfPreview({ src, filename, onClose }: PdfPreviewProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      <div className="relative bg-card rounded-card shadow-xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h3 className="text-sm font-medium text-ink truncate">
            {filename}
          </h3>
          <div className="flex items-center gap-1">
            <a
              href={src}
              download={filename}
              className="p-2 rounded-tab text-muted hover:bg-paper transition-colors"
              title="下载"
            >
              <Download size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-tab text-muted hover:bg-paper transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <iframe
          src={src}
          className="flex-1 w-full"
          title={filename}
        />
      </div>
    </div>,
    document.body,
  );
}
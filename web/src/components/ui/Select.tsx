import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Nesting level for tree-shaped options (containers, categories). */
  depth?: number;
  /** Full ancestor path shown when this option is selected. */
  path?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "请选择",
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300 transition-colors"
      >
        <span className={`truncate ${selected ? "text-gray-900" : "text-gray-400"}`}>
          {selected ? selected.path ?? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                value === "" ? "text-blue-600 bg-blue-50/50" : "text-gray-500"
              }`}
            >
              {placeholder}
              {value === "" && <Check size={15} className="text-blue-500" />}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                value === opt.value ? "text-blue-600 bg-blue-50/50 font-medium" : "text-gray-700"
              }`}
            >
              <span
                className="truncate"
                style={{ paddingLeft: (opt.depth ?? 0) * 16 }}
              >
                {opt.label}
              </span>
              {value === opt.value && <Check size={15} className="text-blue-500 shrink-0" />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3.5 py-2.5 text-sm text-gray-400">无选项</div>
          )}
        </div>
      )}
    </div>
  );
}

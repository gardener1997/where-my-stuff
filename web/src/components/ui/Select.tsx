import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Show a text filter inside the dropdown, useful for long lists. */
  searchable?: boolean;
}

interface Row extends SelectOption {
  isPlaceholder?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "请选择",
  className = "",
  searchable = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = options.find((o) => o.value === value);
  const trimmedQuery = query.trim().toLowerCase();

  const rows = useMemo<Row[]>(() => {
    const filtered = trimmedQuery
      ? options.filter((o) =>
          `${o.path ?? ""} ${o.label}`.toLowerCase().includes(trimmedQuery),
        )
      : options;
    const result: Row[] = filtered.map((o) => ({ ...o }));
    // The clear/placeholder entry follows the filter, so searching only shows it if it matches.
    if (placeholder && (!trimmedQuery || placeholder.toLowerCase().includes(trimmedQuery))) {
      result.unshift({ value: "", label: placeholder, isPlaceholder: true });
    }
    return result;
  }, [options, placeholder, trimmedQuery]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setActiveIndex(0);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setActiveIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Reset state whenever the dropdown opens; highlight the current selection and
  // focus the filter if there is one.
  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((o) => o.value === value);
    const offset = placeholder ? 1 : 0;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex + offset : 0);
    if (searchable) searchRef.current?.focus();
    // Only react to opening: options/value are read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  // Typing narrows the list, so move the highlight back to the first row.
  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  // Keep the keyboard-highlighted row visible without scrolling the page.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const row = rowRefs.current[activeIndex];
    if (!list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeIndex, open]);

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[activeIndex]) choose(rows[activeIndex].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-tab border border-line bg-white px-3.5 py-2.5 text-left text-sm transition-colors hover:border-line-strong focus:border-cabinet focus:ring-2 focus:ring-cabinet/15 focus:outline-none"
      >
        <span className={`truncate ${selected ? "text-ink" : "text-muted"}`}>
          {selected ? (selected.path ?? selected.label) : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] overflow-hidden rounded-card border border-line bg-white shadow-[0_10px_28px_rgba(28,33,29,0.10)]">
          {searchable && (
            <div className="border-b border-line p-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入以筛选…"
                  autoComplete="off"
                  className="input py-1.5 pl-8"
                />
              </div>
            </div>
          )}

          <div ref={listRef} className="relative max-h-60 overflow-auto">
            {rows.map((row, i) => {
              const isSelected = value === row.value;
              const isActive = i === activeIndex;
              return (
                <button
                  key={row.isPlaceholder ? "__placeholder" : row.value}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(row.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors",
                    !isSelected && "hover:bg-paper/70",
                    isActive && !isSelected && "bg-paper/70",
                    isSelected
                      ? "bg-cabinet-soft text-cabinet font-medium"
                      : row.isPlaceholder
                        ? "text-muted"
                        : "text-ink",
                  )}
                >
                  <span
                    className="truncate"
                    style={
                      row.isPlaceholder ? undefined : { paddingLeft: (row.depth ?? 0) * 16 }
                    }
                  >
                    {row.label}
                  </span>
                  {isSelected && <Check size={15} className="shrink-0 text-cabinet" />}
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="px-3.5 py-2.5 text-sm text-muted">
                {trimmedQuery ? "无匹配项" : "无选项"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

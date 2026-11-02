import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Image URL for a path stored in the DB. New uploads store paths relative to the
 * image dir ("items/x.jpg"); older rows may still carry the "data/images/" prefix.
 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const rel = path.startsWith("data/images/") ? path.slice("data/images/".length) : path;
  return `/images/${rel}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return dateStr.slice(0, 10);
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—";
  return `¥${price.toFixed(2)}`;
}

export function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    purchased: "购买",
    handmade: "自制",
    gift: "赠送",
    salvage: "拆卸",
    other: "其他",
  };
  return labels[type] || type;
}

export function containerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    room: "房间",
    table: "桌子",
    shelf: "架子",
    box: "箱子",
    drawer: "抽屉",
    cabinet: "柜子",
    bag: "袋子",
    other: "其他",
  };
  return labels[type] || type;
}

export function containerPathText(path: { id: string; name: string }[] | null | undefined): string {
  if (!path || path.length === 0) return "未归位";
  return path.map((p) => p.name).join(" › ");
}

export interface FlatTreeNode {
  value: string;
  label: string;
  depth: number;
  /** Ancestor-inclusive path shown when selected, e.g. "工作室 › 大桌子" */
  path: string;
}

/** Depth-first flatten of a category/container tree, for indented <Select> options. */
export function flattenTree(
  nodes: { id: string; name: string; children?: unknown[] }[],
  depth = 0,
  parents: string[] = [],
): FlatTreeNode[] {
  return nodes.flatMap((n) => {
    const path = [...parents, n.name];
    return [
      { value: n.id, label: n.name, depth, path: path.join(" › ") },
      ...flattenTree(
        (n.children ?? []) as { id: string; name: string; children?: unknown[] }[],
        depth + 1,
        path,
      ),
    ];
  });
}

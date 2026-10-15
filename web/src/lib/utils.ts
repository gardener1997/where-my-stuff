import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function containerPathText(path: { id: string; name: string }[] | null | undefined): string {
  if (!path || path.length === 0) return "未归位";
  return path.map((p) => p.name).join(" › ");
}

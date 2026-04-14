import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSeconds(secs: number): string {
  if (secs < 60) return `${secs.toFixed(0)}s`;
  return `${(secs / 60).toFixed(1)}m`;
}

export type SessionStatus = import("./types").SessionStatus;
export type ConfidenceBand = import("./types").ConfidenceBand;

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  extracting: "Extracting",
  structuring: "Structuring",
  matching: "Matching",
  validating: "Validating",
  review: "Ready for Review",
  approved: "Approved",
  exported: "Exported",
  failed: "Failed",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-500 bg-gray-100",
  extracting: "text-blue-700 bg-blue-100",
  structuring: "text-blue-700 bg-blue-100",
  matching: "text-blue-700 bg-blue-100",
  validating: "text-blue-700 bg-blue-100",
  review: "text-amber-700 bg-amber-100",
  approved: "text-green-700 bg-green-100",
  exported: "text-green-700 bg-green-100",
  failed: "text-red-700 bg-red-100",
};

export const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-700 bg-green-50 border-green-200",
  review: "text-amber-700 bg-amber-50 border-amber-200",
  unresolved: "text-red-700 bg-red-50 border-red-200",
};

export const SEVERITY_COLORS: Record<string, string> = {
  error: "text-red-700 bg-red-50",
  warning: "text-amber-700 bg-amber-50",
  info: "text-blue-700 bg-blue-50",
};

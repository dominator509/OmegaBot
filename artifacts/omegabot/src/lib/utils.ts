import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function formatDuration(ms: number | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function truncate(str: string | undefined, len: number): string {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400",
  success: "bg-green-500/15 text-green-700 dark:text-green-400",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  error: "bg-red-500/15 text-red-700 dark:text-red-400",
  unhealthy: "bg-red-500/15 text-red-700 dark:text-red-400",
  pending: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  paused: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  disconnected: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  awaiting_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  retrying: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  stale: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  approved: "bg-green-500/15 text-green-700 dark:text-green-400",
  connected: "bg-green-500/15 text-green-700 dark:text-green-400",
  healthy: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  expired: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  applied: "bg-green-500/15 text-green-700 dark:text-green-400",
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  pending_review: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  available: "bg-green-500/15 text-green-700 dark:text-green-400",
  rate_limited: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  unavailable: "bg-red-500/15 text-red-700 dark:text-red-400",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  cancelled: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  queued: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
  unknown: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export const ADAPTER_COLORS: Record<string, string> = {
  gmail: "bg-red-500/10 text-red-700 dark:text-red-400",
  gcal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  github: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  slack: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  notion: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  web: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  custom: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
};

export const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-green-500/15 text-green-700 dark:text-green-400",
};

export const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
};

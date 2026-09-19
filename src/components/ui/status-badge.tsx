import { cn } from "@/lib/utils/cn";
import { Badge } from "./badge";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "muted";
}

const statusMap: Record<string, StatusBadgeProps["variant"]> = {
  occupied: "warning",
  available: "success",
  dirty: "destructive",
  unpaid: "destructive",
  paid: "success",
  pending: "warning",
  completed: "success",
  in_progress: "info",
  active: "success",
  inactive: "muted",
  cancelled: "destructive",
  confirmed: "success",
  draft: "warning",
  finalized: "info",
};

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant || statusMap[status.toLowerCase()] || "default";
  return <Badge variant={resolvedVariant}>{status}</Badge>;
}

import { Badge } from "@/components/ui/badge";
import { MatchStatus } from "@/lib/api";

const VARIANTS: Record<MatchStatus, "secondary" | "outline" | "default" | "destructive"> = {
  pending:   "secondary",
  running:   "outline",
  completed: "default",
  failed:    "destructive",
};

const LABELS: Record<MatchStatus, string> = {
  pending:   "Pending",
  running:   "Running…",
  completed: "Done",
  failed:    "Failed",
};

export default function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className={status === "running" ? "animate-pulse" : ""}>
      {LABELS[status]}
    </Badge>
  );
}

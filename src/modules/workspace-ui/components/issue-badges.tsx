import { AlertCircle, Circle, Signal, SignalHigh, SignalLow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IssuePriority } from "@/modules/workspace-ui/domain/workspace-types";

const priorityMetadata = {
  none: { label: "No priority", Icon: Circle },
  urgent: { label: "Urgent", Icon: AlertCircle },
  high: { label: "High", Icon: SignalHigh },
  medium: { label: "Medium", Icon: Signal },
  low: { label: "Low", Icon: SignalLow },
};

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const metadata = priorityMetadata[priority];

  return (
    <Badge
      className={cn(
        "gap-1.5 px-0 text-muted-foreground",
        priority === "urgent" && "text-destructive",
        priority === "high" && "text-amber-400",
        priority === "medium" && "text-foreground/75",
      )}
      title={metadata.label}
      variant="ghost"
    >
      <metadata.Icon size={14} />
      <span>{metadata.label}</span>
    </Badge>
  );
}

export function StatusBadge({ name }: { name: string | null }) {
  return (
    <Badge className="gap-1.5 px-0 text-muted-foreground" variant="ghost">
      <span className={cn("size-2 rounded-full border-2 border-primary", !name && "border-muted-foreground")} />
      {name ?? "No status"}
    </Badge>
  );
}

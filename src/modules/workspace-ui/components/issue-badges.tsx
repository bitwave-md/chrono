import { AlertCircle, Circle, Signal, SignalHigh, SignalLow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <Badge className="priority-badge" data-priority={priority} title={metadata.label} variant="ghost">
      <metadata.Icon size={14} />
      <span>{metadata.label}</span>
    </Badge>
  );
}

export function StatusBadge({ name }: { name: string | null }) {
  return (
    <Badge className="status-badge" data-empty={!name} variant="ghost">
      <span className="status-dot" />
      {name ?? "No status"}
    </Badge>
  );
}

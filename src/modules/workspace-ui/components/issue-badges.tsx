import { AlertCircle, Circle, Signal, SignalHigh, SignalLow } from "lucide-react";

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
    <span className="priority-badge" data-priority={priority} title={metadata.label}>
      <metadata.Icon size={14} />
      <span>{metadata.label}</span>
    </span>
  );
}

export function StatusBadge({ name }: { name: string | null }) {
  return (
    <span className="status-badge" data-empty={!name}>
      <span className="status-dot" />
      {name ?? "No status"}
    </span>
  );
}

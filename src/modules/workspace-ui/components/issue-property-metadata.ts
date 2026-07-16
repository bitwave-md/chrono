import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleX,
  LoaderCircle,
  Signal,
  SignalHigh,
  SignalLow,
  type LucideIcon,
} from "lucide-react";

import type { IssuePriority, WorkflowStatusRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface IssuePriorityMetadata {
  label: string;
  icon: LucideIcon;
  color: string;
  iconClassName: string;
}

export const issuePriorityMetadata = {
  none: {
    label: "No priority",
    icon: Circle,
    color: "#71717a",
    iconClassName: "text-muted-foreground",
  },
  urgent: {
    label: "Urgent",
    icon: AlertCircle,
    color: "#ef4444",
    iconClassName: "text-destructive",
  },
  high: {
    label: "High",
    icon: SignalHigh,
    color: "#f59e0b",
    iconClassName: "text-amber-400",
  },
  medium: {
    label: "Medium",
    icon: Signal,
    color: "#a1a1aa",
    iconClassName: "text-foreground/75",
  },
  low: {
    label: "Low",
    icon: SignalLow,
    color: "#60a5fa",
    iconClassName: "text-blue-400",
  },
} satisfies Record<IssuePriority, IssuePriorityMetadata>;

export const issuePriorityOptions = (
  Object.entries(issuePriorityMetadata) as Array<
    [IssuePriority, IssuePriorityMetadata]
  >
).map(([value, metadata]) => ({
  value,
  label: metadata.label,
  icon: metadata.icon,
  color: metadata.color,
  iconClassName: metadata.iconClassName,
}));

export const workflowStatusIcons = {
  backlog: CircleDashed,
  unstarted: Circle,
  started: LoaderCircle,
  completed: CheckCircle2,
  canceled: CircleX,
} satisfies Record<WorkflowStatusRecord["category"], LucideIcon>;

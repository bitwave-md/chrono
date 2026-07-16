import {
  CheckCircle2,
  CircleDashed,
  CircleX,
  LoaderCircle,
  PauseCircle,
} from "lucide-react";

import { issuePriorityOptions } from "@/modules/workspace-ui/components/issue-property-metadata";

export const projectStateOptions = [
  { value: "planned", label: "Planned", color: "#94a3b8", icon: CircleDashed },
  { value: "active", label: "In progress", color: "#60a5fa", icon: LoaderCircle },
  { value: "paused", label: "Paused", color: "#f59e0b", icon: PauseCircle },
  { value: "completed", label: "Completed", color: "#22c55e", icon: CheckCircle2 },
  { value: "canceled", label: "Canceled", color: "#71717a", icon: CircleX },
];

export const projectPriorityOptions = issuePriorityOptions;

import {
  CheckCircle2,
  CircleDashed,
  CircleX,
  LoaderCircle,
  PauseCircle,
} from "lucide-react";

import { issuePriorityOptions } from "@/modules/workspace-ui/components/issue-property-metadata";
import { projectStateMetadata, type ProjectState } from "@/modules/workspace-ui/domain/project-list-groups";

const stateIcons = {
  planned: CircleDashed,
  active: LoaderCircle,
  paused: PauseCircle,
  completed: CheckCircle2,
  canceled: CircleX,
} satisfies Record<ProjectState, typeof CircleDashed>;

export const projectStateOptions = projectStateMetadata.map((metadata) => ({
  ...metadata,
  icon: stateIcons[metadata.value],
}));

export const projectPriorityOptions = issuePriorityOptions;

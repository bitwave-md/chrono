"use client";

import { EntityIcon } from "@/modules/workspace-ui/components/entity-icon";
import type { ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function ProjectIcon({
  project,
  className,
  iconClassName,
}: {
  project: Pick<ProjectRecord, "name" | "iconType" | "iconKey" | "iconColor">;
  className?: string;
  iconClassName?: string;
}) {
  return <EntityIcon className={className} entity={project} iconClassName={iconClassName} />;
}

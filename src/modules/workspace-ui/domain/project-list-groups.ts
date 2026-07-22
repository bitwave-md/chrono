import type { ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

export type ProjectState = ProjectRecord["state"];

export const projectStateMetadata: ReadonlyArray<{
  value: ProjectState;
  label: string;
  color: string;
}> = [
  { value: "active", label: "In progress", color: "#60a5fa" },
  { value: "planned", label: "Planned", color: "#94a3b8" },
  { value: "paused", label: "Paused", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#22c55e" },
  { value: "canceled", label: "Canceled", color: "#71717a" },
];

export interface ProjectListGroup<T> {
  state: ProjectState;
  label: string;
  color: string;
  projects: T[];
}

export function buildProjectListGroups<T extends Pick<ProjectRecord, "state">>(
  projects: readonly T[],
): ProjectListGroup<T>[] {
  return projectStateMetadata.flatMap((metadata) => {
    const grouped = projects.filter((project) => project.state === metadata.value);
    return grouped.length ? [{ ...metadata, state: metadata.value, projects: grouped }] : [];
  });
}

import type {
  ClientRecord,
  FavoriteRecord,
  IssueRecord,
  ProjectDetailRecord,
} from "./workspace-types";

export function favoriteFromClient(client: ClientRecord): FavoriteRecord {
  return {
    id: `optimistic:client:${client.id}`,
    targetType: "client",
    targetId: client.id,
    title: client.name,
    clientId: client.id,
    projectId: null,
    identifier: null,
    iconType: client.iconType,
    iconKey: client.iconKey,
    iconColor: client.iconColor,
  };
}

export function favoriteFromProject(project: ProjectDetailRecord): FavoriteRecord {
  return {
    id: `optimistic:project:${project.id}`,
    targetType: "project",
    targetId: project.id,
    title: project.name,
    clientId: project.clientId,
    projectId: project.id,
    identifier: null,
    iconType: project.iconType,
    iconKey: project.iconKey,
    iconColor: project.iconColor,
  };
}

export function favoriteFromIssue(issue: IssueRecord): FavoriteRecord {
  return {
    id: `optimistic:issue:${issue.id}`,
    targetType: "issue",
    targetId: issue.id,
    title: issue.title,
    clientId: issue.clientId,
    projectId: issue.projectId,
    identifier: issue.identifier,
    iconType: null,
    iconKey: null,
    iconColor: issue.statusColor,
  };
}

export function favoritePath(workspaceSlug: string, favorite: FavoriteRecord): string {
  const root = `/app/${encodeURIComponent(workspaceSlug)}`;
  if (favorite.targetType === "client") {
    return `${root}/clients/${encodeURIComponent(favorite.targetId)}/overview`;
  }
  if (favorite.targetType === "project") {
    return `${root}/projects/${encodeURIComponent(favorite.targetId)}/overview`;
  }
  return favorite.projectId
    ? `${root}/projects/${encodeURIComponent(favorite.projectId)}/issues/${encodeURIComponent(favorite.targetId)}`
    : `${root}/issues/${encodeURIComponent(favorite.targetId)}`;
}

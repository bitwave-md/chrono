export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface Principal {
  userId: string;
  email: string;
  membershipId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

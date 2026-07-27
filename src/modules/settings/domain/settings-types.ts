import type { WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";
import type { UpdateJobRecord } from "@/modules/settings/domain/update-job";

export interface AccountProfileRecord { id: string; name: string | null; email: string; image: string | null }
export interface AccountPreferencesRecord {
  theme: "dark" | "light" | "system";
  density: "compact" | "comfortable";
  issueView: "list" | "board";
  sidebarCollapsed: boolean;
}
export interface NotificationPreferencesRecord { assignments: boolean; statusChanges: boolean; comments: boolean }
export interface WorkspaceGeneralRecord {
  id: string;
  name: string;
  slug: string;
  iconType: "icon" | "emoji";
  iconKey: string;
  iconColor: string;
  imageObjectId: string | null;
  imageUrl: string | null;
  canManage: boolean;
  isOperator: boolean;
}
export interface SettingsMemberRecord {
  membershipId: string;
  userId: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceIdentity["role"];
  status: "active" | "invited" | "suspended" | "removed";
  joinedAt: string;
}
export interface SettingsInvitationRecord { id: string; email: string; role: WorkspaceIdentity["role"]; expiresAt: string; createdAt: string }
export interface MemberSettingsRecord { members: SettingsMemberRecord[]; invitations: SettingsInvitationRecord[] }
export interface StorageStatusRecord {
  enabled: boolean;
  healthy: boolean;
  mode: "bundled" | "external";
  endpoint: string | null;
  bucket: string | null;
  usedBytes: number;
  objectCount: number;
  quotaBytes: number;
  backup: { completedAt: string; version: string; path: string } | null;
}
export interface UpdateStatusRecord {
  installedVersion: string;
  buildCommit: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseName: string | null;
  releaseNotes: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
  repository: string;
  releaseState: "available" | "not_found" | "unauthorized" | "rate_limited" | "unavailable" | "invalid_configuration";
  releaseMessage: string;
  releaseAuthentication: "token" | "anonymous";
  rateLimitReset: string | null;
  checkedAt: string;
  command: string;
  updateMode: "automatic" | "manual" | "source";
  canStartUpdate: boolean;
  job: UpdateJobRecord | null;
}

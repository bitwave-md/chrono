import type {
  AccountPreferencesRecord,
  AccountProfileRecord,
  MemberSettingsRecord,
  NotificationPreferencesRecord,
  StorageStatusRecord,
  UpdateStatusRecord,
  WorkspaceGeneralRecord,
} from "@/modules/settings/domain/settings-types";
import type { UpdateJobRecord } from "@/modules/settings/domain/update-job";
import type { TimeCategoryRecord, WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";
import { workspaceApiRequest } from "@/modules/workspace-ui/infrastructure/workspace-api-request";
import { uploadRawFile } from "@/modules/workspace-ui/infrastructure/workspace-storage-api-client";

export class SettingsApiClient {
  readonly #workspaceBase: string;

  constructor(workspaceSlug: string) {
    this.#workspaceBase = `/api/workspaces/${encodeURIComponent(workspaceSlug)}`;
  }

  profile() { return workspaceApiRequest<AccountProfileRecord>("/api", "/account/profile"); }
  updateProfile(name: string) { return workspaceApiRequest<AccountProfileRecord>("/api", "/account/profile", { method: "PATCH", body: JSON.stringify({ name }) }); }
  preferences() { return workspaceApiRequest<AccountPreferencesRecord>("/api", "/account/preferences"); }
  updatePreferences(input: Partial<AccountPreferencesRecord>) { return workspaceApiRequest<AccountPreferencesRecord>("/api", "/account/preferences", { method: "PATCH", body: JSON.stringify(input) }); }
  notifications() { return this.#get<NotificationPreferencesRecord>("/settings/notifications"); }
  updateNotifications(input: Partial<NotificationPreferencesRecord>) { return this.#patch<NotificationPreferencesRecord>("/settings/notifications", input); }
  general() { return this.#get<WorkspaceGeneralRecord>("/settings/general"); }
  updateGeneral(input: Partial<Pick<WorkspaceGeneralRecord, "name" | "iconType" | "iconKey" | "iconColor">>) { return this.#patch<WorkspaceGeneralRecord>("/settings/general", input); }
  members() { return this.#get<MemberSettingsRecord>("/settings/members"); }
  invite(email: string, role: WorkspaceIdentity["role"], guestAccess?: { clients: Array<{ clientId: string; excludedProjectIds: string[] }> }) { return workspaceApiRequest<{ registrationUrl: string }>(this.#workspaceBase, "/settings/members", { method: "POST", body: JSON.stringify({ email, role, ...(guestAccess ? { guestAccess } : {}) }) }); }
  updateMember(membershipId: string, input: { role?: WorkspaceIdentity["role"]; status?: "active" | "suspended" | "removed" }) { return this.#patch(`/settings/members/${encodeURIComponent(membershipId)}`, input); }
  refreshInvitation(invitationId: string) { return workspaceApiRequest<{ registrationUrl: string }>(this.#workspaceBase, `/settings/invitations/${encodeURIComponent(invitationId)}`, { method: "POST", body: "{}" }); }
  revokeInvitation(invitationId: string) { return workspaceApiRequest(this.#workspaceBase, `/settings/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" }); }
  categories() { return this.#get<TimeCategoryRecord[]>("/time-categories"); }
  createCategory(input: { name: string; key: string; color: string; defaultBillable: boolean }) { return workspaceApiRequest<TimeCategoryRecord>(this.#workspaceBase, "/time-categories", { method: "POST", body: JSON.stringify(input) }); }
  updateCategory(categoryId: string, input: Partial<Pick<TimeCategoryRecord, "name" | "color" | "position" | "defaultBillable">> & { archived?: boolean }) { return this.#patch<TimeCategoryRecord>(`/time-categories/${encodeURIComponent(categoryId)}`, input); }
  storage() { return this.#get<StorageStatusRecord>("/settings/storage"); }
  updates() { return this.#get<UpdateStatusRecord>("/settings/updates"); }
  startUpdate() { return workspaceApiRequest<UpdateJobRecord>(this.#workspaceBase, "/settings/updates", { method: "POST", body: "{}" }); }

  async uploadAvatar(file: File, onProgress: (value: number) => void) {
    const intent = await workspaceApiRequest<{ uploadId: string; uploadUrl: string }>("/api", "/account/avatar", { method: "POST", body: JSON.stringify(fileMetadata(file)) });
    await uploadRawFile(intent.uploadUrl, file, onProgress);
    return intent;
  }
  removeAvatar() { return workspaceApiRequest("/api", "/account/avatar", { method: "DELETE" }); }
  async uploadWorkspaceIcon(file: File, onProgress: (value: number) => void) {
    const intent = await workspaceApiRequest<{ uploadId: string; uploadUrl: string }>(this.#workspaceBase, "/icon", { method: "POST", body: JSON.stringify(fileMetadata(file)) });
    await uploadRawFile(intent.uploadUrl, file, onProgress);
    return intent;
  }
  removeWorkspaceIcon() { return workspaceApiRequest(this.#workspaceBase, "/icon", { method: "DELETE" }); }
  changePassword(input: { currentPassword: string; password: string }) { return workspaceApiRequest("/api", "/account/password", { method: "PATCH", body: JSON.stringify(input) }); }
  createPasswordReset(membershipId: string) { return workspaceApiRequest<{ resetUrl: string; expiresAt: string }>(this.#workspaceBase, `/settings/members/${encodeURIComponent(membershipId)}/password-reset`, { method: "POST", body: "{}" }); }

  #get<T>(path: string) { return workspaceApiRequest<T>(this.#workspaceBase, path); }
  #patch<T>(path: string, input: unknown) { return workspaceApiRequest<T>(this.#workspaceBase, path, { method: "PATCH", body: JSON.stringify(input) }); }
}

function fileMetadata(file: File) { return { filename: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }; }

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AccountPreferencesRecord, NotificationPreferencesRecord, WorkspaceGeneralRecord } from "@/modules/settings/domain/settings-types";
import { SettingsApiClient } from "@/modules/settings/infrastructure/settings-api-client";
import type { TimeCategoryRecord, WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";
import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";

const accountKey = (name: string) => ["account", name] as const;
const settingsKey = (workspaceSlug: string, name: string) => ["workspace", workspaceSlug, "settings", name] as const;

export function useProfileQuery(workspaceSlug: string) {
  return useQuery({ queryKey: accountKey("profile"), queryFn: () => new SettingsApiClient(workspaceSlug).profile() });
}
export function useUpdateProfileMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (name: string) => new SettingsApiClient(workspaceSlug).updateProfile(name), onSuccess: (value) => { queries.setQueryData(accountKey("profile"), value); queries.invalidateQueries({ queryKey: ["workspace"] }); } });
}
export function usePreferencesQuery(workspaceSlug: string) {
  return useQuery({ queryKey: accountKey("preferences"), queryFn: () => new SettingsApiClient(workspaceSlug).preferences() });
}
export function useUpdatePreferencesMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (input: Partial<AccountPreferencesRecord>) => new SettingsApiClient(workspaceSlug).updatePreferences(input), onSuccess: (value) => queries.setQueryData(accountKey("preferences"), value) });
}
export function useNotificationsQuery(workspaceSlug: string) {
  return useQuery({ queryKey: settingsKey(workspaceSlug, "notifications"), queryFn: () => new SettingsApiClient(workspaceSlug).notifications() });
}
export function useUpdateNotificationsMutation(workspaceSlug: string) {
  const queries = useQueryClient(); const key = settingsKey(workspaceSlug, "notifications");
  return useMutation({ mutationFn: (input: Partial<NotificationPreferencesRecord>) => new SettingsApiClient(workspaceSlug).updateNotifications(input), onSuccess: (value) => queries.setQueryData(key, value) });
}
export function useWorkspaceGeneralQuery(workspaceSlug: string) {
  return useQuery({ queryKey: settingsKey(workspaceSlug, "general"), queryFn: () => new SettingsApiClient(workspaceSlug).general() });
}
export function useUpdateWorkspaceGeneralMutation(workspaceSlug: string) {
  const queries = useQueryClient(); const key = settingsKey(workspaceSlug, "general");
  return useMutation({ mutationFn: (input: Partial<Pick<WorkspaceGeneralRecord, "name" | "iconType" | "iconKey" | "iconColor">>) => new SettingsApiClient(workspaceSlug).updateGeneral(input), onSuccess: (value) => queries.setQueryData(key, value) });
}
export function useSettingsMembersQuery(workspaceSlug: string) {
  return useQuery({ queryKey: settingsKey(workspaceSlug, "members"), queryFn: () => new SettingsApiClient(workspaceSlug).members() });
}
export function useInviteMemberMutation(workspaceSlug: string) {
  const queries = useQueryClient(); return useMutation({ mutationFn: (input: { email: string; role: WorkspaceIdentity["role"]; guestAccess?: { clients: Array<{ clientId: string; excludedProjectIds: string[] }> } }) => new SettingsApiClient(workspaceSlug).invite(input.email, input.role, input.guestAccess), onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, "members") }) });
}
export function useUpdateMemberMutation(workspaceSlug: string) {
  return useInvalidatingMutation(workspaceSlug, "members", (input: { membershipId: string; role?: WorkspaceIdentity["role"]; status?: "active" | "suspended" | "removed" }) => {
    const { membershipId, ...values } = input; return new SettingsApiClient(workspaceSlug).updateMember(membershipId, values);
  });
}
export function useRefreshInvitationMutation(workspaceSlug: string) {
  const queries = useQueryClient(); return useMutation({ mutationFn: (id: string) => new SettingsApiClient(workspaceSlug).refreshInvitation(id), onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, "members") }) });
}
export function useChangePasswordMutation(workspaceSlug: string) { return useMutation({ mutationFn: (input: { currentPassword: string; password: string }) => new SettingsApiClient(workspaceSlug).changePassword(input) }); }
export function useCreatePasswordResetMutation(workspaceSlug: string) { return useMutation({ mutationFn: (membershipId: string) => new SettingsApiClient(workspaceSlug).createPasswordReset(membershipId) }); }
export function useRevokeInvitationMutation(workspaceSlug: string) {
  return useInvalidatingMutation(workspaceSlug, "members", (id: string) => new SettingsApiClient(workspaceSlug).revokeInvitation(id));
}
export function useSettingsCategoriesQuery(workspaceSlug: string) {
  return useQuery({ queryKey: workspaceQueryKeys.categories(workspaceSlug), queryFn: () => new SettingsApiClient(workspaceSlug).categories() });
}
export function useCreateSettingsCategoryMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (input: { name: string; key: string; color: string; defaultBillable: boolean }) => new SettingsApiClient(workspaceSlug).createCategory(input), onSuccess: () => queries.invalidateQueries({ queryKey: workspaceQueryKeys.categories(workspaceSlug) }) });
}
export function useUpdateSettingsCategoryMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (input: { id: string; values: Partial<Pick<TimeCategoryRecord, "name" | "color" | "position" | "defaultBillable">> & { archived?: boolean } }) => new SettingsApiClient(workspaceSlug).updateCategory(input.id, input.values), onSuccess: () => queries.invalidateQueries({ queryKey: workspaceQueryKeys.categories(workspaceSlug) }) });
}
export function useStorageStatusQuery(workspaceSlug: string, enabled: boolean) {
  return useQuery({ queryKey: settingsKey(workspaceSlug, "storage"), queryFn: () => new SettingsApiClient(workspaceSlug).storage(), enabled });
}
export function useUpdateStatusQuery(workspaceSlug: string, enabled: boolean) {
  return useQuery({
    queryKey: settingsKey(workspaceSlug, "updates"),
    queryFn: () => new SettingsApiClient(workspaceSlug).updates(),
    enabled,
    staleTime: 15 * 60_000,
    refetchInterval: (query) => {
      const stage = query.state.data?.job?.stage;
      return stage && stage !== "completed" && stage !== "failed" ? 2_000 : 6 * 60 * 60_000;
    },
    refetchOnWindowFocus: true,
  });
}
export function useStartUpdateMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: () => new SettingsApiClient(workspaceSlug).startUpdate(), onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, "updates") }) });
}
export function useAvatarMutation(workspaceSlug: string, onProgress: (value: number) => void) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (file: File) => new SettingsApiClient(workspaceSlug).uploadAvatar(file, onProgress), onSuccess: () => queries.invalidateQueries({ queryKey: accountKey("profile") }) });
}
export function useRemoveAvatarMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: () => new SettingsApiClient(workspaceSlug).removeAvatar(), onSuccess: () => queries.invalidateQueries({ queryKey: accountKey("profile") }) });
}
export function useWorkspaceIconMutation(workspaceSlug: string, onProgress: (value: number) => void) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: (file: File) => new SettingsApiClient(workspaceSlug).uploadWorkspaceIcon(file, onProgress), onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, "general") }) });
}
export function useRemoveWorkspaceIconMutation(workspaceSlug: string) {
  const queries = useQueryClient();
  return useMutation({ mutationFn: () => new SettingsApiClient(workspaceSlug).removeWorkspaceIcon(), onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, "general") }) });
}

function useInvalidatingMutation<TInput>(workspaceSlug: string, name: string, mutationFn: (input: TInput) => Promise<unknown>) {
  const queries = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queries.invalidateQueries({ queryKey: settingsKey(workspaceSlug, name) }) });
}

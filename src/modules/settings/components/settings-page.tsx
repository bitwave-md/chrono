"use client";

import { AccountProfileSettings } from "@/modules/settings/components/account-profile-settings";
import { AccountPreferencesSettings } from "@/modules/settings/components/account-preferences-settings";
import { NotificationSettings } from "@/modules/settings/components/notification-settings";
import { StorageSettings } from "@/modules/settings/components/storage-settings";
import { TimeEntryTypeSettings } from "@/modules/settings/components/time-entry-type-settings";
import { UpdateSettings } from "@/modules/settings/components/update-settings";
import { WorkspaceGeneralSettings } from "@/modules/settings/components/workspace-general-settings";
import { WorkspaceMemberSettings } from "@/modules/settings/components/workspace-member-settings";
import { SettingsPageFrame } from "@/modules/settings/components/settings-primitives";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function SettingsPage({ path, workspaceSlug }: { path: string; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  if (path === "personal/profile") return <AccountProfileSettings workspaceSlug={workspaceSlug} />;
  if (path === "personal/preferences") return <AccountPreferencesSettings workspaceSlug={workspaceSlug} />;
  if (path === "personal/notifications") return <NotificationSettings workspaceSlug={workspaceSlug} />;
  if (path === "workspace/general" && workspace.role !== "guest") return <WorkspaceGeneralSettings workspaceSlug={workspaceSlug} />;
  if (path === "workspace/members" && workspace.role !== "guest") return <WorkspaceMemberSettings workspaceSlug={workspaceSlug} />;
  if (path === "workspace/time-entry-types" && workspace.role !== "guest") return <TimeEntryTypeSettings workspaceSlug={workspaceSlug} />;
  if (path === "administration/storage" && workspace.isOperator) return <StorageSettings workspaceSlug={workspaceSlug} />;
  if (path === "administration/updates" && workspace.isOperator) return <UpdateSettings workspaceSlug={workspaceSlug} />;
  return <SettingsPageFrame description="This settings page does not exist or is not available to your account." title="Settings unavailable"><div className="rounded-xl border p-8 text-sm text-muted-foreground">Return to another settings category from the sidebar.</div></SettingsPageFrame>;
}

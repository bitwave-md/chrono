"use client";

import toast from "react-hot-toast";

import { useNotificationsQuery, useUpdateNotificationsMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection, SettingsToggle } from "@/modules/settings/components/settings-primitives";
import type { NotificationPreferencesRecord } from "@/modules/settings/domain/settings-types";

export function NotificationSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = useNotificationsQuery(workspaceSlug);
  const update = useUpdateNotificationsMutation(workspaceSlug);
  if (query.isLoading) return <SettingsPageFrame description="Choose which activity reaches your Inbox." title="Notifications"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Choose which activity reaches your Inbox." title="Notifications"><SettingsError message={query.error?.message ?? "Notification preferences unavailable."} /></SettingsPageFrame>;
  const save = (key: keyof NotificationPreferencesRecord, value: boolean) => update.mutate({ [key]: value }, { onError: (error) => toast.error(error.message) });
  return (
    <SettingsPageFrame description="Control the Workspace activity that appears in your personal Inbox." title="Notifications">
      <SettingsSection title="Inbox events">
        <SettingsRow label="Assignments" description="When someone assigns an Issue to you."><SettingsToggle checked={query.data.assignments} label="Assignment notifications" onChange={(value) => save("assignments", value)} /></SettingsRow>
        <SettingsRow label="Status changes" description="When an Issue assigned to you changes workflow status."><SettingsToggle checked={query.data.statusChanges} label="Status change notifications" onChange={(value) => save("statusChanges", value)} /></SettingsRow>
        <SettingsRow label="Comments" description="When someone comments on an Issue assigned to you."><SettingsToggle checked={query.data.comments} label="Comment notifications" onChange={(value) => save("comments", value)} /></SettingsRow>
      </SettingsSection>
    </SettingsPageFrame>
  );
}

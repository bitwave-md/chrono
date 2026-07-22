"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferencesQuery, useUpdatePreferencesMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection, SettingsToggle } from "@/modules/settings/components/settings-primitives";
import type { AccountPreferencesRecord } from "@/modules/settings/domain/settings-types";
import { useWorkspaceView } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function AccountPreferencesSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = usePreferencesQuery(workspaceSlug);
  const update = useUpdatePreferencesMutation(workspaceSlug);
  const setSidebarCollapsed = useWorkspaceView((state) => state.setSidebarCollapsed);
  const { setTheme } = useTheme();
  useEffect(() => {
    if (query.data) document.documentElement.dataset.density = query.data.density;
  }, [query.data]);
  if (query.isLoading) return <SettingsPageFrame description="Tune Chrono to your workflow." title="Preferences"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Tune Chrono to your workflow." title="Preferences"><SettingsError message={query.error?.message ?? "Preferences unavailable."} /></SettingsPageFrame>;
  const value = query.data;
  const save = <K extends keyof AccountPreferencesRecord>(key: K, next: AccountPreferencesRecord[K]) => {
    update.mutate({ [key]: next }, { onError: (error) => toast.error(error.message) });
  };
  return (
    <SettingsPageFrame description="Choose appearance, information density, and default navigation behavior." title="Preferences">
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme"><Choice value={value.theme} options={["dark", "light", "system"]} onChange={(next) => { save("theme", next as AccountPreferencesRecord["theme"]); setTheme(next); }} /></SettingsRow>
        <SettingsRow label="Density" description="Compact fits more work on screen."><Choice value={value.density} options={["compact", "comfortable"]} onChange={(next) => { save("density", next as AccountPreferencesRecord["density"]); document.documentElement.dataset.density = next; }} /></SettingsRow>
      </SettingsSection>
      <SettingsSection title="Defaults">
        <SettingsRow label="Issue view"><Choice value={value.issueView} options={["list", "board"]} onChange={(next) => save("issueView", next as AccountPreferencesRecord["issueView"])} /></SettingsRow>
        <SettingsRow label="Start with sidebar collapsed"><SettingsToggle checked={value.sidebarCollapsed} disabled={update.isPending} label="Start with sidebar collapsed" onChange={(next) => { save("sidebarCollapsed", next); setSidebarCollapsed(next); }} /></SettingsRow>
      </SettingsSection>
    </SettingsPageFrame>
  );
}

function Choice({ onChange, options, value }: { onChange: (value: string) => void; options: string[]; value: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-44 capitalize"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem className="capitalize" key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
}

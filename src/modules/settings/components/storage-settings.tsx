"use client";

import { CheckCircle2, Database, HardDrive, TriangleAlert } from "lucide-react";

import { useStorageStatusQuery } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection } from "@/modules/settings/components/settings-primitives";

export function StorageSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = useStorageStatusQuery(workspaceSlug, true);
  if (query.isLoading) return <SettingsPageFrame description="Inspect private object storage and backup state." title="Storage"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Inspect private object storage and backup state." title="Storage"><SettingsError message={query.error?.message ?? "Storage status unavailable."} /></SettingsPageFrame>;
  const value = query.data;
  const percentage = value.quotaBytes ? Math.min(100, Math.round(value.usedBytes / value.quotaBytes * 100)) : 0;
  return (
    <SettingsPageFrame description="Health and capacity for the S3-compatible backend used by uploads and attachments." title="Storage">
      <SettingsSection title="Backend">
        <SettingsRow label="Status" description={value.enabled ? `${value.mode} S3-compatible storage` : "Storage is disabled"}><span className="inline-flex items-center gap-2 text-sm">{value.healthy ? <CheckCircle2 className="size-4 text-emerald-400" /> : <TriangleAlert className="size-4 text-amber-400" />}{value.healthy ? "Healthy" : "Unavailable"}</span></SettingsRow>
        <SettingsRow label="Endpoint"><code className="max-w-72 truncate text-xs text-muted-foreground">{value.endpoint ?? "Not configured"}</code></SettingsRow>
        <SettingsRow label="Private bucket"><span className="text-sm">{value.bucket ?? "—"}</span></SettingsRow>
      </SettingsSection>
      <SettingsSection title="Workspace usage">
        <div className="p-4"><div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2"><HardDrive className="size-4 text-muted-foreground" />{formatBytes(value.usedBytes)} used</span><span className="text-muted-foreground">{formatBytes(value.quotaBytes)} limit</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{value.objectCount.toLocaleString()} stored objects · {percentage}% of quota</p></div>
      </SettingsSection>
      <SettingsSection title="Backup status" description="The host-side backup includes PostgreSQL, this private bucket, configuration metadata, and checksums.">
        <SettingsRow label="Last completed backup">{value.backup ? <span className="text-right text-sm"><strong className="block font-medium">{new Date(value.backup.completedAt).toLocaleString()}</strong><span className="text-xs text-muted-foreground">Chrono {value.backup.version}</span></span> : <span className="inline-flex items-center gap-2 text-sm text-amber-400"><Database className="size-4" />No backup reported</span>}</SettingsRow>
      </SettingsSection>
    </SettingsPageFrame>
  );
}

function formatBytes(value: number) { if (!value) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024))); return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`; }

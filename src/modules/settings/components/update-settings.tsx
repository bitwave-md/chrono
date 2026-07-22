"use client";

import { CheckCircle2, Copy, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useUpdateStatusQuery } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection } from "@/modules/settings/components/settings-primitives";

export function UpdateSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = useUpdateStatusQuery(workspaceSlug, true);
  if (query.isLoading) return <SettingsPageFrame description="Review releases and guided upgrade instructions." title="Updates"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Review releases and guided upgrade instructions." title="Updates"><SettingsError message={query.error?.message ?? "Update status unavailable."} /></SettingsPageFrame>;
  const value = query.data;
  return (
    <SettingsPageFrame description="Chrono reports available releases here; upgrades remain a deliberate host-side operation." title="Updates">
      <SettingsSection title="Version">
        <SettingsRow label="Installed"><code className="text-xs">{value.installedVersion}</code></SettingsRow>
        <SettingsRow label="Latest release"><span className="inline-flex items-center gap-2 text-sm">{value.latestVersion ? value.updateAvailable ? <TriangleAlert className="size-4 text-amber-400" /> : <CheckCircle2 className="size-4 text-emerald-400" /> : <RefreshCw className="size-4 text-muted-foreground" />}{value.latestVersion ?? "Could not reach release service"}</span></SettingsRow>
      </SettingsSection>
      {value.releaseName ? <SettingsSection title={value.releaseName} description={value.publishedAt ? `Published ${new Date(value.publishedAt).toLocaleDateString()}` : undefined}><div className="max-h-72 overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-6 text-muted-foreground">{value.releaseNotes || "No release notes were provided."}</div>{value.releaseUrl ? <div className="border-t p-3"><Button asChild size="sm" variant="outline"><a href={value.releaseUrl} rel="noreferrer" target="_blank">View release <ExternalLink /></a></Button></div> : null}</SettingsSection> : null}
      <SettingsSection title="Guided host update" description="The application is intentionally unable to access Docker. Run the versioned update helper on the host.">
        <div className="p-4"><div className="rounded-lg border bg-background p-3 font-mono text-xs">{value.command}</div><div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(value.command); toast.success("Update command copied"); }}><Copy />Copy command</Button><span className="text-xs text-amber-400">Create and verify a backup before updating.</span></div></div>
      </SettingsSection>
    </SettingsPageFrame>
  );
}

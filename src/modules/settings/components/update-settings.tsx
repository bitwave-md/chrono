"use client";

import { Check, CheckCircle2, Circle, Copy, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStartUpdateMutation, useUpdateStatusQuery } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection } from "@/modules/settings/components/settings-primitives";
import type { UpdateStatusRecord } from "@/modules/settings/domain/settings-types";
import { updateInProgress, type UpdateJobRecord, type UpdateStage } from "@/modules/settings/domain/update-job";

const progressStages: Array<{ stage: UpdateStage; label: string }> = [
  { stage: "queued", label: "Queued" },
  { stage: "validating", label: "Validate release" },
  { stage: "backing_up", label: "Create backup" },
  { stage: "pulling", label: "Pull images" },
  { stage: "migrating", label: "Run migrations" },
  { stage: "restarting", label: "Restart Chrono" },
  { stage: "verifying", label: "Verify health" },
];

export function UpdateSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = useUpdateStatusQuery(workspaceSlug, true);
  const start = useStartUpdateMutation(workspaceSlug);
  const [confirming, setConfirming] = useState(false);
  if (query.isLoading) return <SettingsPageFrame description="Install verified official Chrono releases." title="Updates"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Install verified official Chrono releases." title="Updates"><SettingsError message={query.error?.message ?? "Update status unavailable."} /></SettingsPageFrame>;
  const value = query.data;
  const running = updateInProgress(value.job);
  const begin = () => start.mutate(undefined, {
    onSuccess: (job) => {
      localStorage.setItem("chrono:pending-update-job", job.id);
      setConfirming(false);
      toast.success(`Update to ${job.targetVersion} queued`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <SettingsPageFrame description="Install verified official Chrono releases." title="Updates">
      <SettingsSection title="Version">
        <SettingsRow label="Installed" description={value.buildCommit ? `Commit ${value.buildCommit.slice(0, 10)}` : undefined}><code className="text-xs">{value.installedVersion}</code></SettingsRow>
        <SettingsRow label="Latest official release" description={!value.latestVersion ? value.releaseMessage : undefined}><ReleaseValue value={value} /></SettingsRow>
        <SettingsRow label="Release source" description={`Checked ${new Date(value.checkedAt).toLocaleString()}`}><span className="text-right text-sm"><code className="block text-xs">{value.repository}</code><span className="text-xs capitalize text-muted-foreground">{value.releaseAuthentication} access</span></span></SettingsRow>
      </SettingsSection>

      {value.job ? <UpdateProgress job={value.job} /> : null}

      <SettingsSection title="Install update" description={modeDescription(value.updateMode)}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-muted-foreground">A coordinated database and object-storage backup is created before migration.</div>
          <Button disabled={!value.canStartUpdate || running || start.isPending} onClick={() => setConfirming(true)}>
            {running ? <LoaderCircle className="animate-spin" /> : null}
            {running ? "Updating" : value.updateAvailable && value.latestVersion ? `Update to ${value.latestVersion}` : "Up to date"}
          </Button>
        </div>
      </SettingsSection>

      {value.releaseName ? <SettingsSection title={value.releaseName} description={value.publishedAt ? `Published ${new Date(value.publishedAt).toLocaleDateString()}` : undefined}><div className="max-h-72 overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-6 text-muted-foreground">{value.releaseNotes || "No release notes were provided."}</div>{value.releaseUrl ? <div className="border-t p-3"><Button asChild size="sm" variant="outline"><a href={value.releaseUrl} rel="noreferrer" target="_blank">View release <ExternalLink /></a></Button></div> : null}</SettingsSection> : null}

      <SettingsSection title="Manual recovery" description="Use the versionless host helper if the application interface is unavailable.">
        <div className="p-4"><div className="rounded-lg border bg-background p-3 font-mono text-xs">{value.command}</div><Button className="mt-3" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(value.command); toast.success("Recovery command copied"); }}><Copy />Copy command</Button></div>
      </SettingsSection>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Chrono to {value.latestVersion}</DialogTitle><DialogDescription>Chrono will create a complete backup, install digest-verified images, migrate the database, and briefly restart the application.</DialogDescription></DialogHeader>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mr-2 inline size-4 text-amber-400" />Do not stop Docker or power off the host while the update is running.</div>
          <DialogFooter><Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button><Button disabled={start.isPending} onClick={begin}>{start.isPending ? <LoaderCircle className="animate-spin" /> : null}Back up and update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageFrame>
  );
}

function ReleaseValue({ value }: { value: UpdateStatusRecord }) {
  return <span className="inline-flex items-center gap-2 text-sm">{value.latestVersion ? value.updateAvailable ? <TriangleAlert className="size-4 text-amber-400" /> : <CheckCircle2 className="size-4 text-emerald-400" /> : <Circle className="size-4 text-muted-foreground" />}{value.latestVersion ?? releaseStateLabel(value.releaseState)}</span>;
}

function UpdateProgress({ job }: { job: UpdateJobRecord }) {
  const current = progressStages.findIndex((item) => item.stage === job.stage);
  const finished = job.stage === "completed";
  return <SettingsSection title={`Update ${job.targetVersion}`} description={job.message}><div className="grid gap-2 p-4 sm:grid-cols-2">{progressStages.map((item, index) => { const done = finished || current > index; const active = current === index; return <div className="flex items-center gap-2 text-xs" key={item.stage}>{done ? <Check className="size-3.5 text-emerald-400" /> : active ? <LoaderCircle className="size-3.5 animate-spin text-amber-400" /> : <Circle className="size-3.5 text-muted-foreground/50" />}<span className={active ? "text-foreground" : "text-muted-foreground"}>{item.label}</span></div>; })}</div>{job.stage === "failed" ? <div className="border-t border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">Failed during {job.failureStage?.replaceAll("_", " ") ?? "update"}: {job.message}</div> : null}</SettingsSection>;
}

function modeDescription(mode: UpdateStatusRecord["updateMode"]): string {
  if (mode === "automatic") return "The isolated updater is ready. Next.js has no Docker socket access.";
  if (mode === "source") return "Automatic updates are unavailable for source-development installations.";
  return "The updater is not available. Run the bootstrap or manual recovery helper on the host.";
}

function releaseStateLabel(state: UpdateStatusRecord["releaseState"]) {
  if (state === "not_found") return "No official release";
  if (state === "unauthorized") return "GitHub token rejected";
  if (state === "rate_limited") return "GitHub rate limited";
  if (state === "invalid_configuration") return "Invalid repository setting";
  return "Release service unavailable";
}

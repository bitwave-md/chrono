"use client";

import { CircleDot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { ToastSurface } from "@/components/ui/toast-surface";
import { useUpdateStatusQuery } from "@/modules/settings/application/use-settings-queries";
import { UpdateProgressOverlay } from "@/modules/settings/components/update-progress-overlay";
import { updateInProgress } from "@/modules/settings/domain/update-job";

export function UpdateNotificationBridge({ enabled, workspaceSlug }: { enabled: boolean; workspaceSlug: string }) {
  const query = useUpdateStatusQuery(workspaceSlug, enabled);
  const router = useRouter();

  useEffect(() => {
    const value = query.data;
    if (!value) return;
    if (value.job && updateInProgress(value.job)) localStorage.setItem("chrono:pending-update-job", value.job.id);
    const pendingJob = localStorage.getItem("chrono:pending-update-job");
    if (pendingJob && value.job?.id === pendingJob && (value.job.stage === "completed" || value.job.stage === "failed")) {
      const successful = value.job.stage === "completed";
      if (successful) toast.success(value.job.message);
      else toast.error(value.job.message);
      localStorage.removeItem("chrono:pending-update-job");
    }
    if (updateInProgress(value.job) || !value.updateAvailable || !value.latestVersion) return;
    const notificationKey = `chrono:update-notified:${value.latestVersion}`;
    if (localStorage.getItem(notificationKey)) return;
    localStorage.setItem(notificationKey, new Date().toISOString());
    toast.custom((item) => (
      <ToastSurface action={<Button size="sm" variant="secondary" onClick={() => { toast.dismiss(item.id); router.push(`/app/${workspaceSlug}/settings/administration/updates`); }}>View</Button>} indicator={<CircleDot className="size-3.5 text-amber-400" />}>
        <span className="block font-mono text-[0.62rem] text-muted-foreground">Update available</span>
        <strong className="mt-0.5 block text-xs font-semibold">Chrono {value.latestVersion} is ready</strong>
      </ToastSurface>
    ), { duration: 12_000 });
  }, [query.data, router, workspaceSlug]);

  const value = query.data;
  return value?.job && updateInProgress(value.job)
    ? <UpdateProgressOverlay connectionInterrupted={query.isError} installedVersion={value.installedVersion} job={value.job} />
    : null;
}

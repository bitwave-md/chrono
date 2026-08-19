"use client";

import { LoaderCircle, Server, WifiOff } from "lucide-react";

import type { UpdateJobRecord } from "@/modules/settings/domain/update-job";
import { UpdateProgressModel } from "@/modules/settings/domain/update-progress";

interface UpdateProgressOverlayProps {
  connectionInterrupted: boolean;
  installedVersion: string;
  job: UpdateJobRecord;
}

export function UpdateProgressOverlay({ connectionInterrupted, installedVersion, job }: UpdateProgressOverlayProps) {
  const model = new UpdateProgressModel(job, installedVersion);
  if (!model.running) return null;
  const activeStep = model.progressSteps.find((step) => step.state === "active");

  return (
    <div
      aria-describedby="chrono-update-progress-description"
      aria-labelledby="chrono-update-progress-title"
      aria-live="assertive"
      aria-modal="true"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#171719] text-white shadow-[0_28px_100px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-white/[0.06]">
            <Server className="size-4 text-white/80" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[-0.01em]" id="chrono-update-progress-title">Server update in progress</h2>
            <p className="mt-0.5 text-[0.68rem] text-white/45">Installing Chrono {job.targetVersion}</p>
          </div>
          <span className="ml-auto font-mono text-xs tabular-nums text-white/55">{model.percentage}%</span>
        </div>

        <div className="px-5 py-6 text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-amber-400" />
          <p className="mt-4 text-sm font-medium">{activeStep?.label ?? "Preparing update"}</p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/50" id="chrono-update-progress-description">
            {connectionInterrupted ? "Chrono is reconnecting. The update continues safely on the server." : model.summary}
          </p>

          <div
            aria-label={`Update ${model.percentage}% complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={model.percentage}
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${model.percentage}%` }} />
          </div>

          <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
            {model.progressSteps.map((step) => (
              <span
                className={`size-1.5 rounded-full ${step.state === "complete" ? "bg-emerald-400" : step.state === "active" ? "bg-amber-400" : "bg-white/15"}`}
                key={step.stage}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] bg-black/10 px-5 py-3 text-[0.68rem] text-white/40">
          {connectionInterrupted ? <WifiOff className="size-3.5" /> : null}
          <span>Please keep this page open and do not stop the server.</span>
        </div>
      </div>
    </div>
  );
}

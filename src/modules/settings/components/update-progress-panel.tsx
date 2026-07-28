import { Check, CheckCircle2, Circle, LoaderCircle, RotateCcw, TriangleAlert, WifiOff } from "lucide-react";

import { SettingsSection } from "@/modules/settings/components/settings-primitives";
import type { UpdateJobRecord } from "@/modules/settings/domain/update-job";
import { UpdateProgressModel, type UpdateProgressStep } from "@/modules/settings/domain/update-progress";

export function UpdateProgressPanel({ connectionInterrupted, installedVersion, job }: { connectionInterrupted: boolean; installedVersion: string; job: UpdateJobRecord }) {
  const model = new UpdateProgressModel(job, installedVersion);
  return (
    <SettingsSection title={model.headline} description={`Target version ${job.targetVersion}`}>
      <div aria-live="polite" className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <StatusIcon tone={model.tone} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">{model.running ? "Installation in progress" : model.finished ? "Installation complete" : "Installation stopped"}</p>
              <span className="text-xs tabular-nums text-muted-foreground">{model.percentage}%</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{model.summary}</p>
          </div>
        </div>
        <div aria-label={`Update ${model.percentage}% complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={model.percentage} className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar">
          <div className={`h-full rounded-full transition-[width] duration-500 ${model.tone === "danger" ? "bg-destructive" : model.tone === "success" ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${model.percentage}%` }} />
        </div>
        {connectionInterrupted && model.running ? <StatusNotice icon={<WifiOff />} text="Chrono is reconnecting. The update continues on the server." /> : null}
        {!connectionInterrupted && model.reconnectExpected ? <StatusNotice icon={<RotateCcw />} text="A brief reconnect is expected while Chrono switches versions." /> : null}
      </div>

      <div className="grid border-t sm:grid-cols-2">
        {model.progressSteps.map((step) => <Step key={step.stage} step={step} />)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[0.68rem] text-muted-foreground">
        <span>Requested {new Date(job.requestedAt).toLocaleString()}</span>
        <span>{job.completedAt ? `Finished ${new Date(job.completedAt).toLocaleString()}` : "Status refreshes automatically"}</span>
      </div>

      {model.technicalDetails ? <details className="border-t px-4 py-3 text-xs"><summary className="cursor-pointer font-medium text-muted-foreground">Technical details</summary><pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 font-mono text-[0.68rem] leading-5 text-muted-foreground">{model.technicalDetails}</pre></details> : null}
    </SettingsSection>
  );
}

function StatusIcon({ tone }: { tone: UpdateProgressModel["tone"] }) {
  const className = "mt-0.5 size-5 shrink-0";
  if (tone === "success") return <CheckCircle2 className={`${className} text-emerald-500`} />;
  if (tone === "danger") return <TriangleAlert className={`${className} text-destructive`} />;
  return <LoaderCircle className={`${className} animate-spin text-amber-400`} />;
}

function StatusNotice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{<span className="[&_svg]:size-3.5">{icon}</span>}<span>{text}</span></div>;
}

function Step({ step }: { step: UpdateProgressStep }) {
  return (
    <div className="flex min-h-16 items-start gap-3 border-b px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r">
      {step.state === "complete" ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> : step.state === "active" ? <LoaderCircle className="mt-0.5 size-3.5 shrink-0 animate-spin text-amber-400" /> : step.state === "failed" ? <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />}
      <div className="min-w-0"><p className={`text-xs font-medium ${step.state === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</p><p className="mt-0.5 text-[0.68rem] leading-4 text-muted-foreground">{step.description}</p></div>
    </div>
  );
}

"use client";

import { BriefcaseBusiness, Flame, Gauge, type LucideIcon, Users } from "lucide-react";

import { useCountUp, useEntered } from "@/modules/workspace-ui/application/use-count-up";
import { Reveal } from "@/modules/workspace-ui/components/report-reveal";
import type { aggregateClientTimeReport } from "@/modules/workspace-ui/domain/client-time-report";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";

type Report = ReturnType<typeof aggregateClientTimeReport>;

export function ClientTimeReportSummary({ report }: { report: Report }) {
  const activeDays = report.daily.filter((day) => day.seconds > 0);
  const busiest = activeDays.reduce<(typeof activeDays)[number] | null>((best, day) => (!best || day.seconds > best.seconds ? day : best), null);
  const averagePerDay = activeDays.length ? Math.round(report.totalSeconds / activeDays.length) : 0;
  const clientLevelEntries = report.projects.find((row) => row.id === "no-project")?.entryCount ?? 0;
  const projectCount = report.projects.filter((row) => row.id !== "no-project").length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Reveal>
        <TotalHero activeDays={activeDays.length} report={report} />
      </Reveal>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Reveal delay={80}>
          <StatTile detail={`across ${activeDays.length} active ${activeDays.length === 1 ? "day" : "days"}`} icon={Gauge} label="Daily average" tone="amber" value={formatLoggedDuration(averagePerDay)} />
        </Reveal>
        <Reveal delay={140}>
          <StatTile detail={busiest ? formatLoggedDuration(busiest.seconds) : "No activity"} icon={Flame} label="Busiest day" tone="rose" value={busiest?.label ?? "—"} />
        </Reveal>
        <Reveal delay={200}>
          <StatTile detail={clientLevelEntries ? `${clientLevelEntries} Client-level ${clientLevelEntries === 1 ? "entry" : "entries"}` : "No Client-level entries"} icon={BriefcaseBusiness} label="Projects" tone="violet" value={String(projectCount)} />
        </Reveal>
        <Reveal delay={260}>
          <StatTile detail={`${report.categories.length} time entry ${report.categories.length === 1 ? "type" : "types"}`} icon={Users} label="Contributors" tone="sky" value={String(report.contributors)} />
        </Reveal>
      </div>
    </div>
  );
}

function TotalHero({ activeDays, report }: { activeDays: number; report: Report }) {
  const animatedSeconds = useCountUp(report.totalSeconds);
  const entered = useEntered();
  const actualShare = report.totalSeconds ? report.billableSeconds / report.totalSeconds : 0;
  const billableShare = entered ? actualShare : 0;
  const nonBillableSeconds = report.totalSeconds - report.billableSeconds;
  const { hours, minutes } = splitDuration(animatedSeconds);

  return (
    <section className="relative isolate h-full overflow-hidden rounded-2xl border bg-card p-6 max-sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[var(--chart-2)]/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-10 -z-10 size-60 rounded-full bg-[var(--chart-3)]/10 blur-3xl" />
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full rounded-full bg-[var(--chart-2)] opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex size-2 rounded-full bg-[var(--chart-2)]" /></span>
            Total time
          </p>
          <p aria-label={formatLoggedDuration(report.totalSeconds)} className="mt-3 flex items-baseline gap-1.5 font-semibold tabular-nums tracking-tight">
            <span aria-hidden="true" className="text-6xl leading-none max-sm:text-5xl">{hours}</span>
            <span aria-hidden="true" className="text-xl font-medium text-muted-foreground">h</span>
            <span aria-hidden="true" className="ml-1.5 text-6xl leading-none max-sm:text-5xl">{String(minutes).padStart(2, "0")}</span>
            <span aria-hidden="true" className="text-xl font-medium text-muted-foreground">m</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {report.entryCount} {report.entryCount === 1 ? "entry" : "entries"} over {activeDays} active {activeDays === 1 ? "day" : "days"}
          </p>
        </div>
        <BillableRing label={actualShare} share={billableShare} />
      </div>
      <div className="mt-6">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(actualShare * 100)}% billable`}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[var(--chart-2)] transition-[width] duration-1000 ease-out" style={{ width: `${billableShare * 100}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500" />Billable <strong className="font-mono font-medium text-foreground tabular-nums">{formatLoggedDuration(report.billableSeconds)}</strong></span>
          <span className="flex items-center gap-1.5 text-muted-foreground">Non-billable <strong className="font-mono font-medium text-foreground tabular-nums">{nonBillableSeconds > 0 ? formatLoggedDuration(nonBillableSeconds) : "0m"}</strong><span className="size-2 rounded-full bg-muted-foreground/40" /></span>
        </div>
      </div>
    </section>
  );
}

function BillableRing({ share, label }: { share: number; label: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-24 shrink-0 place-items-center max-sm:size-20">
      <svg aria-hidden="true" className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="billable-ring" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="var(--chart-2)" /></linearGradient>
        </defs>
        <circle cx="40" cy="40" fill="none" r={radius} stroke="currentColor" strokeOpacity="0.1" strokeWidth="7" />
        <circle className="transition-[stroke-dashoffset] duration-1000 ease-out" cx="40" cy="40" fill="none" r={radius} stroke="url(#billable-ring)" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} strokeLinecap="round" strokeWidth="7" />
      </svg>
      <div className="text-center leading-none"><strong className="text-lg font-semibold tabular-nums">{Math.round(label * 100)}%</strong><span className="mt-1 block text-[0.6rem] uppercase tracking-wider text-muted-foreground max-sm:hidden">billable</span></div>
    </div>
  );
}

const tones = {
  amber: "bg-amber-500/15 text-amber-500",
  rose: "bg-rose-500/15 text-rose-500",
  violet: "bg-violet-500/15 text-violet-500",
  sky: "bg-sky-500/15 text-sky-500",
} as const;

function StatTile({ detail, icon: Icon, label, tone, value }: { detail: string; icon: LucideIcon; label: string; tone: keyof typeof tones; value: string }) {
  return (
    <div className="group h-full rounded-2xl border bg-card p-3.5 transition-all sm:p-4 duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5">
      <span className={`grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${tones[tone]}`}><Icon className="size-4" /></span>
      <p className="mt-3 text-xs text-muted-foreground sm:mt-4">{label}</p>
      <strong className="mt-0.5 block truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{value}</strong>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function splitDuration(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

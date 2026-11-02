"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEntered } from "@/modules/workspace-ui/application/use-count-up";
import { Reveal } from "@/modules/workspace-ui/components/report-reveal";
import type { TimeBreakdown } from "@/modules/workspace-ui/domain/client-time-report";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";

const trendConfig = {
  seconds: { label: "Logged time", color: "var(--chart-2)" },
} satisfies ChartConfig;

const rankPalette = ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6", "#84cc16", "#f97316"];

export function ClientTimeReportCharts({
  daily,
  categories,
  projects,
  workers,
  showProjects = true,
}: {
  daily: Array<{ date: string; label: string; seconds: number }>;
  categories: TimeBreakdown[];
  projects: TimeBreakdown[];
  workers?: TimeBreakdown[];
  showProjects?: boolean;
}) {
  const rankings = [
    ...(showProjects ? [{ rows: projects, title: "By project", caption: "Where the hours went" }] : []),
    ...(workers && workers.length > 1 ? [{ rows: workers, title: "By person", caption: "Who logged them" }] : []),
  ];
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.7fr)]">
        <Reveal delay={320}><DailyTrendCard daily={daily} /></Reveal>
        <Reveal delay={380}><CategoryDonutCard rows={categories} /></Reveal>
      </div>
      {rankings.length ? (
        <div className={rankings.length > 1 ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
          {rankings.map((ranking, index) => <Reveal delay={440 + index * 60} key={ranking.title}><RankedCard caption={ranking.caption} rows={ranking.rows} title={ranking.title} /></Reveal>)}
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({ caption, children, title, aside }: { caption?: string; children: React.ReactNode; title: string; aside?: React.ReactNode }) {
  return (
    <section className="h-full rounded-2xl border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div><h2 className="text-sm font-semibold">{title}</h2>{caption ? <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p> : null}</div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function DailyTrendCard({ daily }: { daily: Array<{ date: string; label: string; seconds: number }> }) {
  const activeDays = daily.filter((day) => day.seconds > 0);
  const average = activeDays.length ? activeDays.reduce((sum, day) => sum + day.seconds, 0) / activeDays.length : 0;
  const peak = Math.max(0, ...daily.map((day) => day.seconds));
  const weekends = weekendRuns(daily);

  return (
    <ChartCard
      aside={average ? <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] text-muted-foreground"><span className="h-px w-3.5 border-t border-dashed border-foreground/50" />avg {formatLoggedDuration(Math.round(average))} / active day</span> : null}
      caption="Hours logged each day"
      title="Time over period"
    >
      <ChartContainer className="aspect-auto h-72 w-full" config={trendConfig}>
        <BarChart accessibilityLayer data={daily} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="report-bar" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.35} /></linearGradient>
            <linearGradient id="report-bar-peak" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={1} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.6} /></linearGradient>
          </defs>
          {weekends.map((run) => <ReferenceArea fill="currentColor" fillOpacity={0.03} ifOverflow="visible" key={run.from} stroke="none" x1={run.from} x2={run.to} />)}
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={18} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} domain={[0, Math.max(peak, 1)]} hide />
          {average ? <ReferenceLine stroke="currentColor" strokeDasharray="4 4" strokeOpacity={0.35} y={average} /> : null}
          <ChartTooltip
            content={<ChartTooltipContent valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06, radius: 6 }}
          />
          <Bar animationDuration={900} animationEasing="ease-out" dataKey="seconds" maxBarSize={30} radius={[8, 8, 3, 3]}>
            {daily.map((day) => <Cell fill={day.seconds && day.seconds === peak ? "url(#report-bar-peak)" : "url(#report-bar)"} key={day.date} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function CategoryDonutCard({ rows }: { rows: TimeBreakdown[] }) {
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  const config = { seconds: { label: "Logged time", color: "var(--chart-2)" } } satisfies ChartConfig;
  const entered = useEntered();
  return (
    <ChartCard caption="Share of logged time" title="By time entry type">
      {rows.length ? (
        <div className="relative mx-auto h-44 w-full max-w-52">
          <ChartContainer className="aspect-auto size-full" config={config}>
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
              <Pie animationDuration={900} cornerRadius={5} data={rows} dataKey="seconds" innerRadius={56} nameKey="name" outerRadius={82} paddingAngle={3} stroke="none">
                {rows.map((row) => <Cell fill={row.color ?? "var(--chart-3)"} key={row.id} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div className={`transition-all duration-700 ${entered ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>
              <strong className="block text-xl font-semibold tabular-nums">{formatLoggedDuration(total)}</strong>
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{rows.length} {rows.length === 1 ? "type" : "types"}</span>
            </div>
          </div>
        </div>
      ) : null}
      <ul className="mt-4 grid gap-2.5">
        {rows.slice(0, 6).map((row) => (
          <li className="flex items-center gap-2.5 text-xs" key={row.id}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color ?? "var(--chart-3)" }} />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums">{total ? Math.round((row.seconds / total) * 100) : 0}%</span>
            <strong className="w-16 text-right font-mono font-medium tabular-nums">{formatLoggedDuration(row.seconds)}</strong>
          </li>
        ))}
        {!rows.length ? <li className="text-xs text-muted-foreground">No time recorded in this period.</li> : null}
      </ul>
    </ChartCard>
  );
}

function RankedCard({ caption, rows, title }: { caption: string; rows: TimeBreakdown[]; title: string }) {
  const entered = useEntered();
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  const maximum = rows[0]?.seconds || 1;
  return (
    <ChartCard caption={caption} title={title}>
      <ol className="grid gap-4">
        {rows.slice(0, 8).map((row, index) => {
          const color = row.color ?? rankPalette[index % rankPalette.length];
          return (
            <li className="grid gap-1.5" key={row.id}>
              <div className="flex items-center gap-2.5 text-xs">
                <span className="grid size-5 shrink-0 place-items-center rounded-md text-[0.65rem] font-semibold tabular-nums" style={{ backgroundColor: `${color}22`, color }}>{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                <span className="text-muted-foreground tabular-nums">{total ? Math.round((row.seconds / total) * 100) : 0}%</span>
                <strong className="w-16 text-right font-mono font-medium tabular-nums">{formatLoggedDuration(row.seconds)}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{ width: entered ? `${Math.max(3, (row.seconds / maximum) * 100)}%` : "0%", backgroundImage: `linear-gradient(90deg, ${color}, ${color}aa)`, transitionDelay: `${index * 70}ms` }}
                />
              </div>
            </li>
          );
        })}
        {!rows.length ? <li className="text-xs text-muted-foreground">No time recorded in this period.</li> : null}
      </ol>
    </ChartCard>
  );
}

/** Consecutive Saturday/Sunday labels, used to shade weekends on the trend chart. */
function weekendRuns(daily: Array<{ date: string; label: string }>): Array<{ from: string; to: string }> {
  const runs: Array<{ from: string; to: string }> = [];
  let open: { from: string; to: string } | null = null;
  for (const day of daily) {
    const weekday = new Date(`${day.date}T12:00:00`).getDay();
    if (weekday === 0 || weekday === 6) {
      if (open) open.to = day.label;
      else { open = { from: day.label, to: day.label }; runs.push(open); }
    } else {
      open = null;
    }
  }
  return runs;
}

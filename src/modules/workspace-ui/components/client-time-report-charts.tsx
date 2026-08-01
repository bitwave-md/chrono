"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TimeBreakdown } from "@/modules/workspace-ui/domain/client-time-report";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";

const trendConfig = {
  seconds: { label: "Logged time", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ClientTimeReportCharts({
  daily,
  categories,
  projects,
}: {
  daily: Array<{ date: string; label: string; seconds: number }>;
  categories: TimeBreakdown[];
  projects: TimeBreakdown[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Time over period</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto px-3 pb-4">
          <ChartContainer className="h-72 w-full" config={trendConfig} style={{ minWidth: Math.max(720, daily.length * 54) }}>
            <BarChart accessibilityLayer data={daily.map((row) => ({ ...row, axisLabel: `${row.label}|${compactDuration(row.seconds)}` }))} margin={{ top: 12, right: 12, bottom: 22, left: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="axisLabel" interval={0} tick={<DailyAxisTick />} tickLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
              <Bar dataKey="seconds" fill="var(--color-seconds)" maxBarSize={28} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <CategoryPieCard rows={categories} />
      <div className="xl:col-span-2"><BreakdownCard columns rows={projects} title="By project" /></div>
    </div>
  );
}

function CategoryPieCard({ rows }: { rows: TimeBreakdown[] }) {
  const total = rows.reduce((sum, row) => sum + row.seconds, 0);
  const config = { seconds: { label: "Logged time", color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">By time entry type</CardTitle></CardHeader>
      <CardContent className="grid gap-3 pb-4">
        {rows.length ? <ChartContainer className="mx-auto h-44 w-full max-w-52" config={config}>
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
            <Pie data={rows} dataKey="seconds" innerRadius={45} nameKey="name" outerRadius={72} paddingAngle={2} strokeWidth={0}>
              {rows.map((row) => <Cell fill={row.color ?? "var(--chart-3)"} key={row.id} />)}
            </Pie>
          </PieChart>
        </ChartContainer> : null}
        <div className="grid gap-2">
          {rows.slice(0, 7).map((row) => <div className="flex items-center gap-2 text-xs" key={row.id}><span className="size-2 rounded-full" style={{ backgroundColor: row.color ?? "var(--chart-3)" }} /><span className="min-w-0 flex-1 truncate text-muted-foreground">{row.name}</span><span className="text-muted-foreground tabular-nums">{total ? Math.round((row.seconds / total) * 100) : 0}%</span><strong className="font-mono font-medium tabular-nums">{formatLoggedDuration(row.seconds)}</strong></div>)}
          {!rows.length ? <p className="text-xs text-muted-foreground">No time recorded in this period.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyAxisTick({ payload, x = 0, y = 0 }: { payload?: { value?: string }; x?: number; y?: number }) {
  const [date = "", duration = ""] = String(payload?.value ?? "").split("|");
  return <g transform={`translate(${x},${y})`}><text fill="currentColor" textAnchor="middle" x={0} y={0}><tspan className="fill-muted-foreground text-[9px]" x={0} dy={12}>{date}</tspan><tspan className="fill-foreground text-[9px] font-medium" x={0} dy={13}>{duration}</tspan></text></g>;
}

function compactDuration(seconds: number): string {
  if (!seconds) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h${minutes ? ` ${minutes}m` : ""}` : `${minutes}m`;
}

function BreakdownCard({
  columns = false,
  rows,
  title,
}: {
  columns?: boolean;
  rows: TimeBreakdown[];
  title: string;
}) {
  const maximum = rows[0]?.seconds ?? 1;
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className={columns ? "grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
        {rows.slice(0, columns ? 9 : 6).map((row) => (
          <div className="grid gap-1.5" key={row.id}>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color ?? "var(--chart-3)" }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.name}</span>
              <strong className="font-mono font-medium tabular-nums">{formatLoggedDuration(row.seconds)}</strong>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/65" style={{ width: `${Math.max(2, (row.seconds / maximum) * 100)}%` }} /></div>
          </div>
        ))}
        {!rows.length ? <p className="text-xs text-muted-foreground">No time recorded in this period.</p> : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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
        <CardContent className="px-3 pb-4">
          <ChartContainer className="h-64 w-full" config={trendConfig}>
            <AreaChart accessibilityLayer data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
              <defs>
                <linearGradient id="clientTimeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-seconds)" stopOpacity={0.72} />
                  <stop offset="95%" stopColor="var(--color-seconds)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis axisLine={false} dataKey="label" minTickGap={28} tickLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
              <Area dataKey="seconds" fill="url(#clientTimeGradient)" fillOpacity={0.5} stroke="var(--color-seconds)" strokeWidth={1.8} type="monotone" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <BreakdownCard rows={categories} title="By time entry type" />
      <div className="xl:col-span-2"><BreakdownCard columns rows={projects} title="By project" /></div>
    </div>
  );
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

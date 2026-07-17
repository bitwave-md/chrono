"use client";

import {
  Area,
  AreaChart,
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
} from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  dailyCumulativeTime,
  formatLoggedDuration,
  timeByCategory,
  totalLoggedSeconds,
} from "@/modules/workspace-ui/domain/issue-time-summary";
import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

const historyConfig = {
  seconds: { label: "Total time", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function IssueTimeCharts({ logs }: { logs: TimeLogRecord[] }) {
  const total = totalLoggedSeconds(logs);
  const history = dailyCumulativeTime(logs);
  const slices = timeByCategory(logs);

  return (
    <section className="mt-8 border-t pt-5">
      <h2 className="text-xs font-medium text-muted-foreground">Time insights</h2>
      {!logs.length ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Logged time will appear here.</p>
      ) : (
        <div className="mt-4 grid gap-6">
          <div>
            <div className="mb-2 flex items-baseline justify-between"><span className="text-xs text-muted-foreground">Total over time</span><strong className="text-sm">{formatLoggedDuration(total)}</strong></div>
            <ChartContainer className="h-28 w-full" config={historyConfig}>
              <AreaChart accessibilityLayer data={history} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
                <defs>
                  <linearGradient id="issueTimeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-seconds)" stopOpacity={0.72} />
                    <stop offset="95%" stopColor="var(--color-seconds)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis axisLine={false} dataKey="label" minTickGap={24} tickLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
                <Area dataKey="seconds" fill="url(#issueTimeGradient)" fillOpacity={0.5} stroke="var(--color-seconds)" strokeWidth={1.75} type="natural" />
              </AreaChart>
            </ChartContainer>
          </div>
          <TypeDistribution slices={slices} total={total} />
        </div>
      )}
    </section>
  );
}

function TypeDistribution({
  slices,
  total,
}: {
  slices: ReturnType<typeof timeByCategory>;
  total: number;
}) {
  const config = Object.fromEntries(slices.map((slice, index) => [
    `type${index}`,
    { label: slice.name, color: slice.color },
  ])) satisfies ChartConfig;
  const data = [Object.fromEntries([
    ["name", "Time"],
    ...slices.map((slice, index) => [`type${index}`, slice.seconds]),
  ])];

  return (
    <div>
      <span className="text-xs text-muted-foreground">Time entry types</span>
      <ChartContainer className="mx-auto mt-1 aspect-square h-44" config={config}>
        <RadialBarChart data={data} endAngle={-270} innerRadius={58} outerRadius={82} startAngle={90}>
          <PolarAngleAxis domain={[0, total]} tick={false} type="number" />
          {slices.map((_slice, index) => (
            <RadialBar
              className="stroke-background stroke-2"
              cornerRadius={4}
              dataKey={`type${index}`}
              fill={`var(--color-type${index})`}
              key={`type${index}`}
              stackId="time"
            />
          ))}
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel valueFormatter={(value) => formatLoggedDuration(Number(value ?? 0))} />} />
          <PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                return (
                  <text textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                    <tspan className="fill-foreground text-lg font-semibold" x={viewBox.cx} y={(viewBox.cy ?? 0) - 3}>{formatLoggedDuration(total)}</tspan>
                    <tspan className="fill-muted-foreground text-[10px]" x={viewBox.cx} y={(viewBox.cy ?? 0) + 15}>total logged</tspan>
                  </text>
                );
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
      <div className="grid gap-1.5">
        {slices.slice(0, 5).map((slice) => (
          <div className="flex items-center gap-2 text-xs" key={slice.id}>
            <span className="size-2 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.name}</span>
            <span className="font-mono tabular-nums">{formatLoggedDuration(slice.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

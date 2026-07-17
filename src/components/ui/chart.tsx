"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within ChartContainer");
  return context;
}

function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const variables = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        style={{ ...variables, ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

interface TooltipPayloadItem {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number | readonly (string | number)[];
}

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  className,
  valueFormatter,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  className?: string;
  valueFormatter?: (value: TooltipPayloadItem["value"]) => React.ReactNode;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className={cn("grid min-w-32 gap-1.5 rounded-md border bg-background px-2.5 py-2 text-xs shadow-xl", className)}>
      {!hideLabel && label ? <div className="font-medium">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          return (
            <div className="flex items-center gap-2" key={key}>
              <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color ?? config[key]?.color }} />
              <span className="flex-1 text-muted-foreground">{config[key]?.label ?? item.name ?? key}</span>
              <span className="font-mono font-medium tabular-nums">{valueFormatter ? valueFormatter(item.value) : String(item.value ?? "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };

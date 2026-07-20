import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ToastSurface({
  action,
  children,
  className,
  indicator,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  indicator: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex min-h-20 w-[min(32rem,calc(100vw-2rem))] items-center gap-4 rounded-[1.35rem] border border-white/10 bg-[#161618] px-4 py-3 text-foreground shadow-[0_18px_60px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.055]">
        {indicator}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  );
}

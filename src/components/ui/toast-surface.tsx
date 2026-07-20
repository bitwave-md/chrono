import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
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
    <Card
      className={cn(
        "grid w-96 max-w-[calc(100vw-1rem)] grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-xl",
        className,
      )}
    >
      <span className="grid w-2.5 shrink-0 place-items-center">{indicator}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </Card>
  );
}

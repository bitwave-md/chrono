import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyView({
  action,
  className,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className={cn("grid min-h-[calc(100svh-190px)] place-content-center justify-items-center px-5 text-center", className)}>
      <Icon className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

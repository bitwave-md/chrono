import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProjectTab = "overview" | "activity" | "issues" | "members";

export function ProjectTabs({
  workspaceSlug,
  projectId,
  tab,
  actions,
}: {
  workspaceSlug: string;
  projectId: string;
  tab: ProjectTab;
  actions?: ReactNode;
}) {
  return (
    <nav className="flex h-12 items-center gap-1 px-3">
      {(["overview", "activity", "issues", "members"] as const).map((item) => (
        <Button
          asChild
          className={cn(
            "rounded-full bg-secondary/35 capitalize text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            tab === item && "bg-secondary text-secondary-foreground",
          )}
          key={item}
          size="sm"
          variant="secondary"
        >
          <Link href={`/app/${workspaceSlug}/projects/${projectId}/${item}`}>{item}</Link>
        </Button>
      ))}
      {actions ? <div className="ml-auto min-w-0">{actions}</div> : null}
    </nav>
  );
}

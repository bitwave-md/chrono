import { ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface RouteHeaderProps {
  breadcrumbs?: string[];
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function RouteHeader({ breadcrumbs = [], title, description, actions }: RouteHeaderProps) {
  return (
    <header className="border-b">
      <div className="flex h-12 items-center gap-2 px-4">
        <SidebarTrigger />
        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((item) => (
            <span className="contents" key={item}><span className="max-w-40 truncate">{item}</span><ChevronRight className="size-3" /></span>
          ))}
          <span className="truncate text-foreground">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button aria-label="Search" size="icon-sm" variant="ghost"><Search /></Button>
          {actions}
        </div>
      </div>
      {description ? (
        <div className="px-5 pb-4 pt-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}
    </header>
  );
}

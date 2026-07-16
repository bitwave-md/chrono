"use client";

import { MoreHorizontal, Plus, Star } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export type ClientTab = "overview" | "issues" | "projects" | "members";

export function ClientHeader({
  client,
  workspaceSlug,
  tab,
  onPrimaryAction,
}: {
  client: ClientRecord;
  workspaceSlug: string;
  tab: ClientTab;
  onPrimaryAction?: () => void;
}) {
  const root = `/app/${workspaceSlug}/clients/${client.id}`;
  const actionLabel = tab === "overview"
    ? "Add resource"
    : tab === "issues"
      ? "New issue"
      : tab === "members" && client.canManage
        ? "Add member"
        : null;

  return (
    <header className="border-b">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <ClientIcon className="size-6" client={client} iconClassName={client.iconType === "emoji" ? "text-xs" : "size-3.5"} />
        <span className="truncate text-sm font-medium">{client.name}</span>
        <Button aria-label="Favorite Client" size="icon-sm" variant="ghost"><Star /></Button>
        <Button aria-label="Client actions" size="icon-sm" variant="ghost"><MoreHorizontal /></Button>
      </div>
      <div className="flex h-12 items-center gap-1 px-3">
        {(["overview", "issues", "projects", "members"] as const).map((item) => (
          <Button asChild className={cn("rounded-full bg-secondary/35 capitalize text-muted-foreground hover:bg-secondary/70 hover:text-foreground", tab === item && "bg-secondary text-secondary-foreground")} key={item} size="sm" variant="secondary">
            <Link href={`${root}/${item}`}>{item}</Link>
          </Button>
        ))}
        {actionLabel && onPrimaryAction ? (
          <Button className="ml-auto rounded-full" size="sm" variant="secondary" onClick={onPrimaryAction}>
            <Plus />{actionLabel}
          </Button>
        ) : null}
      </div>
    </header>
  );
}

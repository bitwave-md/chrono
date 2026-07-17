"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { EntityHeader } from "@/modules/workspace-ui/components/entity-header";
import { favoriteFromClient } from "@/modules/workspace-ui/domain/favorite-target";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export type ClientTab = "overview" | "issues" | "projects" | "time" | "members";

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
    <EntityHeader
      allowDelete={client.canManage}
      favoriteTarget={favoriteFromClient(client)}
      icon={<ClientIcon className="size-6" client={client} iconClassName={client.iconType === "emoji" ? "text-xs" : "size-3.5"} />}
      title={client.name}
      workspaceSlug={workspaceSlug}
    >
      <div className="flex h-12 items-center gap-1 overflow-x-auto px-3">
        {(["overview", "issues", "projects", "time", "members"] as const).map((item) => (
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
    </EntityHeader>
  );
}

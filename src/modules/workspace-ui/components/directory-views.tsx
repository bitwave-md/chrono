"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useClientsQuery, useProjectsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { ProjectDirectoryTable } from "@/modules/workspace-ui/components/project-directory-table";
import { RouteHeader } from "@/modules/workspace-ui/components/route-header";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function ClientDirectoryView({ workspaceSlug }: { workspaceSlug: string }) {
  const clientsQuery = useClientsQuery(workspaceSlug);
  return (
    <>
      <RouteHeader description="Organizations and customers managed by this Workspace." title="Clients" />
      <div className="divide-y border-y">
        {(clientsQuery.data ?? []).map((client) => (
          <Link className="flex min-h-14 items-center gap-3 px-5 hover:bg-accent" href={`/app/${workspaceSlug}/clients/${client.id}/overview`} key={client.id}>
            <ClientIcon className="size-8" client={client} iconClassName={client.iconType === "emoji" ? "text-base" : "size-4"} />
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{client.name}</strong><span className="block truncate text-xs text-muted-foreground">{client.description ?? `${client.issuePrefix} issue namespace`}</span></span>
            <Badge variant="outline">{client.key}</Badge><ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </>
  );
}

export function ProjectDirectoryView({ workspaceSlug, client, embedded = false }: { workspaceSlug: string; client?: ClientRecord; embedded?: boolean }) {
  const projectsQuery = useProjectsQuery(workspaceSlug, client?.id ?? null);
  return (
    <>
      {!embedded ? <RouteHeader breadcrumbs={client ? [
        { label: "Clients", href: `/app/${workspaceSlug}/clients` },
        { label: client.name, href: `/app/${workspaceSlug}/clients/${client.id}/overview` },
      ] : undefined} title="Projects" /> : null}
      <div className="border-b px-5 py-3">
        <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-sm font-medium">All projects</span>
      </div>
      <ProjectDirectoryTable projects={projectsQuery.data ?? []} showClient={!client} workspaceSlug={workspaceSlug} />
    </>
  );
}

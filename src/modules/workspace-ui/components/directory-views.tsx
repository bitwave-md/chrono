"use client";

import { Building2, ChevronRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientsQuery, useProjectsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { CreateProjectDialog } from "@/modules/workspace-ui/components/create-project-dialog";
import { EmptyView } from "@/modules/workspace-ui/components/empty-view";
import { ProjectDirectoryTable } from "@/modules/workspace-ui/components/project-directory-table";
import { RouteHeader } from "@/modules/workspace-ui/components/route-header";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function ClientDirectoryView({ workspaceSlug }: { workspaceSlug: string }) {
  const clientsQuery = useClientsQuery(workspaceSlug);
  const clients = clientsQuery.data ?? [];
  return (
    <>
      <RouteHeader description="Organizations and customers managed by this Workspace." title="Clients" />
      {clientsQuery.isLoading ? <DirectoryLoading label="Loading Clients..." /> : null}
      {clientsQuery.error ? <DirectoryError message={clientsQuery.error.message} /> : null}
      {!clientsQuery.isLoading && !clientsQuery.error && !clients.length ? (
        <EmptyView description="Create a Client to organize Projects, Issues, and tracked time." icon={Building2} title="No Clients yet" />
      ) : null}
      {clients.length ? <div className="divide-y border-y">
        {clients.map((client) => (
          <Link className="flex min-h-14 items-center gap-3 px-5 hover:bg-accent" href={`/app/${workspaceSlug}/clients/${client.id}/overview`} key={client.id}>
            <ClientIcon className="size-8" client={client} iconClassName={client.iconType === "emoji" ? "text-base" : "size-4"} />
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{client.name}</strong><span className="block truncate text-xs text-muted-foreground">{client.description ?? `${client.issuePrefix} issue namespace`}</span></span>
            <Badge variant="outline">{client.key}</Badge><ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div> : null}
    </>
  );
}

export function ProjectDirectoryView({ workspaceSlug, client, embedded = false }: { workspaceSlug: string; client?: ClientRecord; embedded?: boolean }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const projectsQuery = useProjectsQuery(workspaceSlug, client?.id ?? null);
  const clientsQuery = useClientsQuery(workspaceSlug);
  const projects = projectsQuery.data ?? [];
  const editableClients = client
    ? client.canEdit ? [client] : []
    : (clientsQuery.data ?? []).filter((candidate) => candidate.canEdit);
  const canCreate = editableClients.length > 0;
  const createButton = canCreate ? (
    <Button className="rounded-full" size="sm" onClick={() => setCreateOpen(true)}><Plus />New Project</Button>
  ) : null;
  return (
    <>
      {!embedded ? <RouteHeader breadcrumbs={client ? [
        { label: "Clients", href: `/app/${workspaceSlug}/clients` },
        { label: client.name, href: `/app/${workspaceSlug}/clients/${client.id}/overview` },
      ] : undefined} title="Projects" /> : null}
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-sm font-medium">All projects</span>
        {projects.length ? createButton : null}
      </div>
      {projectsQuery.isLoading ? <DirectoryLoading label="Loading Projects..." /> : null}
      {projectsQuery.error ? <DirectoryError message={projectsQuery.error.message} /> : null}
      {!projectsQuery.isLoading && !projectsQuery.error && !projects.length ? (
        <EmptyView
          action={createButton}
          className={embedded ? "min-h-[calc(100svh-205px)]" : undefined}
          description={client ? `Create a Project to start organizing work for ${client.name}.` : "Create a Project inside a Client to start organizing work."}
          icon={FolderKanban}
          title="No Projects in this view"
        />
      ) : null}
      {projects.length ? <ProjectDirectoryTable projects={projects} showClient={!client} workspaceSlug={workspaceSlug} /> : null}
      {createOpen ? (
        <CreateProjectDialog
          clients={editableClients}
          initialClientId={client?.id ?? null}
          open
          workspaceSlug={workspaceSlug}
          onCreated={(projectId) => router.push(`/app/${workspaceSlug}/projects/${projectId}/overview`)}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </>
  );
}

function DirectoryLoading({ label }: { label: string }) {
  return <div className="p-6 text-sm text-muted-foreground">{label}</div>;
}

function DirectoryError({ message }: { message: string }) {
  return <div className="p-6 text-sm text-destructive">{message}</div>;
}

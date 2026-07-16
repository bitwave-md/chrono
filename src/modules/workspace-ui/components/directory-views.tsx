"use client";

import { Building2, ChevronRight, FolderKanban, ListTodo } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useIssuesQuery } from "@/modules/workspace-ui/application/use-issue-queries";
import { useClientsQuery, useProjectsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
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
          <Link className="flex min-h-14 items-center gap-3 px-5 hover:bg-accent" href={`/app/${workspaceSlug}/clients/${client.id}/home`} key={client.id}>
            <span className="grid size-8 place-items-center rounded-md bg-muted"><Building2 className="size-4" /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{client.name}</strong><span className="block truncate text-xs text-muted-foreground">{client.description ?? `${client.issuePrefix} issue namespace`}</span></span>
            <Badge variant="outline">{client.key}</Badge><ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </>
  );
}

export function ProjectDirectoryView({ workspaceSlug, client }: { workspaceSlug: string; client?: ClientRecord }) {
  const projectsQuery = useProjectsQuery(workspaceSlug, client?.id ?? null);
  return (
    <>
      <RouteHeader breadcrumbs={client ? [
        { label: "Clients", href: `/app/${workspaceSlug}/clients` },
        { label: client.name, href: `/app/${workspaceSlug}/clients/${client.id}/home` },
      ] : undefined} title="Projects" />
      <div className="border-b px-5 py-3">
        <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-sm font-medium">All projects</span>
      </div>
      <ProjectDirectoryTable projects={projectsQuery.data ?? []} showClient={!client} workspaceSlug={workspaceSlug} />
    </>
  );
}

export function ClientHomeView({ workspaceSlug, client }: { workspaceSlug: string; client: ClientRecord }) {
  const projectsQuery = useProjectsQuery(workspaceSlug, client.id);
  const issuesQuery = useIssuesQuery(workspaceSlug, client.id, {});
  const openIssues = (issuesQuery.data ?? []).filter((issue) => issue.statusName !== "Done").length;
  return (
    <>
      <RouteHeader breadcrumbs={[
        { label: "Clients", href: `/app/${workspaceSlug}/clients` },
        { label: client.name, href: `/app/${workspaceSlug}/clients/${client.id}/home` },
      ]} description={client.description ?? `Client workspace using the ${client.issuePrefix} issue namespace.`} title="Home" />
      <div className="grid max-w-5xl grid-cols-3 divide-x border-b max-md:grid-cols-1 max-md:divide-x-0 max-md:divide-y">
        <Metric icon={FolderKanban} label="Projects" value={projectsQuery.data?.length ?? 0} />
        <Metric icon={ListTodo} label="Issues" value={issuesQuery.data?.length ?? 0} />
        <Metric icon={ListTodo} label="Open issues" value={openIssues} />
      </div>
      <section className="max-w-3xl px-5 py-8"><h2 className="text-sm font-medium">About {client.name}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{client.description ?? "No client description has been added yet."}</p></section>
    </>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FolderKanban; label: string; value: number }) {
  return <div className="flex min-h-24 items-center gap-3 px-5"><Icon className="size-4 text-muted-foreground" /><div><strong className="block text-xl tabular-nums">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div></div>;
}

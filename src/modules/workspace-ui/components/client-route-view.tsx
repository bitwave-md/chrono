"use client";

import { useClientsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientHomeView, ProjectDirectoryView } from "@/modules/workspace-ui/components/directory-views";
import { IssueCollectionView } from "@/modules/workspace-ui/components/issue-collection-view";

export function ClientRouteView({ workspaceSlug, clientId, view }: { workspaceSlug: string; clientId: string; view: "home" | "issues" | "projects" }) {
  const clientsQuery = useClientsQuery(workspaceSlug);
  const client = clientsQuery.data?.find((candidate) => candidate.id === clientId);
  if (clientsQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading client...</div>;
  if (!client) return <div className="p-6 text-sm text-destructive">Client not found.</div>;
  if (view === "home") return <ClientHomeView client={client} workspaceSlug={workspaceSlug} />;
  if (view === "projects") return <ProjectDirectoryView client={client} workspaceSlug={workspaceSlug} />;
  return <IssueCollectionView breadcrumbs={[
    { label: "Clients", href: `/app/${workspaceSlug}/clients` },
    { label: client.name, href: `/app/${workspaceSlug}/clients/${client.id}/home` },
  ]} clientId={client.id} description={`All visible issues for ${client.name}.`} title="Issues" workspaceSlug={workspaceSlug} />;
}

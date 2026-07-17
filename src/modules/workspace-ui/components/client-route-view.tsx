"use client";

import { useState } from "react";

import { useClientsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientHeader, type ClientTab } from "@/modules/workspace-ui/components/client-header";
import { ClientMembersView } from "@/modules/workspace-ui/components/client-members-view";
import { ClientOverviewView } from "@/modules/workspace-ui/components/client-overview-view";
import { ClientTimeReportView } from "@/modules/workspace-ui/components/client-time-report-view";
import { ProjectDirectoryView } from "@/modules/workspace-ui/components/directory-views";
import { IssueCollectionView } from "@/modules/workspace-ui/components/issue-collection-view";
import { useWorkspaceOverlay } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function ClientRouteView({
  workspaceSlug,
  clientId,
  view,
}: {
  workspaceSlug: string;
  clientId: string;
  view: ClientTab;
}) {
  const clientsQuery = useClientsQuery(workspaceSlug);
  const client = clientsQuery.data?.find((candidate) => candidate.id === clientId);
  const openCreateIssue = useWorkspaceOverlay((state) => state.openCreateIssue);
  const [resourceCreatorOpen, setResourceCreatorOpen] = useState(false);
  const [memberCreatorOpen, setMemberCreatorOpen] = useState(false);

  if (clientsQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading Client...</div>;
  if (!client) return <div className="p-6 text-sm text-destructive">Client not found.</div>;

  const primaryAction = view === "overview"
    ? () => setResourceCreatorOpen(true)
    : view === "issues"
      ? openCreateIssue
      : view === "members" && client.canManage
        ? () => setMemberCreatorOpen(true)
        : undefined;

  return (
    <>
      <ClientHeader
        client={client}
        tab={view}
        workspaceSlug={workspaceSlug}
        onPrimaryAction={primaryAction}
      />
      {view === "overview" ? (
        <ClientOverviewView
          client={client}
          resourceCreatorOpen={resourceCreatorOpen}
          workspaceSlug={workspaceSlug}
          onResourceCreatorOpenChange={setResourceCreatorOpen}
        />
      ) : null}
      {view === "issues" ? (
        <IssueCollectionView
          clientId={client.id}
          description={`All visible Issues for ${client.name}.`}
          embedded
          title="Issues"
          workspaceSlug={workspaceSlug}
        />
      ) : null}
      {view === "projects" ? (
        <ProjectDirectoryView client={client} embedded workspaceSlug={workspaceSlug} />
      ) : null}
      {view === "time" ? (
        <ClientTimeReportView client={client} workspaceSlug={workspaceSlug} />
      ) : null}
      {view === "members" ? (
        <ClientMembersView
          client={client}
          memberCreatorOpen={memberCreatorOpen}
          workspaceSlug={workspaceSlug}
          onMemberCreatorOpenChange={setMemberCreatorOpen}
        />
      ) : null}
    </>
  );
}

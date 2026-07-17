"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useIssuesQuery } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { IssueList } from "@/modules/workspace-ui/components/issue-list";
import { ProjectTabs } from "@/modules/workspace-ui/components/project-tabs";
import type { ProjectDetailRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceView } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function ProjectIssuesView({
  project,
  workspaceSlug,
}: {
  project: ProjectDetailRecord;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const parameters = useSearchParams();
  const branchScope = parameters.get("branch");
  const isAll = branchScope === "all";
  const branchesQuery = useProjectBranchesQuery(workspaceSlug, project.id);
  const branches = branchesQuery.data ?? [];
  const selectedBranch = branchScope && !isAll
    ? branches.find((branch) => branch.id === branchScope) ?? null
    : null;
  const selectedBranchId = selectedBranch?.id ?? null;
  const selectedScope = isAll ? "all" : selectedBranchId ?? "main";
  const statusesQuery = useWorkflowStatusesQuery(workspaceSlug, project.workflowId);
  const membersQuery = useMembersQuery(workspaceSlug);
  const projectsQuery = useProjectsQuery(workspaceSlug, project.clientId);
  const focusedIssueId = useWorkspaceView((state) => state.focusedIssueId);
  const focusIssue = useWorkspaceView((state) => state.focusIssue);
  const [createTarget, setCreateTarget] = useState<{ statusId: string | null } | null>(null);
  const filters = {
    projectId: project.id,
    ...(isAll ? {} : selectedBranchId ? { branchId: selectedBranchId } : { mainBranch: true }),
  };
  const issuesQuery = useIssuesQuery(workspaceSlug, project.clientId, filters);
  const issues = issuesQuery.data ?? [];

  useEffect(() => {
    if (
      branchesQuery.isSuccess &&
      branchScope &&
      branchScope !== "all" &&
      !selectedBranch
    ) {
      router.replace(pathname, { scroll: false });
    }
  }, [branchScope, branchesQuery.isSuccess, pathname, router, selectedBranch]);

  const selectBranch = (value: string) => {
    router.replace(
      value === "main" ? pathname : `${pathname}?branch=${encodeURIComponent(value)}`,
      { scroll: false },
    );
  };

  return (
    <>
      <ProjectTabs
        projectId={project.id}
        tab="issues"
        workspaceSlug={workspaceSlug}
        actions={(
          <Select value={selectedScope} onValueChange={selectBranch}>
            <SelectTrigger aria-label="Branch scope" className="h-8 w-auto min-w-28 max-w-48 rounded-full border-0 bg-secondary/35 px-2.5 text-xs shadow-none hover:bg-secondary/70 [&>svg:last-child]:size-3.5" size="sm">
              <GitBranch className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <div className="pb-4">
        {issuesQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading issues...</div>
        ) : issuesQuery.error ? (
          <div className="p-6 text-sm text-destructive">{issuesQuery.error.message}</div>
        ) : (
          <IssueList
            clientId={project.clientId}
            filters={filters}
            focusedIssueId={focusedIssueId}
            issues={issues}
            statuses={statusesQuery.data ?? []}
            workspaceSlug={workspaceSlug}
            onCreateEmpty={() => setCreateTarget({
              statusId: statusesQuery.data?.find((status) => status.isDefault)?.id ?? null,
            })}
            onCreateInGroup={(group) => setCreateTarget({
              statusId: group.key === "backlog"
                ? statusesQuery.data?.find((status) => status.isDefault)?.id ?? null
                : group.key,
            })}
            onFocus={focusIssue}
            onOpen={(issueId) => router.push(`/app/${workspaceSlug}/projects/${project.id}/issues/${issueId}`)}
          />
        )}
        {createTarget ? (
          <CreateIssueDialog
            branches={branches}
            clientId={project.clientId}
            filters={filters}
            initialStatusId={createTarget.statusId}
            members={membersQuery.data ?? []}
            open
            projects={projectsQuery.data ?? []}
            selectedBranchId={selectedBranchId}
            selectedProjectId={project.id}
            workspaceSlug={workspaceSlug}
            onOpenChange={(open) => {
              if (!open) setCreateTarget(null);
            }}
          />
        ) : null}
      </div>
    </>
  );
}

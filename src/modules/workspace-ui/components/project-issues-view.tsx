"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useIssuesQuery } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { IssueList } from "@/modules/workspace-ui/components/issue-list";
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
  const [creating, setCreating] = useState(false);
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
    <div className="py-4">
      <div className="flex items-center gap-2 border-b px-5 pb-3">
        <Select value={selectedScope} onValueChange={selectBranch}>
          <SelectTrigger aria-label="Branch scope" className="w-52" size="sm">
            <GitBranch className="size-4" />
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
        <Button className="ml-auto shrink-0" size="sm" onClick={() => setCreating(true)}><Plus />New issue</Button>
      </div>
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
          onFocus={focusIssue}
          onOpen={(issueId) => router.push(`/app/${workspaceSlug}/projects/${project.id}/issues/${issueId}`)}
        />
      )}
      {creating ? (
        <CreateIssueDialog
          branches={branches}
          clientId={project.clientId}
          filters={filters}
          members={membersQuery.data ?? []}
          open
          projects={projectsQuery.data ?? []}
          selectedBranchId={selectedBranchId}
          selectedProjectId={project.id}
          workspaceSlug={workspaceSlug}
          onOpenChange={setCreating}
        />
      ) : null}
    </div>
  );
}

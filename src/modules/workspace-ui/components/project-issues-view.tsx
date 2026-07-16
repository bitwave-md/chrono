"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useIssuesQuery } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import type { IssueRecord, ProjectDetailRecord } from "@/modules/workspace-ui/domain/workspace-types";

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
      {(statusesQuery.data ?? []).map((status) => {
        const items = issues.filter((issue) => issue.statusId === status.id);
        return <IssueGroup color={status.color} issues={items} key={status.id} name={status.name} onOpen={(issue) => router.push(`/app/${workspaceSlug}/projects/${project.id}/issues/${issue.id}`)} />;
      })}
      {!issuesQuery.isLoading && !issues.length ? (
        <div className="mx-5 mt-4 flex min-h-14 items-center gap-2 border-y text-sm text-muted-foreground"><GitBranch className="size-4" />No issues in this scope.</div>
      ) : null}
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

function IssueGroup({ name, color, issues, onOpen }: { name: string; color: string | null; issues: IssueRecord[]; onOpen: (issue: IssueRecord) => void }) {
  return <section className="border-b"><header className="flex h-9 items-center gap-2 px-5 text-xs font-medium"><span className="size-2 rounded-full" style={{ backgroundColor: color ?? "#71717a" }} />{name}<span className="text-muted-foreground">{issues.length}</span></header>{issues.map((issue) => <button className="flex min-h-10 w-full items-center gap-3 border-t px-5 text-left text-sm hover:bg-accent" key={issue.id} onClick={() => onOpen(issue)}><span className="w-16 font-mono text-xs text-muted-foreground">{issue.identifier}</span><span className="min-w-0 flex-1 truncate">{issue.title}</span><span className="text-xs text-muted-foreground">{issue.branchName ?? "Main"}</span><span className="text-xs capitalize text-muted-foreground">{issue.priority}</span>{issue.assignees.slice(0, 1).map((assignee) => <Avatar className="size-5" key={assignee.membershipId}><AvatarFallback className="text-[0.55rem]">{(assignee.displayName ?? assignee.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}</button>)}</section>;
}

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
  const selectedBranchId = branchScope && branchScope !== "all" ? branchScope : null;
  const isAll = branchScope === "all";
  const branchesQuery = useProjectBranchesQuery(workspaceSlug, project.id);
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

  const selectBranch = (value: "main" | "all" | string) => {
    router.replace(value === "main" ? pathname : `${pathname}?branch=${encodeURIComponent(value)}`);
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-1 overflow-x-auto border-b px-5 pb-3">
        <ScopeButton active={!branchScope} label="Main" onClick={() => selectBranch("main")} />
        {(branchesQuery.data ?? []).map((branch) => (
          <ScopeButton active={selectedBranchId === branch.id} key={branch.id} label={branch.name} onClick={() => selectBranch(branch.id)} />
        ))}
        <ScopeButton active={isAll} label="All issues" onClick={() => selectBranch("all")} />
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
          branches={branchesQuery.data ?? []}
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

function ScopeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <Button className="shrink-0" size="sm" variant={active ? "secondary" : "ghost"} onClick={onClick}><GitBranch />{label}</Button>;
}

function IssueGroup({ name, color, issues, onOpen }: { name: string; color: string | null; issues: IssueRecord[]; onOpen: (issue: IssueRecord) => void }) {
  return <section className="border-b"><header className="flex h-9 items-center gap-2 px-5 text-xs font-medium"><span className="size-2 rounded-full" style={{ backgroundColor: color ?? "#71717a" }} />{name}<span className="text-muted-foreground">{issues.length}</span></header>{issues.map((issue) => <button className="flex min-h-10 w-full items-center gap-3 border-t px-5 text-left text-sm hover:bg-accent" key={issue.id} onClick={() => onOpen(issue)}><span className="w-16 font-mono text-xs text-muted-foreground">{issue.identifier}</span><span className="min-w-0 flex-1 truncate">{issue.title}</span><span className="text-xs text-muted-foreground">{issue.branchName ?? "Main"}</span><span className="text-xs capitalize text-muted-foreground">{issue.priority}</span>{issue.assignees.slice(0, 1).map((assignee) => <Avatar className="size-5" key={assignee.membershipId}><AvatarFallback className="text-[0.55rem]">{(assignee.displayName ?? assignee.email).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}</button>)}</section>;
}

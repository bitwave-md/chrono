"use client";

import { GitBranch, LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useCreateProjectBranchMutation,
  useProjectBranchesQuery,
  useUpdateProjectBranchMutation,
} from "@/modules/workspace-ui/application/use-project-branch-queries";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type {
  ProjectBranchKind,
  ProjectBranchState,
} from "@/modules/workspace-ui/domain/workspace-types";

const kindOptions = ["feature", "sprint", "refactor", "release", "other"].map(
  (value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }),
);

const stateOptions = [
  { value: "planned", label: "Planned", color: "#94a3b8" },
  { value: "active", label: "Active", color: "#60a5fa" },
  { value: "completed", label: "Completed", color: "#22c55e" },
  { value: "canceled", label: "Canceled", color: "#71717a" },
];

export function ProjectBranchSection({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId: string;
}) {
  const branchesQuery = useProjectBranchesQuery(workspaceSlug, projectId);
  const updateBranch = useUpdateProjectBranchMutation(workspaceSlug, projectId);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Branches</h2>
        <BranchCreator projectId={projectId} workspaceSlug={workspaceSlug} />
      </div>
      <div className="mt-2 divide-y border-y">
        {(branchesQuery.data ?? []).map((branch) => {
          const percentage = branch.totalIssues
            ? Math.round((branch.completedIssues / branch.totalIssues) * 100)
            : 0;
          return (
            <div className="flex min-h-14 items-center gap-3 py-2" key={branch.id}>
              <GitBranch className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="truncate text-sm">{branch.name}</strong>
                  <Badge variant="outline">{branch.kind}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{branch.completedIssues}/{branch.totalIssues} issues</span>
                  <span>·</span>
                  <span>{percentage}% complete</span>
                </div>
              </div>
              <OptionProperty
                icon={GitBranch}
                label="Branch state"
                options={stateOptions}
                placeholder="Planned"
                value={branch.state}
                onChange={(state) => {
                  if (state) updateBranch.mutate({ branchId: branch.id, input: { state } });
                }}
              />
            </div>
          );
        })}
        {!branchesQuery.isLoading && !branchesQuery.data?.length ? (
          <div className="flex min-h-14 items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="size-4" />No named Branches. Issues currently live on Main.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BranchCreator({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId: string;
}) {
  const mutation = useCreateProjectBranchMutation(workspaceSlug, projectId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<ProjectBranchKind>("feature");

  const create = () => mutation.mutate({
    name: name.trim(),
    slug: slug.trim(),
    kind,
    state: "planned" satisfies ProjectBranchState,
    summary: null,
    description: null,
    startDate: null,
    targetDate: null,
  }, { onSuccess: () => { setName(""); setSlug(""); } });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label="Add Branch" size="icon-sm" variant="ghost"><Plus /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-2 p-3">
        <strong className="text-sm">Create Branch</strong>
        <Input placeholder="Branch name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="branch-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
        <OptionProperty icon={GitBranch} label="Branch type" options={kindOptions} placeholder="Feature" value={kind} onChange={(value) => { if (value) setKind(value as ProjectBranchKind); }} />
        {mutation.error ? <span className="text-xs text-destructive">{mutation.error.message}</span> : null}
        <Button disabled={mutation.isPending || name.trim().length < 2 || !slug.trim()} size="sm" onClick={create}>
          {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <GitBranch />}
          Create Branch
        </Button>
      </PopoverContent>
    </Popover>
  );
}

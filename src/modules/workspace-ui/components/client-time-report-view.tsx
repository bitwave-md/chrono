"use client";

import { BriefcaseBusiness, Clock3, ReceiptText, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { useClientTimeReportQuery } from "@/modules/workspace-ui/application/use-client-time-report-query";
import { useMembersQuery, useProjectsQuery, useTimeCategoriesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientTimeEntryTable } from "@/modules/workspace-ui/components/client-time-entry-table";
import { ClientTimeReportCharts } from "@/modules/workspace-ui/components/client-time-report-charts";
import { ClientTimeReportFilters } from "@/modules/workspace-ui/components/client-time-report-filters";
import { EmptyView } from "@/modules/workspace-ui/components/empty-view";
import {
  aggregateClientTimeReport,
  parseClientReportRange,
  reportPresetForRange,
  reportRangeForPreset,
  reportRangeParams,
  type ClientReportRange,
  type ReportPreset,
} from "@/modules/workspace-ui/domain/client-time-report";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

type FilterKey = "from" | "to" | "projectId" | "categoryId" | "workerUserId";

export function ClientTimeReportView({
  client,
  workspaceSlug,
}: {
  client: ClientRecord;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspace = useWorkspaceIdentity();
  const range = parseClientReportRange(searchParams.get("from"), searchParams.get("to"));
  const preset = reportPresetForRange(range);
  const projectId = optionalUuid(searchParams.get("projectId"));
  const categoryId = optionalUuid(searchParams.get("categoryId"));
  const workerUserId = optionalUuid(searchParams.get("workerUserId"));
  const filters = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    projectId,
    categoryId,
    workerUserId,
  };
  const reportQuery = useClientTimeReportQuery(workspaceSlug, client.id, filters);
  const projectsQuery = useProjectsQuery(workspaceSlug, client.id);
  const categoriesQuery = useTimeCategoriesQuery(workspaceSlug);
  const membersQuery = useMembersQuery(workspaceSlug);
  const entries = reportQuery.data?.entries ?? [];
  const report = aggregateClientTimeReport(entries, range);
  const showPeople = workspace.role === "owner" || workspace.role === "admin";

  const update = (changes: Partial<Record<FilterKey, string | undefined>>) => {
    const parameters = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) parameters.set(key, value);
      else parameters.delete(key);
    }
    const query = parameters.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const changeRange = (next: ClientReportRange) => update(reportRangeParams(next));
  const changePreset = (next: Exclude<ReportPreset, "custom">) => {
    if (next === "this_month") update({ from: undefined, to: undefined });
    else changeRange(reportRangeForPreset(next));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ClientTimeReportFilters
        categories={categoriesQuery.data ?? []}
        categoryId={categoryId}
        members={membersQuery.data ?? []}
        preset={preset}
        projectId={projectId}
        projects={projectsQuery.data ?? []}
        range={range}
        showPeople={showPeople}
        workerUserId={workerUserId}
        onDimensionChange={(key, value) => update({ [key]: value })}
        onPresetChange={changePreset}
        onRangeChange={changeRange}
        onReset={() => update({ from: undefined, to: undefined, projectId: undefined, categoryId: undefined, workerUserId: undefined })}
      />
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Time report</h1><p className="mt-1 text-sm text-muted-foreground">{reportQuery.data?.scope === "personal" ? `Your recorded work for ${client.name}.` : `Recorded work across ${client.name} Projects and Issues.`}</p></div>{reportQuery.isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}</div>
        {reportQuery.error ? <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{reportQuery.error.message}</div> : null}
        {!reportQuery.isLoading && !reportQuery.error && !entries.length ? (
          <EmptyView
            className="min-h-[calc(100svh-300px)]"
            description="Try another date range or record time on one of this Client’s Issues."
            icon={Clock3}
            title="No time entries in this period"
          />
        ) : null}
        {entries.length ? (
          <>
            <SummaryCards report={report} />
            <ClientTimeReportCharts categories={report.categories} daily={report.daily} projects={report.projects} />
            {reportQuery.data?.truncated ? <p className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">This view is limited to the newest 1,000 matching entries. Narrow the period for a complete reconciliation.</p> : null}
            <ClientTimeEntryTable entries={entries} workspaceSlug={workspaceSlug} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCards({ report }: { report: ReturnType<typeof aggregateClientTimeReport> }) {
  const billablePercent = report.totalSeconds ? Math.round((report.billableSeconds / report.totalSeconds) * 100) : 0;
  const cards = [
    { label: "Total time", value: formatLoggedDuration(report.totalSeconds), detail: `${report.entryCount} entries`, icon: Clock3 },
    { label: "Billable", value: formatLoggedDuration(report.billableSeconds), detail: `${billablePercent}% of total`, icon: ReceiptText },
    { label: "Projects", value: String(report.projects.filter((row) => row.id !== "no-project").length), detail: `${report.projects.find((row) => row.id === "no-project")?.entryCount ?? 0} Client-level entries`, icon: BriefcaseBusiness },
    { label: "Contributors", value: String(report.contributors), detail: `${report.categories.length} time entry types`, icon: Users },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => <Card key={card.label}><CardContent className="flex items-start gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><card.icon className="size-4" /></span><div><span className="text-xs text-muted-foreground">{card.label}</span><strong className="mt-0.5 block text-xl font-semibold">{card.value}</strong><span className="mt-1 block text-xs text-muted-foreground">{card.detail}</span></div></CardContent></Card>)}
    </div>
  );
}

function optionalUuid(value: string | null): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

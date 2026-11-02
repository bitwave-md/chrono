"use client";

import { addDays, format } from "date-fns";
import { useSyncExternalStore } from "react";
import { BarChart3, Clock3, Download, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORT_LOCALES, REPORT_LOCALE_LABELS, type ReportLocale, resolveReportLocale } from "@/modules/time-tracking/domain/report-locale";
import { useClientTimeReportQuery, useExportClientTimeReportMutation } from "@/modules/workspace-ui/application/use-client-time-report-query";
import { useMembersQuery, useProjectsQuery, useTimeCategoriesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientTimeEntryTable } from "@/modules/workspace-ui/components/client-time-entry-table";
import { ClientTimeReportSummary } from "@/modules/workspace-ui/components/client-time-report-summary";
import { ClientTimeReportCharts } from "@/modules/workspace-ui/components/client-time-report-charts";
import { ClientTimeReportFilters } from "@/modules/workspace-ui/components/client-time-report-filters";
import { EmptyView } from "@/modules/workspace-ui/components/empty-view";
import { Reveal } from "@/modules/workspace-ui/components/report-reveal";
import {
  aggregateClientTimeReport,
  parseClientReportRange,
  reportPresetForRange,
  reportRangeForPreset,
  reportRangeParams,
  type ClientReportRange,
  type ReportPreset,
} from "@/modules/workspace-ui/domain/client-time-report";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

type FilterKey = "from" | "to" | "projectId" | "categoryId" | "workerUserId";

export function ClientTimeReportView({
  client,
  projectScope,
  workspaceSlug,
}: {
  client: Pick<ClientRecord, "id" | "name">;
  projectScope?: { id: string; name: string };
  workspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspace = useWorkspaceIdentity();
  const range = parseClientReportRange(searchParams.get("from"), searchParams.get("to"));
  const preset = reportPresetForRange(range);
  const projectId = projectScope?.id ?? optionalUuid(searchParams.get("projectId"));
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
  const exportReport = useExportClientTimeReportMutation(workspaceSlug, client.id);
  const reportLocale = useSyncExternalStore(subscribeReportLocale, readStoredReportLocale, () => "en" as ReportLocale);
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
  const changeReportLocale = (next: ReportLocale) => {
    try {
      window.localStorage.setItem(REPORT_LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode, disabled storage).
    }
    window.dispatchEvent(new Event(REPORT_LOCALE_EVENT));
  };
  const exportPdf = () => exportReport.mutate({ filters, locale: reportLocale }, {
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success("Time report exported");
    },
    onError: (error) => toast.error(error.message),
  });

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
        showProjects={!projectScope}
        workerUserId={workerUserId}
        onDimensionChange={(key, value) => update({ [key]: value })}
        onPresetChange={changePreset}
        onRangeChange={changeRange}
        onReset={() => update({ from: undefined, to: undefined, projectId: undefined, categoryId: undefined, workerUserId: undefined })}
      />
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-5 md:p-7">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--chart-2)] to-emerald-500 text-white shadow-lg shadow-[var(--chart-2)]/25"><BarChart3 className="size-5" /></span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Time report</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{projectScope ? `Recorded work for ${projectScope.name}` : reportQuery.data?.scope === "personal" ? `Your recorded work for ${client.name}` : `Recorded work across ${client.name} Projects and Issues`} · {formatRangeLabel(range)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {reportQuery.isFetching ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><LoaderCircle className="size-3 animate-spin" />Updating</span> : null}
              <Select value={reportLocale} onValueChange={(next) => changeReportLocale(resolveReportLocale(next))}><SelectTrigger className="h-8 w-[130px]" aria-label="PDF language"><SelectValue /></SelectTrigger><SelectContent>{REPORT_LOCALES.map((locale) => <SelectItem key={locale} value={locale}>{REPORT_LOCALE_LABELS[locale]}</SelectItem>)}</SelectContent></Select>
              <Button disabled={!entries.length || exportReport.isPending} size="sm" type="button" onClick={exportPdf}>{exportReport.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}Export PDF</Button>
            </div>
          </div>
        </Reveal>
        {reportQuery.error ? <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">{reportQuery.error.message}</div> : null}
        {!reportQuery.isLoading && !reportQuery.error && !entries.length ? (
          <EmptyView
            className="min-h-[calc(100svh-300px)]"
            description={`Try another date range or record time on one of this ${projectScope ? "Project’s" : "Client’s"} Issues.`}
            icon={Clock3}
            title="No time entries in this period"
          />
        ) : null}
        {entries.length ? (
          <>
            <ClientTimeReportSummary report={report} />
            <ClientTimeReportCharts categories={report.categories} daily={report.daily} projects={report.projects} showProjects={!projectScope} workers={showPeople ? report.workers : undefined} />
            {reportQuery.data?.truncated ? <p className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">This view is limited to the newest 1,000 matching entries. Narrow the period for a complete reconciliation.</p> : null}
            <Reveal delay={520}>
            <ClientTimeEntryTable
              canCreateTimeTypes={workspace.role === "owner" || workspace.role === "admin"}
              canDeleteEntries={workspace.role === "owner" || workspace.role === "admin"}
              canEditEntries={workspace.role !== "guest"}
              categories={categoriesQuery.data ?? []}
              tasks={report.tasks}
              workspaceSlug={workspaceSlug}
            />
            </Reveal>
          </>
        ) : null}
      </div>
    </div>
  );
}

const REPORT_LOCALE_STORAGE_KEY = "chrono.report-locale";
const REPORT_LOCALE_EVENT = "chrono:report-locale";

function readStoredReportLocale(): ReportLocale {
  if (typeof window === "undefined") return "en";
  try {
    return resolveReportLocale(window.localStorage.getItem(REPORT_LOCALE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

function subscribeReportLocale(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(REPORT_LOCALE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REPORT_LOCALE_EVENT, callback);
  };
}

function optionalUuid(value: string | null): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

function formatRangeLabel(range: ClientReportRange): string {
  return `${format(range.from, "MMM d")} – ${format(addDays(range.to, -1), "MMM d, yyyy")}`;
}

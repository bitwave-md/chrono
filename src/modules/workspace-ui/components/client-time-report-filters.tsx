"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportDateRangePicker } from "@/modules/workspace-ui/components/report-date-range-picker";
import type { ClientReportRange, ReportPreset } from "@/modules/workspace-ui/domain/client-time-report";
import type { MemberRecord, ProjectRecord, TimeCategoryRecord } from "@/modules/workspace-ui/domain/workspace-types";

const all = "all";

export function ClientTimeReportFilters({
  categories,
  members,
  preset,
  projectId,
  projects,
  range,
  showPeople,
  categoryId,
  workerUserId,
  onDimensionChange,
  onPresetChange,
  onRangeChange,
  onReset,
}: {
  categories: TimeCategoryRecord[];
  members: MemberRecord[];
  preset: ReportPreset;
  projectId?: string;
  projects: ProjectRecord[];
  range: ClientReportRange;
  showPeople: boolean;
  categoryId?: string;
  workerUserId?: string;
  onDimensionChange: (key: "projectId" | "categoryId" | "workerUserId", value?: string) => void;
  onPresetChange: (preset: Exclude<ReportPreset, "custom">) => void;
  onRangeChange: (range: ClientReportRange) => void;
  onReset: () => void;
}) {
  const filtered = Boolean(projectId || categoryId || workerUserId || preset !== "this_month");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      <Select value={preset} onValueChange={(value) => value !== "custom" && onPresetChange(value as Exclude<ReportPreset, "custom">)}>
        <SelectTrigger className="w-40 rounded-full" size="sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">This month</SelectItem>
          <SelectItem value="previous_month">Previous month</SelectItem>
          <SelectItem value="last_30_days">Last 30 days</SelectItem>
          <SelectItem disabled value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      <ReportDateRangePicker key={`${range.from.toISOString()}-${range.to.toISOString()}`} range={range} onChange={onRangeChange} />
      <DimensionSelect label="All projects" value={projectId} options={projects.map((project) => ({ value: project.id, label: project.name }))} onChange={(value) => onDimensionChange("projectId", value)} />
      <DimensionSelect label="All types" value={categoryId} options={categories.map((category) => ({ value: category.id, label: category.name }))} onChange={(value) => onDimensionChange("categoryId", value)} />
      {showPeople ? <DimensionSelect label="All people" value={workerUserId} options={members.map((member) => ({ value: member.userId, label: member.displayName ?? member.email }))} onChange={(value) => onDimensionChange("workerUserId", value)} /> : null}
      {filtered ? <Button aria-label="Reset report filters" className="rounded-full" size="icon-sm" variant="ghost" onClick={onReset}><RotateCcw /></Button> : null}
    </div>
  );
}

function DimensionSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value?: string) => void;
}) {
  return (
    <Select value={value ?? all} onValueChange={(next) => onChange(next === all ? undefined : next)}>
      <SelectTrigger className="w-40 rounded-full" size="sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={all}>{label}</SelectItem>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

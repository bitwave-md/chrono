import { sql, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import {
  clients,
  issues,
  projects,
  projectBranches,
  timeCategories,
  timeLogs,
  users,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ValidationError } from "@/modules/shared/application/application-error";

export const timeReportGroups = [
  "issue",
  "project",
  "branch",
  "client",
  "category",
  "worker",
] as const;

export type TimeReportGroup = (typeof timeReportGroups)[number];

export interface TimeReportFilters {
  issueId?: string;
  clientId?: string;
  projectId?: string;
  branchId?: string;
  categoryId?: string;
  workerUserId?: string;
  from?: Date;
  to?: Date;
}

interface TimeReportRow extends Record<string, unknown> {
  dimension_id: string | null;
  dimension_name: string;
  total_seconds: string | number;
  billable_seconds: string | number;
  entry_count: string | number;
}

interface ReportDimension {
  id: SQL;
  label: SQL;
  fallback: string;
}

const reportDimensions: Record<TimeReportGroup, ReportDimension> = {
  issue: {
    id: sql.raw("logs.issue_id"),
    label: sql.raw("issue_dimension.title"),
    fallback: "Unknown issue",
  },
  project: {
    id: sql.raw("logs.project_id"),
    label: sql.raw("project_dimension.name"),
    fallback: "Client backlog",
  },
  branch: {
    id: sql.raw("logs.branch_id"),
    label: sql.raw("branch_dimension.name"),
    fallback: "Main",
  },
  client: {
    id: sql.raw("logs.client_id"),
    label: sql.raw("client_dimension.name"),
    fallback: "Unknown client",
  },
  category: {
    id: sql.raw("logs.category_id"),
    label: sql.raw("category_dimension.name"),
    fallback: "Uncategorized",
  },
  worker: {
    id: sql.raw("logs.worker_user_id"),
    label: sql.raw(
      "coalesce(worker_dimension.name, worker_dimension.email)",
    ),
    fallback: "Unknown worker",
  },
};

export class TimeReportService {
  readonly #policy = new WorkspacePolicy();

  async aggregate(
    principal: Principal,
    groupBy: TimeReportGroup,
    filters: TimeReportFilters,
  ) {
    this.#policy.assertCanViewTimeReports(principal);
    this.#assertDateRange(filters.from, filters.to);

    const dimension = reportDimensions[groupBy];
    const conditions = this.#conditions(principal, filters);
    const result = await db.execute<TimeReportRow>(sql`
      select
        ${dimension.id}::text as dimension_id,
        coalesce(${dimension.label}, ${dimension.fallback}) as dimension_name,
        sum(logs.duration_seconds) as total_seconds,
        sum(
          case when logs.billable then logs.duration_seconds else 0 end
        ) as billable_seconds,
        count(logs.id) as entry_count
      from ${timeLogs} logs
      left join ${issues} issue_dimension
        on issue_dimension.${sql.identifier("id")} = logs.issue_id
        and issue_dimension.${sql.identifier("workspace_id")} = logs.workspace_id
      left join ${projects} project_dimension
        on project_dimension.${sql.identifier("id")} = logs.project_id
        and project_dimension.${sql.identifier("workspace_id")} = logs.workspace_id
      left join ${projectBranches} branch_dimension
        on branch_dimension.${sql.identifier("id")} = logs.branch_id
        and branch_dimension.${sql.identifier("workspace_id")} = logs.workspace_id
      left join ${clients} client_dimension
        on client_dimension.${sql.identifier("id")} = logs.client_id
        and client_dimension.${sql.identifier("workspace_id")} = logs.workspace_id
      left join ${timeCategories} category_dimension
        on category_dimension.${sql.identifier("id")} = logs.category_id
        and category_dimension.${sql.identifier("workspace_id")} = logs.workspace_id
      left join ${users} worker_dimension
        on worker_dimension.${sql.identifier("id")} = logs.worker_user_id
      where ${sql.join(conditions, sql` and `)}
      group by ${dimension.id}, ${dimension.label}
      order by total_seconds desc, dimension_name
    `);

    return result.rows.map((row) => ({
      dimensionId: row.dimension_id,
      dimensionName: row.dimension_name,
      totalSeconds: Number(row.total_seconds),
      billableSeconds: Number(row.billable_seconds),
      entryCount: Number(row.entry_count),
    }));
  }

  #conditions(principal: Principal, filters: TimeReportFilters): SQL[] {
    const conditions: SQL[] = [
      sql`logs.workspace_id = ${principal.workspaceId}`,
      sql`logs.archived_at is null`,
    ];
    const exactFilters = [
      ["issue_id", filters.issueId],
      ["client_id", filters.clientId],
      ["project_id", filters.projectId],
      ["branch_id", filters.branchId],
      ["category_id", filters.categoryId],
      ["worker_user_id", filters.workerUserId],
    ] as const;

    for (const [column, value] of exactFilters) {
      if (value) {
        conditions.push(
          sql`${sql.raw(`logs.${column}`)} = ${value}`,
        );
      }
    }

    if (filters.from) {
      conditions.push(sql`logs.started_at >= ${filters.from}`);
    }

    if (filters.to) {
      conditions.push(sql`logs.started_at < ${filters.to}`);
    }

    return conditions;
  }

  #assertDateRange(from?: Date, to?: Date): void {
    if (from && to && from >= to) {
      throw new ValidationError("from must be earlier than to.");
    }
  }
}

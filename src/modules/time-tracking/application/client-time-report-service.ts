import type { Principal } from "@/modules/authorization/domain/principal";
import { TimeLogService } from "@/modules/time-tracking/application/time-log-service";

export interface ClientTimeReportFilters {
  from: Date;
  to: Date;
  projectId?: string;
  categoryId?: string;
  workerUserId?: string;
}

export class ClientTimeReportService {
  readonly #timeLogs = new TimeLogService();

  async report(
    principal: Principal,
    clientId: string,
    filters: ClientTimeReportFilters,
  ) {
    const entries = await this.#timeLogs.listForReport(principal, {
      clientId,
      projectId: filters.projectId,
      categoryId: filters.categoryId,
      workerUserId: filters.workerUserId,
      from: filters.from,
      to: filters.to,
      dateBasis: "ended",
      limit: 1_000,
    });

    return {
      entries,
      scope: clientTimeReportScope(principal),
      truncated: entries.length === 1_000,
    };
  }
}

export function clientTimeReportScope(principal: Principal): "client" | "personal" {
  return principal.role === "member" ? "personal" : "client";
}

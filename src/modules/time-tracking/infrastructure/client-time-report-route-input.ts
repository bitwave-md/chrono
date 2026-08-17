import { SearchInput } from "@/modules/shared/infrastructure/search-input";
import type { ClientTimeReportFilters } from "@/modules/time-tracking/application/client-time-report-service";
import { ReportCalendar } from "@/modules/time-tracking/domain/report-calendar";

export class ClientTimeReportRouteInput {
  readonly #input: SearchInput;

  constructor(url: string) {
    this.#input = new SearchInput(url);
  }

  filters(): ClientTimeReportFilters {
    const calendar = new ReportCalendar(
      this.#input.optionalString("timeZone", 100),
    );
    return {
      from: this.#input.requiredDateTime("from"),
      to: this.#input.requiredDateTime("to"),
      timeZone: calendar.timeZone,
      projectId: this.#input.optionalUuid("projectId"),
      categoryId: this.#input.optionalUuid("categoryId"),
      workerUserId: this.#input.optionalUuid("workerUserId"),
    };
  }
}

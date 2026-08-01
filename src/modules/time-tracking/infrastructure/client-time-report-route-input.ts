import { SearchInput } from "@/modules/shared/infrastructure/search-input";
import type { ClientTimeReportFilters } from "@/modules/time-tracking/application/client-time-report-service";

export class ClientTimeReportRouteInput {
  readonly #input: SearchInput;

  constructor(url: string) {
    this.#input = new SearchInput(url);
  }

  filters(): ClientTimeReportFilters {
    return {
      from: this.#input.requiredDateTime("from"),
      to: this.#input.requiredDateTime("to"),
      projectId: this.#input.optionalUuid("projectId"),
      categoryId: this.#input.optionalUuid("categoryId"),
      workerUserId: this.#input.optionalUuid("workerUserId"),
    };
  }
}

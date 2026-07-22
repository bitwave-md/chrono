import type { IssueActivityEventRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { workspaceApiRequest } from "@/modules/workspace-ui/infrastructure/workspace-api-request";

export class IssueActivityApiClient {
  readonly #base: string;
  constructor(workspaceSlug: string) { this.#base = `/api/workspaces/${encodeURIComponent(workspaceSlug)}`; }
  list(issueId: string) { return workspaceApiRequest<IssueActivityEventRecord[]>(this.#base, `/issues/${encodeURIComponent(issueId)}/activity`); }
}

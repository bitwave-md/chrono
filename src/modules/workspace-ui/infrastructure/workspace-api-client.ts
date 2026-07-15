import type {
  ActiveTimerState,
  ClientRecord,
  IssuePriority,
  IssueRecord,
  IssueVisibility,
  ProjectNode,
  TeamRecord,
  TimeCategoryRecord,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

interface ApiEnvelope<T> {
  data: T;
}

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

export interface IssueQueryFilters {
  projectId?: string;
  teamId?: string;
}

export interface CreateIssueRequest {
  clientId: string;
  projectId: string | null;
  teamId: string | null;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
}

export interface UpdateIssueRequest {
  issueId: string;
  expectedVersion: number;
  projectId?: string | null;
  teamId?: string | null;
  statusId?: string | null;
  title?: string;
  priority?: IssuePriority;
  visibility?: IssueVisibility;
}

export interface StartTimerRequest {
  issueId: string;
  categoryId: string | null;
  note: string | null;
}

export class WorkspaceApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "WorkspaceApiError";
    this.status = status;
    this.code = code;
  }
}

export class WorkspaceApiClient {
  readonly #basePath: string;

  constructor(workspaceSlug: string) {
    this.#basePath = `/api/workspaces/${encodeURIComponent(workspaceSlug)}`;
  }

  listClients(): Promise<ClientRecord[]> {
    return this.#get("/clients");
  }

  listProjects(clientId: string): Promise<ProjectNode[]> {
    return this.#get(`/projects?clientId=${encodeURIComponent(clientId)}`);
  }

  listTeams(): Promise<TeamRecord[]> {
    return this.#get("/teams");
  }

  listCategories(): Promise<TimeCategoryRecord[]> {
    return this.#get("/time-categories");
  }

  listWorkflowStatuses(workflowId: string): Promise<WorkflowStatusRecord[]> {
    return this.#get(
      `/workflows/${encodeURIComponent(workflowId)}/statuses`,
    );
  }

  listIssues(
    clientId: string,
    filters: IssueQueryFilters,
  ): Promise<IssueRecord[]> {
    const parameters = new URLSearchParams({ clientId });

    if (filters.projectId) {
      parameters.set("projectId", filters.projectId);
    }

    if (filters.teamId) {
      parameters.set("teamId", filters.teamId);
    }

    return this.#get(`/issues?${parameters.toString()}`);
  }

  createIssue(input: CreateIssueRequest): Promise<unknown> {
    return this.#request("/issues", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        assigneeId: null,
        statusId: null,
        parentIssueId: null,
      }),
    });
  }

  updateIssue(input: UpdateIssueRequest): Promise<unknown> {
    const { issueId, ...body } = input;
    return this.#request(`/issues/${encodeURIComponent(issueId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  activeTimer(): Promise<ActiveTimerState> {
    return this.#get("/timers/active");
  }

  startTimer(input: StartTimerRequest): Promise<unknown> {
    return this.#request("/timers/active", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  stopTimer(): Promise<unknown> {
    return this.#request("/timers/active", { method: "DELETE" });
  }

  async #get<T>(path: string): Promise<T> {
    return this.#request<T>(path);
  }

  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.#basePath}${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = (await response.json()) as ApiEnvelope<T> & ApiErrorEnvelope;

    if (!response.ok) {
      throw new WorkspaceApiError(
        payload.error?.message ?? "The request could not be completed.",
        response.status,
        payload.error?.code,
      );
    }

    return payload.data;
  }
}

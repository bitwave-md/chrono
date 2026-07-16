import type {
  ActiveTimerState,
  ClientRecord,
  IssuePriority,
  IssueRecord,
  IssueCommentRecord,
  IssueMetadataRecord,
  IssueVisibility,
  MemberRecord,
  ProjectActivityRecord,
  ProjectBranchKind,
  ProjectBranchRecord,
  ProjectBranchState,
  ProjectDetailRecord,
  ProjectRecord,
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
  branchId?: string;
  mainBranch?: boolean;
  assigneeMembershipId?: string;
  mine?: boolean;
}

export interface CreateIssueRequest {
  clientId: string;
  projectId: string | null;
  branchId: string | null;
  assigneeMembershipIds: string[];
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
}

export interface UpdateIssueRequest {
  issueId: string;
  expectedVersion: number;
  projectId?: string | null;
  branchId?: string | null;
  assigneeMembershipIds?: string[];
  statusId?: string | null;
  issueTypeId?: string | null;
  title?: string;
  description?: string | null;
  priority?: IssuePriority;
  visibility?: IssueVisibility;
  estimateMinutes?: number | null;
  dueAt?: string | null;
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

  listProjects(clientId: string): Promise<ProjectRecord[]> {
    return this.#get(`/projects?clientId=${encodeURIComponent(clientId)}`);
  }

  listMembers(): Promise<MemberRecord[]> {
    return this.#get("/members");
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
    clientId: string | null,
    filters: IssueQueryFilters,
  ): Promise<IssueRecord[]> {
    const parameters = new URLSearchParams();

    if (clientId) parameters.set("clientId", clientId);

    if (filters.projectId) {
      parameters.set("projectId", filters.projectId);
    }

    if (filters.branchId) parameters.set("branchId", filters.branchId);
    if (filters.mainBranch) parameters.set("branch", "main");

    if (filters.assigneeMembershipId) parameters.set("assigneeMembershipId", filters.assigneeMembershipId);
    if (filters.mine) parameters.set("mine", "true");

    return this.#get(`/issues?${parameters.toString()}`);
  }

  createIssue(input: CreateIssueRequest): Promise<unknown> {
    return this.#request("/issues", {
      method: "POST",
      body: JSON.stringify({
        ...input,
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

  getIssue(issueId: string): Promise<IssueRecord> {
    return this.#get(`/issues/${encodeURIComponent(issueId)}`);
  }

  issueComments(issueId: string): Promise<IssueCommentRecord[]> {
    return this.#get(`/issues/${encodeURIComponent(issueId)}/comments`);
  }

  addIssueComment(issueId: string, body: string): Promise<unknown> {
    return this.#request(`/issues/${encodeURIComponent(issueId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  issueMetadata(): Promise<IssueMetadataRecord> {
    return this.#get("/issue-metadata");
  }

  replaceIssueLabels(issueId: string, labelIds: string[]): Promise<unknown> {
    return this.#request(`/issues/${encodeURIComponent(issueId)}/labels`, {
      method: "PUT",
      body: JSON.stringify({ labelIds }),
    });
  }

  getProject(projectId: string): Promise<ProjectDetailRecord> {
    return this.#get(`/projects/${encodeURIComponent(projectId)}`);
  }

  listProjectBranches(projectId: string): Promise<ProjectBranchRecord[]> {
    return this.#get(`/projects/${encodeURIComponent(projectId)}/branches`);
  }

  createProjectBranch(
    projectId: string,
    input: {
      name: string;
      slug: string;
      kind: ProjectBranchKind;
      state: ProjectBranchState;
      summary: string | null;
      description: string | null;
      startDate: string | null;
      targetDate: string | null;
    },
  ): Promise<ProjectBranchRecord> {
    return this.#request(`/projects/${encodeURIComponent(projectId)}/branches`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateProjectBranch(
    projectId: string,
    branchId: string,
    input: Record<string, unknown>,
  ): Promise<ProjectBranchRecord> {
    return this.#request(
      `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  }

  updateProject(projectId: string, input: Record<string, unknown>): Promise<unknown> {
    return this.#request(`/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  projectActivity(projectId: string): Promise<ProjectActivityRecord> {
    return this.#get(`/projects/${encodeURIComponent(projectId)}/activity`);
  }

  publishProjectUpdate(
    projectId: string,
    input: { body: string; health: string | null; progress: number | null },
  ): Promise<unknown> {
    return this.#request(`/projects/${encodeURIComponent(projectId)}/activity`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  addProjectResource(projectId: string, input: { title: string; url: string; description: string | null }): Promise<unknown> {
    return this.#request(`/projects/${encodeURIComponent(projectId)}/resources`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  addProjectMilestone(projectId: string, input: { name: string; targetDate: string | null }): Promise<unknown> {
    return this.#request(`/projects/${encodeURIComponent(projectId)}/milestones`, {
      method: "POST",
      body: JSON.stringify({ ...input, description: null, state: "planned" }),
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

  addManualTime(input: { issueId: string; durationSeconds: number; note: string | null }): Promise<unknown> {
    return this.#request("/time-logs", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        categoryId: null,
        startedAt: new Date(Date.now() - input.durationSeconds * 1_000).toISOString(),
        billable: null,
      }),
    });
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

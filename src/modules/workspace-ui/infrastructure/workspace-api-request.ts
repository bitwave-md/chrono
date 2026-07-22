interface ApiEnvelope<T> { data: T }
interface ApiErrorEnvelope { error?: { code?: string; message?: string } }

export class WorkspaceRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "WorkspaceRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function workspaceApiRequest<T>(basePath: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${basePath}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T> & ApiErrorEnvelope;
  if (!response.ok) throw new WorkspaceRequestError(payload.error?.message ?? "The request could not be completed.", response.status, payload.error?.code);
  return payload.data;
}

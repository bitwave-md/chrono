import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { InboxService } from "@/modules/inbox/application/inbox-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const inbox = new InboxService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface InboxRouteContext { params: Promise<{ workspaceSlug: string }> }

export async function GET(request: Request, context: InboxRouteContext) {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
    return Response.json({ data: await inbox.list(principal, unreadOnly) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(request: Request, context: InboxRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    return Response.json({ data: await inbox.markAllRead(principal) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

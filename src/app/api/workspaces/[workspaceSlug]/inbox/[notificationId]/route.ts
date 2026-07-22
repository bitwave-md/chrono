import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { InboxService, type InboxNotificationAction } from "@/modules/inbox/application/inbox-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const actions = ["read", "unread", "dismiss"] as const satisfies readonly InboxNotificationAction[];
const inbox = new InboxService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface NotificationRouteContext {
  params: Promise<{ workspaceSlug: string; notificationId: string }>;
}

export async function PATCH(request: Request, context: NotificationRouteContext) {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug, notificationId: value } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const notificationId = new EntityId(value, "notificationId").value;
    const action = input.requiredEnum("action", actions);
    return Response.json({ data: await inbox.update(principal, notificationId, action) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

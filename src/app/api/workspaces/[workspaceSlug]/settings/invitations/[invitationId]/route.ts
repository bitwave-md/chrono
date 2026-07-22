import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { WorkspaceAdministrationService } from "@/modules/settings/application/workspace-administration-service";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new WorkspaceAdministrationService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; invitationId: string }> }

export async function POST(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { workspaceSlug, invitationId } = await context.params; return Response.json({ data: await service.refreshInvitation(await principals.requireWorkspace(workspaceSlug), new EntityId(invitationId, "invitationId").value) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function DELETE(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { workspaceSlug, invitationId } = await context.params; return Response.json({ data: await service.revokeInvitation(await principals.requireWorkspace(workspaceSlug), new EntityId(invitationId, "invitationId").value) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

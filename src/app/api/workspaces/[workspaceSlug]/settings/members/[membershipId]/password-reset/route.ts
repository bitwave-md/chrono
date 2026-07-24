import { PasswordRecoveryService } from "@/modules/auth/application/password-recovery-service";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new PasswordRecoveryService(); const principals = new ServerPrincipalResolver(); const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ workspaceSlug: string; membershipId: string }> }
export async function POST(request: Request, context: Context) { try { origins.assertTrusted(request); const { workspaceSlug, membershipId } = await context.params; return Response.json({ data: await service.createReset(await principals.requireWorkspace(workspaceSlug), new EntityId(membershipId, "membershipId").value) }, { status: 201 }); } catch (error) { return ApiErrorResponse.from(error); } }

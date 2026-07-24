import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { WorkspaceAdministrationService, type GuestAccessInput } from "@/modules/settings/application/workspace-administration-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new WorkspaceAdministrationService();
const principals = new ServerPrincipalResolver();
const origins = new MutationOriginPolicy();
const roles = ["owner", "admin", "member", "guest"] as const;
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; return Response.json({ data: await service.overview(await principals.requireWorkspace(workspaceSlug)) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    origins.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const input = new JsonInput(await request.json());
    const rawGuestAccess = input.optionalObject("guestAccess");
    const guestAccess: GuestAccessInput | null = rawGuestAccess ? {
      clients: Array.isArray(rawGuestAccess.clients) ? rawGuestAccess.clients as GuestAccessInput["clients"] : [],
    } : null;
    return Response.json({ data: await service.invite(await principals.requireWorkspace(workspaceSlug), input.requiredString("email", 320), input.requiredEnum("role", roles), guestAccess) }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

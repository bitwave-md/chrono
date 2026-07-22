import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new IdentityAssetService();
const principals = new ServerPrincipalResolver();
interface Context { params: Promise<{ workspaceSlug: string }> }

export async function GET(_request: Request, context: Context) {
  try { const { workspaceSlug } = await context.params; const result = await service.workspaceIconContent(await principals.requireWorkspace(workspaceSlug)); return new Response(result.body.stream, { headers: { "Content-Type": result.record.contentType, "Content-Length": String(result.body.contentLength ?? result.record.sizeBytes), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

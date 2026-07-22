import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new IdentityAssetService();
const users = new ServerUserResolver();
interface Context { params: Promise<{ userId: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const { userId } = await context.params;
    const result = await service.avatarContent(await users.requireUserId(), userId);
    return new Response(result.body.stream, { headers: { "Content-Type": result.record.contentType, "Content-Length": String(result.body.contentLength ?? result.record.sizeBytes), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return ApiErrorResponse.from(error); }
}

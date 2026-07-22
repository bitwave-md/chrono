import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { EntityId } from "@/modules/shared/domain/entity-id";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new IdentityAssetService();
const users = new ServerUserResolver();
const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ uploadId: string }> }

export async function PUT(request: Request, context: Context) {
  try { origins.assertTrusted(request); const { uploadId } = await context.params; return Response.json({ data: await service.uploadAvatar(await users.requireUserId(), new EntityId(uploadId, "uploadId").value, request.body) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

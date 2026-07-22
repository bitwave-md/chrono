import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { IdentityAssetService } from "@/modules/storage/application/identity-asset-service";

const service = new IdentityAssetService();
const users = new ServerUserResolver();
const origins = new MutationOriginPolicy();

export async function POST(request: Request) {
  try {
    origins.assertTrusted(request);
    const input = new JsonInput(await request.json());
    const result = await service.createAvatarIntent(await users.requireUserId(), { filename: input.requiredString("filename", 240), contentType: input.requiredString("contentType", 120), sizeBytes: input.requiredInteger("sizeBytes", 1) });
    return Response.json({ data: { ...result, uploadUrl: `/api/account/avatar/uploads/${result.uploadId}/content` } }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

export async function DELETE(request: Request) {
  try { origins.assertTrusted(request); await service.removeAvatar(await users.requireUserId()); return Response.json({ data: null }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

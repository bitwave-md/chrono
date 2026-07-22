import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { AccountSettingsService } from "@/modules/settings/application/account-settings-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new AccountSettingsService();
const users = new ServerUserResolver();
const origins = new MutationOriginPolicy();

export async function GET() {
  try { return Response.json({ data: await service.profile(await users.requireUserId()) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function PATCH(request: Request) {
  try {
    origins.assertTrusted(request);
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.updateProfile(await users.requireUserId(), input.requiredString("name", 120)) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

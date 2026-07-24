import { SetupRegistrationService } from "@/modules/auth/application/setup-registration-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { RawPasswordInput } from "@/modules/auth/domain/raw-password-input";

const service = new SetupRegistrationService(); const origins = new MutationOriginPolicy();
export async function POST(request: Request) {
  try {
    origins.assertTrusted(request);
    const body = await request.json(); const input = new JsonInput(body);
    const data = await service.register({ setupToken: input.requiredString("setupToken", 512), name: input.requiredString("name", 160), email: input.requiredString("email", 320), password: RawPasswordInput.required(body) });
    return Response.json({ data }, { status: 201 });
  } catch (error) { return ApiErrorResponse.from(error); }
}

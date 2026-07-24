import { PasswordRecoveryService } from "@/modules/auth/application/password-recovery-service";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { RawPasswordInput } from "@/modules/auth/domain/raw-password-input";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new PasswordRecoveryService(); const origins = new MutationOriginPolicy();
export async function POST(request: Request) { try { origins.assertTrusted(request); const body = await request.json(); const input = new JsonInput(body); return Response.json({ data: await service.emergencyOwnerReset({ setupToken: input.requiredString("setupToken", 512), email: input.requiredString("email", 320), password: RawPasswordInput.required(body) }) }); } catch (error) { return ApiErrorResponse.from(error); } }

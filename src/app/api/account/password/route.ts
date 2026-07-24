import { PasswordRecoveryService } from "@/modules/auth/application/password-recovery-service";
import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { RawPasswordInput } from "@/modules/auth/domain/raw-password-input";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new PasswordRecoveryService(); const users = new ServerUserResolver(); const origins = new MutationOriginPolicy();
export async function PATCH(request: Request) { try { origins.assertTrusted(request); const body = await request.json(); return Response.json({ data: await service.change(await users.requireUserId(), RawPasswordInput.required(body, "currentPassword"), RawPasswordInput.required(body, "password")) }); } catch (error) { return ApiErrorResponse.from(error); } }

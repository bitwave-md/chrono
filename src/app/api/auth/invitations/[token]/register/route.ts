import { InvitationRegistrationService } from "@/modules/auth/application/invitation-registration-service";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { RawPasswordInput } from "@/modules/auth/domain/raw-password-input";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new InvitationRegistrationService(); const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ token: string }> }
export async function POST(request: Request, context: Context) { try { origins.assertTrusted(request); const body = await request.json(); const input = new JsonInput(body); return Response.json({ data: await service.register((await context.params).token, { name: input.requiredString("name", 160), password: RawPasswordInput.required(body) }) }, { status: 201 }); } catch (error) { return ApiErrorResponse.from(error); } }

import { PasswordRecoveryService } from "@/modules/auth/application/password-recovery-service";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { RawPasswordInput } from "@/modules/auth/domain/raw-password-input";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new PasswordRecoveryService(); const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ token: string }> }
export async function GET(_request: Request, context: Context) { try { return Response.json({ data: await service.inspect((await context.params).token) }); } catch (error) { return ApiErrorResponse.from(error); } }
export async function POST(request: Request, context: Context) { try { origins.assertTrusted(request); const body = await request.json(); return Response.json({ data: await service.reset((await context.params).token, RawPasswordInput.required(body)) }); } catch (error) { return ApiErrorResponse.from(error); } }

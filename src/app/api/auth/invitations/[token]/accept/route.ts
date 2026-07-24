import { InvitationRegistrationService } from "@/modules/auth/application/invitation-registration-service";
import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new InvitationRegistrationService(); const users = new ServerUserResolver(); const origins = new MutationOriginPolicy();
interface Context { params: Promise<{ token: string }> }
export async function POST(request: Request, context: Context) { try { origins.assertTrusted(request); return Response.json({ data: await service.accept((await context.params).token, await users.requireUserId()) }); } catch (error) { return ApiErrorResponse.from(error); } }

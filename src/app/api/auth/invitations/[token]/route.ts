import { InvitationRegistrationService } from "@/modules/auth/application/invitation-registration-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new InvitationRegistrationService();
interface Context { params: Promise<{ token: string }> }
export async function GET(_request: Request, context: Context) { try { return Response.json({ data: await service.inspect((await context.params).token) }); } catch (error) { return ApiErrorResponse.from(error); } }

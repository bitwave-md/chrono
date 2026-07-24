import { SetupRegistrationService } from "@/modules/auth/application/setup-registration-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";

const service = new SetupRegistrationService();
export async function GET() { try { return Response.json({ data: await service.status() }); } catch (error) { return ApiErrorResponse.from(error); } }

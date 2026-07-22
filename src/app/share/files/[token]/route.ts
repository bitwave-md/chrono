import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { AttachmentShareService } from "@/modules/storage/application/attachment-share-service";
import { fileDownloadResponse } from "@/modules/storage/infrastructure/file-download-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const service = new AttachmentShareService();
interface Context { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const result = await service.publicContent(token);
    return fileDownloadResponse(result.body, result.record, true);
  } catch (error) { return ApiErrorResponse.from(error); }
}

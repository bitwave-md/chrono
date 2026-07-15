import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { TimeCategoryService } from "@/modules/time-tracking/application/time-category-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

export const runtime = "nodejs";

const categoryService = new TimeCategoryService();
const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();

interface TimeCategoryRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  _request: Request,
  context: TimeCategoryRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const categories = await categoryService.list(principal);

    return Response.json({ data: categories });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: TimeCategoryRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const category = await categoryService.create(principal, {
      name: input.requiredString("name", 120),
      key: input.requiredString("key", 63),
      color: input.optionalString("color", 7),
      defaultBillable: input.optionalBoolean("defaultBillable") ?? false,
    });

    return Response.json({ data: category }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

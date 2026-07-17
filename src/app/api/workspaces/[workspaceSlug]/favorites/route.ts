import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { FavoriteService, favoriteTargetTypes } from "@/modules/favorites/application/favorite-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const favorites = new FavoriteService();
const originPolicy = new MutationOriginPolicy();
const principals = new ServerPrincipalResolver();

interface RouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    return Response.json({ data: await favorites.list(principal) });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    originPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principals.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const result = await favorites.set(
      principal,
      {
        targetType: input.requiredEnum("targetType", favoriteTargetTypes),
        targetId: input.requiredUuid("targetId"),
      },
      input.optionalBoolean("favorite") ?? false,
    );
    return Response.json({ data: result });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

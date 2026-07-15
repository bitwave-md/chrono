import { ServerPrincipalResolver } from "@/modules/authorization/application/server-principal-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";
import { TeamService } from "@/modules/teams/application/team-service";

export const runtime = "nodejs";

const mutationOriginPolicy = new MutationOriginPolicy();
const principalResolver = new ServerPrincipalResolver();
const teamService = new TeamService();

interface TeamRouteContext {
  params: Promise<{ workspaceSlug: string }>;
}

export async function GET(
  _request: Request,
  context: TeamRouteContext,
): Promise<Response> {
  try {
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const teams = await teamService.list(principal);

    return Response.json({ data: teams });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

export async function POST(
  request: Request,
  context: TeamRouteContext,
): Promise<Response> {
  try {
    mutationOriginPolicy.assertTrusted(request);
    const { workspaceSlug } = await context.params;
    const principal = await principalResolver.requireWorkspace(workspaceSlug);
    const input = new JsonInput(await request.json());
    const team = await teamService.create(principal, {
      name: input.requiredString("name", 120),
      key: input.requiredString("key", 12),
      description: input.optionalString("description"),
    });

    return Response.json({ data: team }, { status: 201 });
  } catch (error) {
    return ApiErrorResponse.from(error);
  }
}

import { ServerUserResolver } from "@/modules/auth/application/server-user-resolver";
import { MutationOriginPolicy } from "@/modules/auth/domain/mutation-origin-policy";
import { AccountSettingsService, type InterfaceDensity, type IssueViewPreference, type UserTheme } from "@/modules/settings/application/account-settings-service";
import { ApiErrorResponse } from "@/modules/shared/infrastructure/api-error-response";
import { JsonInput } from "@/modules/shared/infrastructure/json-input";

const service = new AccountSettingsService();
const users = new ServerUserResolver();
const origins = new MutationOriginPolicy();
const themes = ["dark", "light", "system"] as const satisfies readonly UserTheme[];
const densities = ["compact", "comfortable"] as const satisfies readonly InterfaceDensity[];
const views = ["list", "board"] as const satisfies readonly IssueViewPreference[];

export async function GET() {
  try { return Response.json({ data: await service.preferences(await users.requireUserId()) }); }
  catch (error) { return ApiErrorResponse.from(error); }
}

export async function PATCH(request: Request) {
  try {
    origins.assertTrusted(request);
    const input = new JsonInput(await request.json());
    return Response.json({ data: await service.updatePreferences(await users.requireUserId(), {
      ...(input.has("theme") ? { theme: input.requiredEnum("theme", themes) } : {}),
      ...(input.has("density") ? { density: input.requiredEnum("density", densities) } : {}),
      ...(input.has("issueView") ? { issueView: input.requiredEnum("issueView", views) } : {}),
      ...(input.has("sidebarCollapsed") ? { sidebarCollapsed: input.optionalBoolean("sidebarCollapsed") ?? false } : {}),
    }) });
  } catch (error) { return ApiErrorResponse.from(error); }
}

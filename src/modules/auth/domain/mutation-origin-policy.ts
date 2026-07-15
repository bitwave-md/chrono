import { ForbiddenError } from "@/modules/shared/application/application-error";

export class MutationOriginPolicy {
  assertTrusted(request: Request): void {
    const configuredUrl = process.env.NEXTAUTH_URL;
    const origin = request.headers.get("origin");

    if (!configuredUrl || !origin) {
      throw new ForbiddenError("A trusted request origin is required.");
    }

    if (new URL(origin).origin !== new URL(configuredUrl).origin) {
      throw new ForbiddenError("The request origin is not trusted.");
    }
  }
}

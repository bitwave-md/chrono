import { ValidationError } from "@/modules/shared/application/application-error";

export class RawPasswordInput {
  static required(value: unknown, key = "password"): string {
    if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>)[key] !== "string") throw new ValidationError(`${key} is required.`);
    return (value as Record<string, unknown>)[key] as string;
  }
}

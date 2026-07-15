import { ValidationError } from "@/modules/shared/application/application-error";
import { EntityId } from "@/modules/shared/domain/entity-id";

export class JsonInput {
  readonly #value: Record<string, unknown>;

  constructor(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ValidationError("The request body must be a JSON object.");
    }

    this.#value = value as Record<string, unknown>;
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#value, key);
  }

  requiredString(key: string, maximumLength = 255): string {
    const value = this.#value[key];

    if (typeof value !== "string" || !value.trim()) {
      throw new ValidationError(`${key} is required.`);
    }

    const normalized = value.trim();

    if (normalized.length > maximumLength) {
      throw new ValidationError(
        `${key} must be at most ${maximumLength} characters.`,
      );
    }

    return normalized;
  }

  optionalString(key: string, maximumLength = 2_000): string | null {
    const value = this.#value[key];

    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new ValidationError(`${key} must be a string.`);
    }

    const normalized = value.trim();

    if (normalized.length > maximumLength) {
      throw new ValidationError(
        `${key} must be at most ${maximumLength} characters.`,
      );
    }

    return normalized || null;
  }

  optionalEnum<T extends string>(
    key: string,
    allowedValues: readonly T[],
  ): T | null {
    const value = this.#value[key];

    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string" || !allowedValues.includes(value as T)) {
      throw new ValidationError(
        `${key} must be one of: ${allowedValues.join(", ")}.`,
      );
    }

    return value as T;
  }

  requiredEnum<T extends string>(
    key: string,
    allowedValues: readonly T[],
  ): T {
    const value = this.optionalEnum(key, allowedValues);

    if (!value) {
      throw new ValidationError(`${key} is required.`);
    }

    return value;
  }

  requiredUuid(key: string): string {
    return new EntityId(this.requiredString(key, 36), key).value;
  }

  optionalUuid(key: string): string | null {
    const value = this.optionalString(key, 36);
    return value ? new EntityId(value, key).value : null;
  }

  requiredInteger(key: string, minimum = Number.MIN_SAFE_INTEGER): number {
    const value = this.#value[key];

    if (!Number.isInteger(value) || (value as number) < minimum) {
      throw new ValidationError(`${key} must be an integer of at least ${minimum}.`);
    }

    return value as number;
  }
}

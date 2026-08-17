import { ValidationError } from "@/modules/shared/application/application-error";
import { EntityId } from "@/modules/shared/domain/entity-id";

export class SearchInput {
  readonly #parameters: URLSearchParams;

  constructor(url: string) {
    this.#parameters = new URL(url).searchParams;
  }

  optionalUuid(key: string): string | undefined {
    const value = this.#parameters.get(key);
    return value ? new EntityId(value, key).value : undefined;
  }

  optionalString(key: string, maximumLength = 255): string | undefined {
    const value = this.#parameters.get(key)?.trim();
    if (!value) return undefined;
    if (value.length > maximumLength) {
      throw new ValidationError(`${key} must be at most ${maximumLength} characters.`);
    }
    return value;
  }

  optionalDateTime(key: string): Date | undefined {
    const value = this.#parameters.get(key);

    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new ValidationError(`${key} must be a valid ISO date-time.`);
    }

    return date;
  }

  requiredDateTime(key: string): Date {
    const value = this.optionalDateTime(key);
    if (!value) throw new ValidationError(`${key} is required.`);
    return value;
  }

  requiredEnum<T extends string>(
    key: string,
    allowedValues: readonly T[],
  ): T {
    const value = this.#parameters.get(key);

    if (!value || !allowedValues.includes(value as T)) {
      throw new ValidationError(
        `${key} must be one of: ${allowedValues.join(", ")}.`,
      );
    }

    return value as T;
  }
}

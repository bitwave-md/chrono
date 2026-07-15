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

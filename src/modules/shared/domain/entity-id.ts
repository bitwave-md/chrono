import { ValidationError } from "@/modules/shared/application/application-error";

export class EntityId {
  readonly value: string;

  constructor(input: string, label = "id") {
    const normalized = input.trim().toLowerCase();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        normalized,
      );

    if (!isUuid) {
      throw new ValidationError(`${label} must be a valid UUID.`);
    }

    this.value = normalized;
  }
}

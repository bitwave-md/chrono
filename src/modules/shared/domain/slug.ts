export abstract class Slug {
  readonly value: string;

  protected constructor(input: string, label: string) {
    const normalized = input.trim().toLowerCase();
    const isValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);

    if (!isValid || normalized.length < 2 || normalized.length > 63) {
      throw new Error(
        `${label} must contain 2-63 lowercase letters, numbers, or hyphens.`,
      );
    }

    this.value = normalized;
  }
}

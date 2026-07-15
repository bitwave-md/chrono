export abstract class UppercaseCode {
  readonly value: string;

  protected constructor(
    input: string,
    label: string,
    minimumLength: number,
    maximumLength: number,
  ) {
    const normalized = input.trim().toUpperCase();
    const isValid = /^[A-Z][A-Z0-9]*$/.test(normalized);

    if (
      !isValid ||
      normalized.length < minimumLength ||
      normalized.length > maximumLength
    ) {
      throw new Error(
        `${label} must contain ${minimumLength}-${maximumLength} uppercase letters or numbers and start with a letter.`,
      );
    }

    this.value = normalized;
  }
}

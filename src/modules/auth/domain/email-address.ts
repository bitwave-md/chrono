export class EmailAddress {
  readonly value: string;

  constructor(input: string) {
    const normalized = input.trim().toLowerCase();

    if (!normalized || !normalized.includes("@")) {
      throw new Error("A valid email address is required.");
    }

    this.value = normalized;
  }
}

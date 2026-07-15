export class WorkspaceSlug {
  readonly value: string;

  constructor(input: string) {
    const normalized = input.trim().toLowerCase();
    const isValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);

    if (!isValid || normalized.length < 2 || normalized.length > 63) {
      throw new Error(
        "Workspace slugs must contain 2-63 lowercase letters, numbers, or hyphens.",
      );
    }

    this.value = normalized;
  }
}

const VERSION_PATTERN = /^v(\d{2})\.([1-9]|1[0-2])\.([1-9]\d*)$/;

export class CalendarVersion {
  private constructor(
    readonly year: number,
    readonly month: number,
    readonly sequence: number,
  ) {}

  static parse(value: string): CalendarVersion | null {
    const match = VERSION_PATTERN.exec(value.trim());
    if (!match) return null;
    return new CalendarVersion(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  static next(date: Date, existing: readonly CalendarVersion[]): CalendarVersion {
    const year = date.getUTCFullYear() % 100;
    const month = date.getUTCMonth() + 1;
    const sequence = existing
      .filter((version) => version.year === year && version.month === month)
      .reduce((highest, version) => Math.max(highest, version.sequence), 0) + 1;
    return new CalendarVersion(year, month, sequence);
  }

  compare(other: CalendarVersion): number {
    return this.year - other.year || this.month - other.month || this.sequence - other.sequence;
  }

  isNewerThan(other: CalendarVersion): boolean {
    return this.compare(other) > 0;
  }

  toString(): string {
    return `v${String(this.year).padStart(2, "0")}.${this.month}.${this.sequence}`;
  }
}

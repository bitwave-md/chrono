import { ValidationError } from "@/modules/shared/application/application-error";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export class ReportCalendar {
  readonly timeZone?: string;
  readonly #dateKeyFormatter?: Intl.DateTimeFormat;
  readonly #timeFormatter?: Intl.DateTimeFormat;

  constructor(timeZone?: string) {
    const normalized = timeZone?.trim() || undefined;
    if (normalized && normalized.length > 100) {
      throw new ValidationError("timeZone must be at most 100 characters.");
    }

    try {
      this.#dateKeyFormatter = normalized ? new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        timeZone: normalized,
        year: "numeric",
      }) : undefined;
      this.#timeFormatter = normalized ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        timeZone: normalized,
      }) : undefined;
    } catch {
      throw new ValidationError("timeZone must be a valid IANA timezone.");
    }

    this.timeZone = normalized;
  }

  dateKey(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("Report dates must be valid.");
    }
    if (!this.#dateKeyFormatter) {
      return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    const parts = Object.fromEntries(
      this.#dateKeyFormatter
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  days(from: Date, to: Date): string[] {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new ValidationError("Report dates must be valid.");
    }
    if (from >= to) return [];

    const first = this.dateKey(from);
    const last = this.dateKey(new Date(to.getTime() - 1));
    const days: string[] = [];
    for (let current = first; current <= last; current = nextDateKey(current)) {
      days.push(current);
    }
    return days;
  }

  shortLabel(key: string): string {
    return shortDateFormatter.format(dateFromKey(key));
  }

  longLabel(key: string): string {
    return longDateFormatter.format(dateFromKey(key));
  }

  dateTimeLabel(date: Date): string {
    const time = this.#timeFormatter
      ? this.#timeFormatter.format(date)
      : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${this.longLabel(this.dateKey(date))} ${time}`;
  }
}

function nextDateKey(key: string): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function dateFromKey(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new ValidationError("Report calendar dates must use YYYY-MM-DD.");
  }
  const date = new Date(`${key}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw new ValidationError("Report calendar date is invalid.");
  }
  return date;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

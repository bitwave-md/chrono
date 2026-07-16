import { ValidationError } from "../../shared/application/application-error.ts";

export const clientIconTypes = ["icon", "emoji"] as const;
export type ClientIconType = (typeof clientIconTypes)[number];

export class ClientIcon {
  readonly type: ClientIconType;
  readonly key: string;
  readonly color: string;

  constructor(type: ClientIconType, key: string, color: string) {
    const normalizedKey = key.trim();
    const normalizedColor = color.trim().toLowerCase();

    if (type === "icon" && !/^[a-z0-9-]{1,80}$/.test(normalizedKey)) {
      throw new ValidationError("Client icon names must use lowercase letters, numbers, or dashes.");
    }

    if (type === "emoji" && (!normalizedKey || [...normalizedKey].length > 8)) {
      throw new ValidationError("Client emojis must contain 1-8 characters.");
    }

    if (!/^#[0-9a-f]{6}$/.test(normalizedColor)) {
      throw new ValidationError("Client icon colors must use a six-digit hex value.");
    }

    this.type = type;
    this.key = normalizedKey;
    this.color = normalizedColor;
  }
}

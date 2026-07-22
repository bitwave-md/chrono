import { createHash, randomBytes } from "node:crypto";

export class ShareToken {
  readonly value: string;
  readonly digest: string;

  private constructor(value: string) {
    this.value = value;
    this.digest = ShareToken.digest(value);
  }

  static create(): ShareToken {
    return new ShareToken(randomBytes(32).toString("base64url"));
  }

  static digest(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }
}

import { extname } from "node:path";

import { ValidationError } from "@/modules/shared/application/application-error";

const unsafeExtensions = new Set([".bat", ".cmd", ".com", ".exe", ".html", ".htm", ".js", ".mjs", ".ps1", ".sh", ".svg"]);
const unsafeTypes = new Set(["image/svg+xml", "text/html", "text/javascript", "application/javascript", "application/x-msdownload"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class UploadPolicy {
  readonly #attachmentLimit: number;
  readonly #imageLimit: number;

  constructor(attachmentLimit = 10 * 1024 * 1024, imageLimit = 5 * 1024 * 1024) {
    this.#attachmentLimit = attachmentLimit;
    this.#imageLimit = imageLimit;
  }

  attachment(filename: string, contentType: string, sizeBytes: number) {
    const metadata = this.#metadata(filename, contentType, sizeBytes, this.#attachmentLimit);
    if (unsafeExtensions.has(extname(metadata.filename).toLowerCase()) || unsafeTypes.has(metadata.contentType)) {
      throw new ValidationError("This file type is not allowed.");
    }
    return metadata;
  }

  image(filename: string, contentType: string, sizeBytes: number) {
    const metadata = this.#metadata(filename, contentType, sizeBytes, this.#imageLimit);
    if (!imageTypes.has(metadata.contentType)) {
      throw new ValidationError("Images must be PNG, JPEG, or WebP.");
    }
    return metadata;
  }

  assertDetectedType(declaredType: string, detectedType: string | undefined) {
    if (detectedType && unsafeTypes.has(detectedType)) throw new ValidationError("The uploaded content is not allowed.");
    if (detectedType && declaredType.startsWith("image/") && detectedType !== declaredType) {
      throw new ValidationError("The uploaded image does not match its declared type.");
    }
  }

  assertSafePrefix(prefix: Uint8Array) {
    const bytes = Buffer.from(prefix);
    const text = bytes.toString("utf8", 0, Math.min(bytes.length, 4_100)).trimStart().toLowerCase();
    if (bytes[0] === 0x4d && bytes[1] === 0x5a) throw new ValidationError("Executable files are not allowed.");
    if (/^(<!doctype\s+html|<html|<script|<svg|#!\s*\/)/.test(text)) {
      throw new ValidationError("This file content is not allowed.");
    }
  }

  #metadata(filenameValue: string, contentTypeValue: string, sizeBytes: number, limit: number) {
    const filename = filenameValue.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 240);
    const contentType = contentTypeValue.split(";", 1)[0]!.trim().toLowerCase();
    if (!filename || filename === "." || filename === "..") throw new ValidationError("A valid filename is required.");
    if (!contentType || contentType.length > 120) throw new ValidationError("A valid content type is required.");
    if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > limit) {
      throw new ValidationError(`Files may not exceed ${Math.floor(limit / 1024 / 1024)} MB.`);
    }
    return { filename, contentType, sizeBytes };
  }
}

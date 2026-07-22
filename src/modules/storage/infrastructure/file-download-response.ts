import type { StoredObjectBody } from "@/modules/storage/infrastructure/object-storage";

export function fileDownloadResponse(
  body: StoredObjectBody,
  metadata: { filename: string; contentType: string; sizeBytes: number },
  publicShare = false,
): Response {
  const asciiName = metadata.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const headers = new Headers({
    "Content-Type": metadata.contentType || "application/octet-stream",
    "Content-Length": String(body.contentLength ?? metadata.sizeBytes),
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(metadata.filename)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (body.etag) headers.set("ETag", body.etag);
  if (publicShare) {
    headers.set("Cache-Control", "no-store");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return new Response(body.stream, { headers });
}

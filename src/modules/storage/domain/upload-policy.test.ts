import assert from "node:assert/strict";
import test from "node:test";

import { UploadPolicy } from "./upload-policy.ts";

test("UploadPolicy accepts ordinary documents within the configured limit", () => {
  assert.deepEqual(new UploadPolicy().attachment("brief.pdf", "application/pdf", 1024), {
    filename: "brief.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
  });
});

test("UploadPolicy rejects unsafe and oversized attachments", () => {
  const policy = new UploadPolicy(10);
  assert.throws(() => policy.attachment("payload.html", "text/html", 5));
  assert.throws(() => policy.attachment("brief.pdf", "application/pdf", 11));
});

test("UploadPolicy restricts identity images", () => {
  const policy = new UploadPolicy();
  assert.equal(policy.image("avatar.png", "image/png", 512).contentType, "image/png");
  assert.throws(() => policy.image("avatar.gif", "image/gif", 512));
  assert.throws(() => policy.assertDetectedType("image/png", "image/jpeg"));
});

test("UploadPolicy rejects executable and active-document prefixes", () => {
  const policy = new UploadPolicy();
  assert.throws(() => policy.assertSafePrefix(Buffer.from("MZ executable")), /Executable/);
  assert.throws(() => policy.assertSafePrefix(Buffer.from("  <!doctype html><html>")), /not allowed/);
  assert.throws(() => policy.assertSafePrefix(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>")), /not allowed/);
  assert.doesNotThrow(() => policy.assertSafePrefix(Buffer.from("ordinary text document")));
});

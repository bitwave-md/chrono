import assert from "node:assert/strict";
import test from "node:test";

import { failureMessage, validateManifest } from "./updater.mjs";

const digest = "a".repeat(64);
const valid = {
  version: "v26.7.1",
  commit: "b".repeat(40),
  images: {
    app: `ghcr.io/bitwave-md/chrono@sha256:${digest}`,
    migrator: `ghcr.io/bitwave-md/chrono-migrator@sha256:${digest}`,
    updater: `ghcr.io/bitwave-md/chrono-updater@sha256:${digest}`,
  },
};

test("updater accepts a matching digest-pinned release manifest", () => {
  assert.deepEqual(validateManifest(valid, "v26.7.1"), valid);
});

test("updater rejects mismatched versions and arbitrary image repositories", () => {
  assert.throws(() => validateManifest(valid, "v26.7.2"), /invalid/);
  assert.throws(() => validateManifest({ ...valid, images: { ...valid.images, app: `ghcr.io/attacker/chrono@sha256:${digest}` } }, "v26.7.1"), /app image/);
});

test("updater reports rollback outcomes without exposing command output", () => {
  assert.match(failureMessage("restarting", "completed"), /restored/);
  assert.match(failureMessage("restarting", "failed"), /operator attention/);
  assert.match(failureMessage("backing_up", "not_needed"), /No changes/);
});

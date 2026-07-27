import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { UpdateControlStore } from "./update-control-store.ts";

test("UpdateControlStore exposes source, manual, and automatic modes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chrono-update-store-"));
  try {
    assert.equal(await new UpdateControlStore({ CHRONO_INSTALL_MODE: "source" }, root).mode(), "source");
    assert.equal(await new UpdateControlStore({ CHRONO_INSTALL_MODE: "image" }, path.join(root, "missing")).mode(), "manual");
    assert.equal(await new UpdateControlStore({ CHRONO_INSTALL_MODE: "image" }, root).mode(), "automatic");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("UpdateControlStore queues one structured latest-release request", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chrono-update-store-"));
  try {
    const store = new UpdateControlStore({ CHRONO_INSTALL_MODE: "image" }, root);
    const job = await store.enqueueLatest("v26.7.1");
    assert.equal(job.stage, "queued");
    await assert.rejects(() => store.enqueueLatest("v26.7.1"), /already queued/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("UpdateControlStore validates persisted status", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chrono-update-store-"));
  const status = path.join(root, "status.json");
  try {
    await mkdir(root, { recursive: true });
    await writeFile(status, JSON.stringify({ id: "job", stage: "pulling", targetVersion: "v26.7.1", message: "Pulling", requestedAt: "2026-07-27T00:00:00Z" }));
    assert.equal((await new UpdateControlStore({}, root, status).readJob())?.stage, "pulling");
    await writeFile(status, JSON.stringify({ id: "job", stage: "arbitrary" }));
    assert.equal(await new UpdateControlStore({}, root, status).readJob(), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});

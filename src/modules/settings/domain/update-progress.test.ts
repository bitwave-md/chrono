import assert from "node:assert/strict";
import test from "node:test";

import type { UpdateJobRecord } from "@/modules/settings/domain/update-job";
import { UpdateProgressModel } from "@/modules/settings/domain/update-progress";

function job(values: Partial<UpdateJobRecord>): UpdateJobRecord {
  return {
    id: "job", stage: "pulling", targetVersion: "v26.7.2", message: "Pulling", requestedAt: "2026-07-28T10:00:00Z",
    startedAt: "2026-07-28T10:00:01Z", completedAt: null, failureStage: null, details: null, rollbackState: null, ...values,
  };
}

test("update progress describes an active stage", () => {
  const model = new UpdateProgressModel(job({}), "v26.7.1");
  assert.equal(model.running, true);
  assert.equal(model.progressSteps.find((step) => step.stage === "pulling")?.state, "active");
  assert.match(model.summary, /downloading/i);
});

test("update progress explains an automatic rollback", () => {
  const model = new UpdateProgressModel(job({ stage: "failed", failureStage: "verifying", rollbackState: "completed" }), "v26.7.1");
  assert.equal(model.tone, "danger");
  assert.match(model.summary, /restored/i);
});

test("update progress recognizes a recovered target build", () => {
  const model = new UpdateProgressModel(job({ stage: "failed", failureStage: "restarting" }), "v26.7.2");
  assert.equal(model.recovered, true);
  assert.equal(model.percentage, 100);
  assert.equal(model.headline, "Update recovered");
});

import assert from "node:assert/strict";
import test from "node:test";

import { notificationRecipients } from "./notification-recipients.ts";

test("Inbox notifications exclude the actor and deduplicate interested members", () => {
  assert.deepEqual(
    notificationRecipients(["creator", "assignee", "assignee", "actor"], "actor"),
    ["creator", "assignee"],
  );
});

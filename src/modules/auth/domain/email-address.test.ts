import assert from "node:assert/strict";
import test from "node:test";

import { EmailAddress } from "./email-address.ts";

test("EmailAddress normalizes surrounding whitespace and casing", () => {
  const email = new EmailAddress("  Owner@Example.COM ");

  assert.equal(email.value, "owner@example.com");
});

test("EmailAddress rejects malformed input", () => {
  assert.throws(() => new EmailAddress("not-an-email"));
});

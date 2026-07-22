import assert from "node:assert/strict";
import test from "node:test";

import { ShareToken } from "./share-token.ts";

test("ShareToken creates an opaque 256-bit value and stable digest", () => {
  const token = ShareToken.create();
  assert.ok(token.value.length >= 43);
  assert.equal(token.digest, ShareToken.digest(token.value));
  assert.notEqual(token.digest, token.value);
});

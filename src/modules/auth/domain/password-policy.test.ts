import test from "node:test";
import assert from "node:assert/strict";
import { PasswordPolicy } from "./password-policy";

test("password policy requires every rule without trimming", () => {
  assert.equal(PasswordPolicy.requirements("StrongPassword1!").every((item) => item.valid), true);
  assert.equal(PasswordPolicy.requirements("short").every((item) => item.valid), false);
  assert.equal(PasswordPolicy.requirements(" StrongPassword1! ").every((item) => item.valid), true);
});

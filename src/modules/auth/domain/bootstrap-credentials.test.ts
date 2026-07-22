import assert from "node:assert/strict";
import test from "node:test";

import { BootstrapCredentials } from "./bootstrap-credentials.ts";

const token = "0123456789abcdef0123456789abcdef";

test("BootstrapCredentials requires a complete strong configuration", () => {
  assert.equal(BootstrapCredentials.fromEnvironment({}), null);
  assert.equal(BootstrapCredentials.fromEnvironment({ AUTH_BOOTSTRAP_EMAIL: "owner@example.com" }), null);
  assert.throws(() => BootstrapCredentials.fromEnvironment({ AUTH_BOOTSTRAP_TOKEN: token }));
  assert.throws(() => BootstrapCredentials.fromEnvironment({ AUTH_BOOTSTRAP_EMAIL: "owner@example.com", AUTH_BOOTSTRAP_TOKEN: "short" }));
});

test("BootstrapCredentials verifies normalized owner input without exposing the token", () => {
  const credentials = BootstrapCredentials.fromEnvironment({
    AUTH_BOOTSTRAP_EMAIL: "Owner@Example.com",
    AUTH_BOOTSTRAP_TOKEN: token,
  });

  assert.equal(credentials?.email, "owner@example.com");
  assert.equal(credentials?.matches(" OWNER@example.com ", token), true);
  assert.equal(credentials?.matches("other@example.com", token), false);
  assert.equal(credentials?.matches("owner@example.com", `${token}x`), false);
});

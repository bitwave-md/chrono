import assert from "node:assert/strict";
import test from "node:test";

import { EmailServerConfiguration } from "./email-server-configuration.ts";

test("EmailServerConfiguration parses a local SMTP service URL", () => {
  assert.deepEqual(
    EmailServerConfiguration.from("smtp://mailpit:1025").toTransportOptions(),
    {
      host: "mailpit",
      port: 1025,
      secure: false,
    },
  );
});

test("EmailServerConfiguration parses secure credentials without legacy url.parse", () => {
  assert.deepEqual(
    EmailServerConfiguration.from(
      "smtps://mailer%40example.com:p%40ss@smtp.example.com",
    ).toTransportOptions(),
    {
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "mailer@example.com",
        pass: "p@ss",
      },
    },
  );
});

test("EmailServerConfiguration rejects non-SMTP protocols", () => {
  assert.throws(
    () => EmailServerConfiguration.from("http://mailpit:1025"),
    /smtp:\/\/ or smtps:\/\//,
  );
});

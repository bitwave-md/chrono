import assert from "node:assert/strict";
import test from "node:test";

import { GitHubReleaseClient } from "./github-release-client.ts";

test("GitHubReleaseClient explains an anonymous 404", async () => {
  const client = new GitHubReleaseClient({}, responder(404, { message: "Not Found" }), silentLogger);
  const result = await client.latest("bitwave-md/chrono");
  assert.equal(result.state, "not_found");
  assert.match(result.message, /private/);
  assert.equal(client.authenticationMode, "anonymous");
});

test("GitHubReleaseClient identifies rate limiting and reset time", async () => {
  const client = new GitHubReleaseClient({}, responder(403, {}, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1784728121" }), silentLogger);
  const result = await client.latest("bitwave-md/chrono");
  assert.equal(result.state, "rate_limited");
  assert.equal(result.rateLimitReset, "2026-07-22T13:48:41.000Z");
});

test("GitHubReleaseClient uses a configured token and returns a release", async () => {
  let authorization: string | null = null;
  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    authorization = new Headers(init?.headers).get("authorization");
    return Response.json([
      release("v26.6.10"),
      release("v26.7.2"),
      release("v26.7.9", { prerelease: true }),
      release("v1.2.3"),
    ]);
  }) as typeof fetch;
  const client = new GitHubReleaseClient({ CHRONO_GITHUB_TOKEN: "secret" }, fetcher, silentLogger);
  const result = await client.latest("bitwave-md/chrono");
  assert.equal(result.state, "available");
  assert.equal(result.release.tag_name, "v26.7.2");
  assert.equal(authorization, "Bearer secret");
  assert.equal(client.authenticationMode, "token");
});

test("GitHubReleaseClient rejects repositories without a stable calendar release", async () => {
  const client = new GitHubReleaseClient({}, (async () => Response.json([
    release("latest"),
    release("v26.7.1", { draft: true }),
  ])) as typeof fetch, silentLogger);
  assert.equal((await client.latest("bitwave-md/chrono")).state, "not_found");
});

function responder(status: number, body: unknown, headers: HeadersInit = {}): typeof fetch {
  return (async () => Response.json(body, { status, headers })) as typeof fetch;
}

const silentLogger = { warn: () => undefined };

function release(tag_name: string, values: Partial<{ draft: boolean; prerelease: boolean }> = {}) {
  return { tag_name, name: tag_name, body: "Notes", published_at: null, html_url: `https://github.com/bitwave-md/chrono/releases/${tag_name}`, draft: values.draft ?? false, prerelease: values.prerelease ?? false };
}

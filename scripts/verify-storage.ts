import assert from "node:assert/strict";

import sharp from "sharp";

const base = "http://localhost:3000";
const email = process.env.AUTH_BOOTSTRAP_EMAIL ?? "owner@btw.md";
const cookies = new Map<string, string>();

function remember(response: Response) {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(";", 1);
    const separator = pair!.indexOf("=");
    cookies.set(pair!.slice(0, separator), pair!.slice(separator + 1));
  }
}

function cookieHeader() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); }

async function authenticated(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { Cookie: cookieHeader(), Origin: base, ...init.headers },
    redirect: "manual",
  });
  remember(response);
  return response;
}

async function data<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticated(path, init);
  const text = await response.text();
  let body: { data?: T; error?: { message?: string } } = {};
  try { body = JSON.parse(text) as typeof body; } catch { assert.fail(`${path}: ${response.status} ${text}`); }
  assert.ok(response.ok, `${path}: ${body.error?.message ?? response.status}`);
  return body.data as T;
}

const start = Date.now();
const csrfResponse = await fetch(`${base}/api/auth/csrf`);
remember(csrfResponse);
const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
const signIn = await fetch(`${base}/api/auth/signin/email`, {
  method: "POST",
  headers: { Cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrfToken, email, callbackUrl: `${base}/app`, json: "true" }),
  redirect: "manual",
});
assert.ok(signIn.status >= 200 && signIn.status < 400, `email sign in failed: ${signIn.status}`);

let link: string | null = null;
for (let attempt = 0; attempt < 20 && !link; attempt += 1) {
  const list = await fetch("http://127.0.0.1:8025/api/v1/messages").then((response) => response.json()) as { messages: Array<{ ID: string; Created: string; To: Array<{ Address: string }> }> };
  const message = list.messages.find((item) => item.To.some((recipient) => recipient.Address === email) && new Date(item.Created).getTime() >= start - 2_000);
  if (message) {
    const detail = await fetch(`http://127.0.0.1:8025/api/v1/message/${message.ID}`).then((response) => response.json()) as { Text: string };
    link = detail.Text.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
  }
  if (!link) await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.ok(link, "Magic-link email was not delivered.");
const callback = await fetch(link, { headers: { Cookie: cookieHeader() }, redirect: "manual" });
remember(callback);
assert.ok(cookieHeader().includes("session-token"), "Authentication session was not created.");

const workspace = "bitwave";
for (const path of ["personal/profile", "personal/preferences", "personal/notifications", "workspace/general", "workspace/members", "workspace/time-entry-types", "administration/storage", "administration/updates"]) {
  const page = await authenticated(`/app/${workspace}/settings/${path}`);
  assert.equal(page.status, 200, `Settings page failed: ${path}`);
}
const updateStatus = await data<{ releaseState: string; releaseMessage: string }>(`/api/workspaces/${workspace}/settings/updates`);
assert.ok(updateStatus.releaseState && updateStatus.releaseMessage, "Release lookup diagnostics are missing.");
const notifications = await data<{ assignments: boolean }>(`/api/workspaces/${workspace}/settings/notifications`);
await data(`/api/workspaces/${workspace}/settings/notifications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: !notifications.assignments }) });
await data(`/api/workspaces/${workspace}/settings/notifications`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments: notifications.assignments }) });
const invitation = await data<{ id: string }>(`/api/workspaces/${workspace}/settings/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `storage-tracer-${Date.now()}@example.com`, role: "member" }) });
await data(`/api/workspaces/${workspace}/settings/invitations/${invitation.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
await data(`/api/workspaces/${workspace}/settings/invitations/${invitation.id}`, { method: "DELETE" });
const category = await data<{ id: string }>(`/api/workspaces/${workspace}/time-categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Storage tracer", key: `storage-tracer-${Date.now()}`, color: "#71717A", defaultBillable: false }) });
await data(`/api/workspaces/${workspace}/time-categories/${category.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Storage tracer updated", archived: true }) });
const issues = await data<Array<{ id: string }>>(`/api/workspaces/${workspace}/issues`);
assert.ok(issues[0], "A demo Issue is required for the storage tracer.");
const issueId = issues[0].id;
const rejected = await authenticated(`/api/workspaces/${workspace}/attachments`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ targetType: "issue", targetId: issueId, filename: "unsafe.html", contentType: "text/html", sizeBytes: 10 }),
});
assert.equal(rejected.status, 400);
const canceled = await data<{ uploadId: string }>(`/api/workspaces/${workspace}/attachments`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ targetType: "issue", targetId: issueId, filename: "cancel-me.txt", contentType: "text/plain", sizeBytes: 4 }),
});
await data(`/api/workspaces/${workspace}/attachments/uploads/${canceled.uploadId}`, { method: "DELETE" });
assert.equal((await authenticated(`/api/workspaces/${workspace}/attachments/uploads/${canceled.uploadId}/content`, { method: "PUT", body: Buffer.from("test") })).status, 404);
const content = Buffer.from("Chrono private attachment tracer\n", "utf8");
const intent = await data<{ uploadId: string; attachmentId: string; uploadUrl: string }>(`/api/workspaces/${workspace}/attachments`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ targetType: "issue", targetId: issueId, filename: "storage-tracer.txt", contentType: "text/plain", sizeBytes: content.length }),
});
await data(intent.uploadUrl, { method: "PUT", body: content });
const attachment = await data<Array<{ id: string; sha256: string }>>(`/api/workspaces/${workspace}/attachments?targetType=issue&targetId=${issueId}`);
assert.ok(attachment.some((item) => item.id === intent.attachmentId && item.sha256), "Uploaded attachment was not finalized.");
const download = await authenticated(`/api/workspaces/${workspace}/attachments/${intent.attachmentId}/content`);
assert.equal(await download.text(), content.toString());
assert.equal(download.headers.get("x-content-type-options"), "nosniff");
assert.match(download.headers.get("content-disposition") ?? "", /^attachment/);
const unauthorized = await fetch(`${base}/api/workspaces/${workspace}/attachments/${intent.attachmentId}/content`);
assert.equal(unauthorized.status, 401);

const share = await data<{ id: string; url: string }>(`/api/workspaces/${workspace}/attachments/${intent.attachmentId}/share-links`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lifetimeSeconds: 3600 }),
});
const publicDownload = await fetch(share.url);
assert.equal(await publicDownload.text(), content.toString());
assert.equal(publicDownload.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
await data(`/api/workspaces/${workspace}/attachments/${intent.attachmentId}/share-links/${share.id}`, { method: "DELETE" });
assert.equal((await fetch(share.url)).status, 404);

const events = await data<Array<{ eventType: string; payload: Record<string, unknown> }>>(`/api/workspaces/${workspace}/issues/${issueId}/activity`);
assert.ok(events.some((event) => event.eventType === "attachment_uploaded" && event.payload.attachmentId === intent.attachmentId), "Issue upload activity was not recorded.");
await data(`/api/workspaces/${workspace}/attachments/${intent.attachmentId}`, { method: "DELETE" });

const profile = await data<{ image: string | null }>("/api/account/profile");
const identityImage = await sharp({ create: { width: 4, height: 4, channels: 4, background: "#6366f1" } }).png().toBuffer();
if (!profile.image) {
  const avatarIntent = await data<{ uploadUrl: string }>("/api/account/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: "avatar.png", contentType: "image/png", sizeBytes: identityImage.length }) });
  await data(avatarIntent.uploadUrl, { method: "PUT", body: identityImage });
  const updated = await data<{ image: string | null }>("/api/account/profile");
  assert.ok(updated.image);
  const imageResponse = await authenticated(updated.image!);
  assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  await data("/api/account/avatar", { method: "DELETE" });
}
const general = await data<{ imageUrl: string | null }>(`/api/workspaces/${workspace}/settings/general`);
if (!general.imageUrl) {
  const iconIntent = await data<{ uploadUrl: string }>(`/api/workspaces/${workspace}/icon`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: "workspace.png", contentType: "image/png", sizeBytes: identityImage.length }) });
  await data(iconIntent.uploadUrl, { method: "PUT", body: identityImage });
  const iconResponse = await authenticated(`/api/workspaces/${workspace}/icon/content`);
  assert.equal(iconResponse.headers.get("content-type"), "image/webp");
  await data(`/api/workspaces/${workspace}/icon`, { method: "DELETE" });
}

const storage = await data<{ healthy: boolean; mode: string }>(`/api/workspaces/${workspace}/settings/storage`);
assert.deepEqual({ healthy: storage.healthy, mode: storage.mode }, { healthy: true, mode: "bundled" });
console.log("Storage, attachment, sharing, activity, identity, and authorization tracer passed.");

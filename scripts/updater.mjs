import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { access, appendFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CalendarVersion } from "../src/modules/settings/domain/calendar-version.ts";

const IMAGE_PATTERNS = {
  app: /^ghcr\.io\/bitwave-md\/chrono@sha256:[a-f0-9]{64}$/,
  migrator: /^ghcr\.io\/bitwave-md\/chrono-migrator@sha256:[a-f0-9]{64}$/,
  updater: /^ghcr\.io\/bitwave-md\/chrono-updater@sha256:[a-f0-9]{64}$/,
};

class JsonFile {
  static async read(file) {
    try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
  }

  static async write(file, value) {
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    await rename(temporary, file);
  }
}

class ReleaseResolver {
  #repository;
  #token;

  constructor(repository = process.env.CHRONO_RELEASE_REPOSITORY || "bitwave-md/chrono") {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("Invalid release repository.");
    this.#repository = repository;
    this.#token = process.env.CHRONO_GITHUB_TOKEN?.trim() || null;
  }

  async resolve(requestedVersion = null) {
    const releases = await this.#json(`https://api.github.com/repos/${this.#repository}/releases?per_page=100`);
    if (!Array.isArray(releases)) throw new Error("GitHub returned an invalid release list.");
    const stable = releases
      .filter((release) => !release.draft && !release.prerelease && CalendarVersion.parse(release.tag_name))
      .sort((left, right) => CalendarVersion.parse(right.tag_name).compare(CalendarVersion.parse(left.tag_name)));
    const release = requestedVersion ? stable.find((item) => item.tag_name === requestedVersion) : stable[0];
    if (!release) throw new Error(requestedVersion ? `Published release ${requestedVersion} was not found.` : "No official Chrono release is available.");
    const asset = release.assets?.find((item) => item.name === "chrono-release.json");
    if (!asset?.browser_download_url) throw new Error(`Release ${release.tag_name} has no update manifest.`);
    const manifest = await this.#json(asset.browser_download_url, false);
    return validateManifest(manifest, release.tag_name);
  }

  async #json(url, githubApi = true) {
    const response = await fetch(url, {
      headers: githubApi ? {
        Accept: "application/vnd.github+json",
        "User-Agent": "chrono-updater",
        ...(this.#token ? { Authorization: `Bearer ${this.#token}` } : {}),
      } : { Accept: "application/json", "User-Agent": "chrono-updater" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Release service returned HTTP ${response.status}.`);
    return response.json();
  }
}

class EnvironmentFile {
  #file;

  constructor(file) { this.#file = file; }

  async snapshot() {
    const values = parseEnvironment(await readFile(this.#file, "utf8"));
    return Object.fromEntries(["CHRONO_VERSION", "CHRONO_APP_REF", "CHRONO_MIGRATOR_REF", "CHRONO_UPDATER_REF"].map((key) => [key, values.get(key) ?? null]));
  }

  async install(values) {
    const source = await readFile(this.#file, "utf8");
    const replacements = new Map(Object.entries(values));
    const seen = new Set();
    const lines = source.split(/\r?\n/).filter((line, index, all) => index < all.length - 1 || line.length > 0).map((line) => {
      const key = line.match(/^([A-Z0-9_]+)=/)?.[1];
      if (!key || !replacements.has(key)) return line;
      seen.add(key);
      const value = replacements.get(key);
      return value ? `${key}=${value}` : null;
    }).filter((line) => line !== null);
    for (const [key, value] of replacements) if (!seen.has(key) && value) lines.push(`${key}=${value}`);
    const temporary = `${this.#file}.${process.pid}.tmp`;
    await writeFile(temporary, `${lines.join("\n")}\n`, { mode: 0o600 });
    await rename(temporary, this.#file);
  }
}

class CommandRunner {
  #cwd;
  #logFile;

  constructor(cwd, logFile) { this.#cwd = cwd; this.#logFile = logFile; }

  run(command, args, environment = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: this.#cwd, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
      let output = "";
      const record = (chunk) => { const text = chunk.toString(); output = `${output}${text}`.slice(-8_000); void appendFile(this.#logFile, text); };
      child.stdout.on("data", record); child.stderr.on("data", record);
      child.on("error", reject);
      child.on("exit", (code) => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} failed (${code}). ${output.slice(-1_500)}`)));
    });
  }
}

class UpdateAgent {
  #installDir;
  #requestDir;
  #statusDir;
  #pendingFile;
  #processingFile;
  #statusFile;
  #environment;
  #releases;
  #commands;

  constructor() {
    this.#installDir = process.env.CHRONO_INSTALL_DIR || process.cwd();
    this.#requestDir = process.env.CHRONO_AGENT_REQUEST_DIR || process.env.CHRONO_UPDATE_REQUEST_DIR || "/var/lib/chrono-update";
    this.#statusDir = process.env.CHRONO_AGENT_STATUS_DIR || process.env.CHRONO_STATUS_DIR || "/var/lib/chrono";
    this.#pendingFile = path.join(this.#requestDir, "pending.json");
    this.#processingFile = path.join(this.#requestDir, "processing.json");
    this.#statusFile = path.join(this.#statusDir, "update-status.json");
    this.#environment = new EnvironmentFile(path.join(this.#installDir, ".env"));
    this.#releases = new ReleaseResolver();
    this.#commands = new CommandRunner(this.#installDir, path.join(this.#statusDir, "update.log"));
  }

  async watch() {
    await Promise.all([mkdir(this.#requestDir, { recursive: true }), mkdir(this.#statusDir, { recursive: true })]);
    while (true) {
      const request = await this.#takeRequest();
      if (request) await this.#process(request);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  async enqueue(version = null) {
    await mkdir(this.#requestDir, { recursive: true });
    const manifest = await this.#releases.resolve(version);
    const request = { id: randomUUID(), action: version ? "install_version" : "install_latest", targetVersion: manifest.version, requestedAt: new Date().toISOString() };
    await writeFile(this.#pendingFile, `${JSON.stringify(request)}\n`, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${request.id}\n`);
  }

  async #takeRequest() {
    const processing = await JsonFile.read(this.#processingFile);
    if (processing) return processing;
    try { await rename(this.#pendingFile, this.#processingFile); } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
    return JsonFile.read(this.#processingFile);
  }

  async #process(request) {
    const startedAt = request.startedAt || new Date().toISOString();
    let stage = "validating";
    let previous = null;
    let releaseInstalled = false;
    try {
      if (!request.id || !CalendarVersion.parse(request.targetVersion)) throw new Error("The update request is invalid.");
      previous = request.previousEnvironment || await this.#environment.snapshot();
      if (!request.previousEnvironment) {
        request = { ...request, previousEnvironment: previous, startedAt };
        await JsonFile.write(this.#processingFile, request);
      }
      await this.#status(request, stage, "Validating the official release.", startedAt);
      const manifest = await this.#releases.resolve(request.action === "install_latest" ? null : request.targetVersion);
      if (manifest.version !== request.targetVersion) throw new Error("The requested release is no longer the latest official version.");
      const installed = CalendarVersion.parse(previous.CHRONO_VERSION || "");
      const target = CalendarVersion.parse(manifest.version);
      if (installed && target.compare(installed) < 0) throw new Error("Chrono refuses automatic downgrades.");
      const releaseEnvironment = environmentFromManifest(manifest);

      stage = "backing_up"; await this.#status(request, stage, "Creating a coordinated backup.", startedAt);
      await this.#commands.run(path.join(this.#installDir, "backup.sh"), []);
      stage = "pulling"; await this.#status(request, stage, "Pulling verified release images.", startedAt);
      for (const reference of [manifest.images.app, manifest.images.migrator, manifest.images.updater]) {
        await this.#commands.run("docker", ["pull", reference]);
      }
      stage = "migrating"; await this.#status(request, stage, "Applying database migrations.", startedAt);
      await this.#commands.run("docker", ["compose", "run", "--rm", "--no-deps", "migrate"], releaseEnvironment);
      await this.#environment.install(releaseEnvironment);
      releaseInstalled = true;
      stage = "restarting"; await this.#status(request, stage, "Restarting Chrono.", startedAt);
      await this.#commands.run("docker", ["compose", "up", "-d", "--no-deps", "app"]);
      stage = "verifying"; await this.#status(request, stage, "Waiting for the new application to become healthy.", startedAt);
      if (!await applicationHealthy()) {
        throw new Error("The new application did not pass its health check.");
      }
      await this.#status(request, "completed", `Chrono ${manifest.version} is healthy.`, startedAt, new Date().toISOString());
      await rm(this.#processingFile, { force: true });
      await this.#commands.run("docker", ["compose", "up", "-d", "--no-deps", "updater"]).catch(() => undefined);
    } catch (error) {
      const details = error instanceof Error ? error.message : "The update failed.";
      const rollbackState = releaseInstalled && previous ? await this.#rollback(previous) : "not_needed";
      await this.#status(request, "failed", failureMessage(stage, rollbackState), startedAt, new Date().toISOString(), stage, { details, rollbackState });
      await rm(this.#processingFile, { force: true });
    }
  }

  async #rollback(previous) {
    try {
      await this.#environment.install(previous);
      await this.#commands.run("docker", ["compose", "up", "-d", "--no-deps", "app"]);
      return await applicationHealthy() ? "completed" : "failed";
    } catch (error) {
      await appendFile(path.join(this.#statusDir, "update.log"), `\nAutomatic rollback failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      return "failed";
    }
  }

  async #status(request, stage, message, startedAt, completedAt = null, failureStage = null, metadata = {}) {
    await JsonFile.write(this.#statusFile, { id: request.id, stage, targetVersion: request.targetVersion, message, requestedAt: request.requestedAt, startedAt, completedAt, failureStage, ...metadata });
  }
}

function failureMessage(stage, rollbackState) {
  if (rollbackState === "completed") return "The update stopped and Chrono restored the previous version.";
  if (rollbackState === "failed") return "The update stopped and automatic recovery needs operator attention.";
  const messages = {
    validating: "The official release could not be validated. No changes were made.",
    backing_up: "The safety backup could not be created. No changes were made.",
    pulling: "The release could not be downloaded. No changes were made.",
    migrating: "The database update could not be completed. The current app remains active.",
  };
  return messages[stage] || "The update stopped before the new version was activated.";
}

function validateManifest(value, expectedVersion) {
  if (!value || value.version !== expectedVersion || !CalendarVersion.parse(value.version) || !/^[a-f0-9]{40}$/.test(value.commit || "")) throw new Error("The release manifest is invalid.");
  for (const [name, pattern] of Object.entries(IMAGE_PATTERNS)) if (!pattern.test(value.images?.[name] || "")) throw new Error(`The ${name} image reference is invalid.`);
  return { version: value.version, commit: value.commit, images: value.images };
}

function environmentFromManifest(manifest) {
  return { CHRONO_VERSION: manifest.version, CHRONO_APP_REF: manifest.images.app, CHRONO_MIGRATOR_REF: manifest.images.migrator, CHRONO_UPDATER_REF: manifest.images.updater };
}

function parseEnvironment(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) { const match = /^([A-Z0-9_]+)=(.*)$/.exec(line); if (match) values.set(match[1], match[2]); }
  return values;
}

async function applicationHealthy() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { if ((await fetch("http://app:3000/api/health", { signal: AbortSignal.timeout(3_000) })).ok) return true; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const agent = new UpdateAgent();
  const command = process.argv[2] || "watch";
  if (command === "watch") await agent.watch();
  else if (command === "enqueue") await agent.enqueue(process.argv[3] || null);
  else if (command === "check") { await access(process.env.CHRONO_INSTALL_DIR || process.cwd(), constants.R_OK | constants.W_OK); }
  else throw new Error(`Unknown updater command: ${command}`);
}

export { JsonFile, ReleaseResolver, failureMessage, validateManifest };

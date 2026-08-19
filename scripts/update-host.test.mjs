import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const sourceScript = new URL("./update.sh", import.meta.url);

test("host update helper queues through a healthy updater from any directory", async () => {
  const fixture = await UpdateHostFixture.create(false);
  try {
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /update queued/);
    assert.match(result.stdout, /completed successfully/);
    assert.equal(await fixture.repairWasUsed(), false);
  } finally { await fixture.remove(); }
});

test("host update helper repairs a missing updater before queueing", async () => {
  const fixture = await UpdateHostFixture.create(true);
  try {
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /repairing the update control plane/);
    assert.match(result.stdout, /completed successfully/);
    assert.equal(await fixture.repairWasUsed(), true);
  } finally { await fixture.remove(); }
});

class UpdateHostFixture {
  constructor(root, installDirectory, binaryDirectory, statusDirectory, repairMarker, repairRequired) {
    this.root = root;
    this.installDirectory = installDirectory;
    this.binaryDirectory = binaryDirectory;
    this.statusDirectory = statusDirectory;
    this.repairMarker = repairMarker;
    this.repairRequired = repairRequired;
  }

  static async create(repairRequired) {
    const root = await mkdtemp(path.join(os.tmpdir(), "chrono-host-update-"));
    const installDirectory = path.join(root, "chrono");
    const binaryDirectory = path.join(root, "bin");
    const statusDirectory = path.join(installDirectory, "data", "status");
    const repairMarker = path.join(root, "repaired");
    await Promise.all([mkdir(binaryDirectory), mkdir(statusDirectory, { recursive: true })]);
    await writeFile(path.join(installDirectory, "compose.yaml"), "services: {}\n");
    await writeFile(path.join(installDirectory, ".env"), `CHRONO_INSTALL_MODE=image\nCHRONO_STATUS_DIR=${statusDirectory}\n`);
    await writeFile(path.join(installDirectory, "update.sh"), await readFile(sourceScript, "utf8"));
    await chmod(path.join(installDirectory, "update.sh"), 0o700);
    const fixture = new UpdateHostFixture(root, installDirectory, binaryDirectory, statusDirectory, repairMarker, repairRequired);
    await fixture.writeDocker();
    if (repairRequired) await fixture.writeRepairAssets();
    return fixture;
  }

  run() {
    return spawnSync("sh", [path.join(this.installDirectory, "update.sh")], {
      cwd: this.root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${this.binaryDirectory}:${process.env.PATH}`,
        TEST_REPAIR_REQUIRED: this.repairRequired ? "1" : "0",
        TEST_REPAIR_MARKER: this.repairMarker,
        TEST_STATUS_DIR: this.statusDirectory,
        TEST_RELEASE_ASSETS: path.join(this.root, "release"),
      },
    });
  }

  async repairWasUsed() {
    try { await readFile(this.repairMarker); return true; } catch { return false; }
  }

  async remove() { await rm(this.root, { recursive: true, force: true }); }

  async writeDocker() {
    const script = `#!/bin/sh
case "$*" in
  "compose config --services") printf 'updater\\n' ;;
  "compose up -d --no-deps updater")
    if [ "$TEST_REPAIR_REQUIRED" = "1" ] && [ ! -f "$TEST_REPAIR_MARKER" ]; then exit 1; fi ;;
  *" updater node /opt/chrono/scripts/updater.mjs doctor")
    if [ "$TEST_REPAIR_REQUIRED" = "1" ] && [ ! -f "$TEST_REPAIR_MARKER" ]; then exit 1; fi ;;
  *" updater node /opt/chrono/scripts/updater.mjs enqueue"*)
    printf '%s\\n' '{"id":"job-id","stage":"completed","targetVersion":"v26.8.3","message":"Healthy","requestedAt":"2026-08-19T00:00:00Z"}' > "$TEST_STATUS_DIR/update-status.json"
    printf 'job-id\\n' ;;
esac
exit 0
`;
    await writeFile(path.join(this.binaryDirectory, "docker"), script);
    await chmod(path.join(this.binaryDirectory, "docker"), 0o700);
  }

  async writeRepairAssets() {
    const release = path.join(this.root, "release");
    await mkdir(release);
    const bootstrap = "#!/bin/sh\nprintf repaired > \"$TEST_REPAIR_MARKER\"\n";
    await writeFile(path.join(release, "bootstrap-update.sh"), bootstrap);
    await chmod(path.join(release, "bootstrap-update.sh"), 0o700);
    const digest = createHash("sha256").update(bootstrap).digest("hex");
    await writeFile(path.join(release, "checksums.sha256"), `${digest}  bootstrap-update.sh\n`);
    const curl = `#!/bin/sh
url=""; output=""
while [ "$#" -gt 0 ]; do
  case "$1" in -o) shift; output=$1;; http*) url=$1;; esac
  shift
done
cp "$TEST_RELEASE_ASSETS/\${url##*/}" "$output"
`;
    await writeFile(path.join(this.binaryDirectory, "curl"), curl);
    await chmod(path.join(this.binaryDirectory, "curl"), 0o700);
  }
}

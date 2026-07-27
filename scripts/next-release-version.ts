import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { CalendarVersion } from "../src/modules/settings/domain/calendar-version.ts";

const tags = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((tag) => CalendarVersion.parse(tag))
  .filter((version): version is CalendarVersion => Boolean(version));
const version = CalendarVersion.next(new Date(), tags).toString();
process.stdout.write(`${version}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);

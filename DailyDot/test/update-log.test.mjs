import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  STATS_END,
  STATS_START,
  calculateStreaks,
  dateInTimeZone,
  isoWeekFor,
  updateRepository,
} from "../scripts/update-log.mjs";

test("uses the Asia/Kolkata calendar across UTC midnight boundaries", () => {
  const instant = new Date("2026-08-21T18:47:00.000Z");
  assert.equal(dateInTimeZone(instant, "Asia/Kolkata"), "2026-08-22");
});

test("calculates current and longest streaks", () => {
  const entries = [
    { date: "2026-08-01" },
    { date: "2026-08-02" },
    { date: "2026-08-04" },
    { date: "2026-08-05" },
    { date: "2026-08-06" },
  ];

  assert.deepEqual(calculateStreaks(entries), {
    total: 5,
    current: 3,
    longest: 3,
    latest: "2026-08-06",
  });
});

test("calculates an ISO week at a year boundary", () => {
  assert.equal(isoWeekFor("2027-01-01"), "2026-W53");
});

test("updates files once and stays idempotent on a duplicate date", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dailydot-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(path.join(root, "data"));
  await writeFile(
    path.join(root, "data", "activity.json"),
    `${JSON.stringify({ version: 1, timezone: "Asia/Kolkata", entries: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "README.md"),
    `# Test\n\n${STATS_START}\nplaceholder\n${STATS_END}\n`,
  );

  const first = await updateRepository({
    root,
    date: "2026-08-21",
    timeZone: "Asia/Kolkata",
    source: "test",
  });
  assert.deepEqual(first, { added: true, changed: true, date: "2026-08-21" });

  const activity = JSON.parse(await readFile(path.join(root, "data", "activity.json"), "utf8"));
  assert.equal(activity.entries.length, 1);
  assert.equal(activity.entries[0].weekday, "Friday");
  assert.equal(activity.entries[0].dayOfYear, 233);

  const readmeAfterFirstRun = await readFile(path.join(root, "README.md"), "utf8");
  assert.match(readmeAfterFirstRun, /\| 1 \| 1 day \| 1 day \| 2026-08-21 \|/);

  const second = await updateRepository({
    root,
    date: "2026-08-21",
    timeZone: "Asia/Kolkata",
    source: "test",
  });
  assert.deepEqual(second, { added: false, changed: false, date: "2026-08-21" });
});

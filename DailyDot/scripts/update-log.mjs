import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATS_START = "<!-- DAILY_STATS_START -->";
export const STATS_END = "<!-- DAILY_STATS_END -->";

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_NOTE = "Automated daily development check-in";

export function dateInTimeZone(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function assertValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date "${date}". Expected YYYY-MM-DD.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid calendar date "${date}".`);
  }
}

function utcDate(date) {
  return new Date(`${date}T12:00:00.000Z`);
}

export function weekdayFor(date) {
  assertValidDate(date);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(utcDate(date));
}

export function dayOfYearFor(date) {
  assertValidDate(date);
  const current = new Date(`${date}T00:00:00.000Z`);
  const start = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  return Math.floor((current - start) / 86_400_000) + 1;
}

export function isoWeekFor(date) {
  assertValidDate(date);
  const current = new Date(`${date}T00:00:00.000Z`);
  const weekday = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((current - yearStart) / 86_400_000 + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function daysBetween(first, second) {
  const start = new Date(`${first}T00:00:00.000Z`);
  const end = new Date(`${second}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000);
}

export function calculateStreaks(entries) {
  const dates = [...new Set(entries.map(({ date }) => date))].sort();
  if (dates.length === 0) {
    return { total: 0, current: 0, longest: 0, latest: null };
  }

  let running = 1;
  let longest = 1;

  for (let index = 1; index < dates.length; index += 1) {
    if (daysBetween(dates[index - 1], dates[index]) === 1) {
      running += 1;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
  }

  return {
    total: dates.length,
    current: running,
    longest,
    latest: dates.at(-1),
  };
}

export function renderStats(entries, timeZone = DEFAULT_TIMEZONE) {
  const stats = calculateStreaks(entries);
  const latest = stats.latest ?? "Not started";

  return `${STATS_START}
## Activity snapshot

| Logged days | Current streak | Longest streak | Latest entry |
| ---: | ---: | ---: | :--- |
| ${stats.total} | ${stats.current} day${stats.current === 1 ? "" : "s"} | ${stats.longest} day${stats.longest === 1 ? "" : "s"} | ${latest} |

_Generated automatically from \`data/activity.json\` using the ${timeZone} calendar._
${STATS_END}`;
}

function replaceStats(readme, statsBlock) {
  const startIndex = readme.indexOf(STATS_START);
  const endIndex = readme.indexOf(STATS_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("README.md is missing the DailyDot stats markers.");
  }

  const afterEnd = endIndex + STATS_END.length;
  return `${readme.slice(0, startIndex)}${statsBlock}${readme.slice(afterEnd)}`;
}

export async function updateRepository({
  root,
  date,
  timeZone = DEFAULT_TIMEZONE,
  source = "local",
  note = DEFAULT_NOTE,
}) {
  assertValidDate(date);

  const activityPath = path.join(root, "data", "activity.json");
  const readmePath = path.join(root, "README.md");
  const [activityText, readme] = await Promise.all([
    readFile(activityPath, "utf8"),
    readFile(readmePath, "utf8"),
  ]);

  const activity = JSON.parse(activityText);
  if (!Array.isArray(activity.entries)) {
    throw new Error("data/activity.json must contain an entries array.");
  }

  const alreadyLogged = activity.entries.some((entry) => entry.date === date);
  if (!alreadyLogged) {
    activity.entries.push({
      date,
      weekday: weekdayFor(date),
      isoWeek: isoWeekFor(date),
      dayOfYear: dayOfYearFor(date),
      source,
      note,
    });
  }

  activity.version = 1;
  activity.timezone = timeZone;
  activity.entries.sort((first, second) => first.date.localeCompare(second.date));

  const nextActivityText = `${JSON.stringify(activity, null, 2)}\n`;
  const nextReadme = replaceStats(readme, renderStats(activity.entries, timeZone));
  const activityChanged = nextActivityText !== activityText;
  const readmeChanged = nextReadme !== readme;

  if (activityChanged) {
    await writeFile(activityPath, nextActivityText, "utf8");
  }
  if (readmeChanged) {
    await writeFile(readmePath, nextReadme, "utf8");
  }

  return {
    added: !alreadyLogged,
    changed: activityChanged || readmeChanged,
    date,
  };
}

function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--date" || argument === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${argument} requires a value.`);
      }
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument "${argument}".`);
    }
  }

  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const timeZone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
  const date = options.date || dateInTimeZone(new Date(), timeZone);
  const root = path.resolve(options.root || process.cwd());
  const source = process.env.GITHUB_EVENT_NAME || "local";
  const note = process.env.DAILY_LOG_NOTE || DEFAULT_NOTE;
  const result = await updateRepository({ root, date, timeZone, source, note });

  if (result.added) {
    console.log(`Added DailyDot entry for ${result.date}.`);
  } else if (result.changed) {
    console.log(`Refreshed DailyDot statistics for ${result.date}.`);
  } else {
    console.log(`DailyDot entry for ${result.date} already exists.`);
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

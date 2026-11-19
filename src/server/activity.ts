/**
 * OpenCode Go usage for one account, read from the Console's activity API.
 *
 * `GET /api/activity/go` answers with the plan period's daily totals (tokens, requests, cost)
 * and the per-model request counts for that period. The Console reports one entry per day, so
 * every range is a slice of those days; there is no finer grain than a day.
 *
 * Only a Console sign-in can read this: a Go API key resolves the plan limits but not the
 * activity. A good answer is cached for a minute per account and range, so a panel redraw or
 * the range buttons do not ask twice.
 */
import type { Plugin } from "@opencode/plugin";
import type { UsageDayRow, UsageModelRow, UsageRange, UsageReport } from "../types.js";
import { getConsoleJson, resolveConsoleAccess } from "./quota.js";

const CACHE_MS = 60_000;

/** A guard against a malformed reply: the panel never needs more days than this. */
const MAX_DAYS = 4000;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

type Activity = {
  days: UsageDayRow[];
  models: UsageModelRow[];
  planStartsAt?: string;
};

const cache = new Map<string, { at: number; report: UsageReport }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The API sends numbers as strings; anything else is a reply we do not understand. */
function count(value: unknown): number | undefined {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : (value as number);
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** `/api/activity/go`: `{ startsAt, daily: [...], models: [...] }`. */
function parseActivity(json: unknown): Activity | undefined {
  if (!isRecord(json) || !Array.isArray(json.daily)) return undefined;

  const days: UsageDayRow[] = [];
  for (const row of json.daily) {
    if (!isRecord(row)) return undefined;
    const date = row.date;
    if (typeof date !== "string" || !DAY.test(date)) return undefined;
    const tokens = count(row.totalTokens);
    const requests = count(row.totalRequests);
    const cost = count(row.totalCostMicroCents);
    if (tokens === undefined || requests === undefined || cost === undefined) return undefined;
    days.push({ date, tokens, requests, costMicroCents: cost });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  const models: UsageModelRow[] = [];
  if (Array.isArray(json.models)) {
    for (const row of json.models) {
      if (!isRecord(row)) continue;
      const providerID = row.provider;
      const modelID = row.model;
      const requests = count(row.totalRequests);
      if (typeof providerID !== "string" || providerID === "") continue;
      if (typeof modelID !== "string" || modelID === "") continue;
      if (requests === undefined) continue;
      models.push({ providerID, modelID, requests });
    }
    models.sort(
      (a, b) => b.requests - a.requests || a.modelID.localeCompare(b.modelID),
    );
  }

  return {
    days,
    models,
    ...(typeof json.startsAt === "string" ? { planStartsAt: json.startsAt } : {}),
  };
}

/** The days of `range`, taken from the end of the plan period the Console reports. */
function windowDays(range: UsageRange, days: UsageDayRow[]): UsageDayRow[] {
  if (days.length === 0) return [];
  if (range === "all") return days.slice(-MAX_DAYS);
  if (range === "today") return days.slice(-1);
  if (range === "7d") return days.slice(-7);
  if (range === "30d") return days.slice(-30);
  // "month": the calendar month of the latest day the Console reported.
  const month = days[days.length - 1].date.slice(0, 7);
  return days.filter((day) => day.date.startsWith(month));
}

function totalsOf(days: UsageDayRow[]): {
  tokens: number;
  requests: number;
  costMicroCents: number;
} {
  const totals = { tokens: 0, requests: 0, costMicroCents: 0 };
  for (const day of days) {
    totals.tokens += day.tokens;
    totals.requests += day.requests;
    totals.costMicroCents += day.costMicroCents;
  }
  return totals;
}

/**
 * The usage report for one range and account. Never throws: a missing sign-in, an account
 * without a Go plan and a failed request each come back as a report with `state` and a short
 * message.
 */
export async function readGoActivity(
  ctx: Plugin.Context,
  input: { range: UsageRange; accountID?: string },
  signal?: AbortSignal,
): Promise<UsageReport> {
  const key = `${input.accountID ?? "auto"}|${input.range}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.report;

  const now = Date.now();
  const access = await resolveConsoleAccess(ctx, input.accountID);
  if (!access.ok) {
    return {
      range: input.range,
      state: access.state,
      message: access.message,
      generatedAtMs: now,
    };
  }

  const reply = await getConsoleJson(access.value, "/api/activity/go", signal);
  if (!reply.ok) {
    return {
      range: input.range,
      state: reply.notSubscribed ? "not-subscribed" : "error",
      message: reply.notSubscribed
        ? "This account has no active OpenCode Go plan."
        : reply.message,
      generatedAtMs: now,
    };
  }

  // The Console answers `null` for a sign-in without a Go plan; a real reply always has days.
  if (reply.json === null) {
    return {
      range: input.range,
      state: "not-subscribed",
      message: "This account has no active OpenCode Go plan.",
      generatedAtMs: now,
    };
  }

  const activity = parseActivity(reply.json);
  if (!activity) {
    return {
      range: input.range,
      state: "error",
      message: "The Console reply did not have the daily usage",
      generatedAtMs: Date.now(),
    };
  }

  const days = windowDays(input.range, activity.days);
  const report: UsageReport = {
    range: input.range,
    state: "ok",
    generatedAtMs: now,
    ...(activity.planStartsAt ? { planStartsAt: activity.planStartsAt } : {}),
    totals: totalsOf(days),
    models: activity.models,
    days,
  };
  cache.set(key, { at: Date.now(), report });
  return report;
}

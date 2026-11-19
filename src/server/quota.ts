/**
 * OpenCode Go plan limits: the rolling five-hour, weekly and monthly windows.
 *
 * An account is a credential OpenCode already stores:
 * - a Console sign-in (`opencode` integration, OAuth), read from `<console>/api/go/status`;
 * - a Go API key (`opencode-go` integration, key), read from the same status route, which also
 *   accepts a key and reports the subscriber id. The key's percent-only usage route is a fallback.
 *
 * Credentials that resolve to the same Console subscriber id are one account: a Console sign-in
 * and one or more keys for the same Go plan are grouped in the picker and the chip, while their
 * individual credential ids still work when reading one account.
 *
 * The account list comes from OpenCode's integration API, which owns the credentials and
 * resolves the one the user picks. This plugin never opens the credential table, never writes
 * it, never activates a credential and never logs a secret: a failure carries a short message
 * with the credential replaced by `[redacted]`.
 *
 * A request goes to the OpenCode Console only (an `https` server from the login's metadata,
 * else opencode.ai), without following redirects, with a timeout and a small response cap.
 * Answers are cached briefly per account (a minute for a good answer, ten seconds for a
 * failure), so a panel redraw or the chip on the tab strip does not ask twice.
 */
import type { Plugin } from "@opencode/plugin";
import type {
  QuotaAccount,
  QuotaAccountLimits,
  QuotaAccountMethod,
  QuotaAccounts,
  QuotaLimits,
  QuotaReport,
  QuotaWindow,
  QuotaWindowKey,
} from "../types.js";

const WINDOW_ORDER: readonly QuotaWindowKey[] = ["rolling", "weekly", "monthly"];

const CONSOLE_METER: Record<QuotaWindowKey, string> = {
  rolling: "fiveHour",
  weekly: "week",
  monthly: "month",
};

/** The Go API key route. */
const GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
/** The Console login's default server; `metadata.server` replaces it for self-hosted setups. */
const CONSOLE_BASE_URL = "https://opencode.ai/console";

const CACHE_OK_MS = 60_000;
const CACHE_FAIL_MS = 10_000;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_BYTES = 256 * 1024;
const MAX_MESSAGE = 160;

/** An ISO timestamp with `Z` or a numeric offset, so it can never mean "local time". */
const OFFSET_ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

type ResolvableConnection = Parameters<
  Plugin.Context["integration"]["connection"]["resolve"]
>[0];

type AccountEntry = {
  account: QuotaAccount;
  connection: ResolvableConnection;
};

type Scan = {
  entries: AccountEntry[];
  defaultID?: string;
};

type Reply =
  | { ok: true; json: unknown }
  | {
      ok: false;
      status?: number;
      message: string;
      notSubscribed?: boolean;
    };

const cache = new Map<string, { at: number; report: QuotaReport }>();

/** The cached answer for a key while it is fresh, else undefined. */
function cachedReport(cacheKey: string, force: boolean): QuotaReport | undefined {
  if (force) return undefined;
  const cached = cache.get(cacheKey);
  if (!cached) return undefined;
  const ttl = cached.report.state === "ok" ? CACHE_OK_MS : CACHE_FAIL_MS;
  return Date.now() - cached.at < ttl ? cached.report : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Text safe to show: the credential removed, control characters flattened, length capped. */
function clean(text: string, secret?: string): string {
  const redacted = secret ? text.split(secret).join("[redacted]") : text;
  return redacted
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE);
}

function isValidOffsetIsoTimestamp(value: string): boolean {
  const match = OFFSET_ISO_TIMESTAMP.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [0, 31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysInMonth[month] ?? 0) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  );
}

function isoOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string" || !isValidOffsetIsoTimestamp(value)) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : (value as number);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function percentOf(used: number, limit: number): number {
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

function windowRow(
  key: QuotaWindowKey,
  usedPercent: number,
  resetsAt: string,
  exhausted = usedPercent >= 100,
): QuotaWindow {
  return {
    key,
    usedPercent,
    remainingPercent: 100 - usedPercent,
    resetsAt,
    exhausted,
  };
}

/** One JSON reply, the caller's credential kept out of every message it produces. */
async function getJson(
  url: string,
  headers: Record<string, string>,
  secret: string,
  signal?: AbortSignal,
): Promise<Reply> {
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (signal) signals.push(signal);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.any(signals),
    });
  } catch (failure) {
    const timeout = failure instanceof Error && failure.name === "TimeoutError";
    return {
      ok: false,
      message: timeout
        ? `OpenCode Go did not answer within ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s`
        : "Could not reach OpenCode Go",
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      message: `OpenCode Go answered HTTP ${response.status}`,
      notSubscribed: isNotSubscribed(response.status, body),
    };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, status: response.status, message: "The reply could not be read" };
  }
  if (text.length > MAX_BYTES) {
    return { ok: false, status: response.status, message: "The reply is too large" };
  }
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: response.status, message: "The reply is not valid JSON" };
  }
}

/** 403 with `EntitlementError` is how both routes say "this account has no Go plan". */
function isNotSubscribed(status: number, body: string): boolean {
  if (status !== 403) return false;
  try {
    const payload = JSON.parse(body) as unknown;
    // The error envelope is `{ type: "error", error: { type } }` on some routes and the error
    // object alone on others; both name the entitlement in `error.type`.
    const error = isRecord(payload)
      ? isRecord(payload.error)
        ? payload.error
        : payload
      : undefined;
    return error?.type === "EntitlementError";
  } catch {
    return false;
  }
}

function consoleBase(server: string | undefined): string {
  if (!server) return CONSOLE_BASE_URL;
  try {
    const url = new URL(server);
    if (url.protocol === "https:") return server.replace(/\/+$/, "");
  } catch {
    // Fall through to the default: never send the token to an address we cannot parse.
  }
  return CONSOLE_BASE_URL;
}

function methodOf(integrationID: string, method: string): QuotaAccountMethod | undefined {
  if (method === "key") return "key";
  if (method === "oauth" && integrationID === "opencode") return "console";
  return undefined;
}

/**
 * Every credential that can answer for an OpenCode Go plan, from OpenCode's own integration
 * list. Connections carry no secret here: only the id, the label and the method.
 */
async function scanAccounts(ctx: Plugin.Context): Promise<Scan> {
  const listed = await ctx.integration.list();

  const activeByIntegration = new Map<string, string>();
  for (const integration of listed.data) {
    if (integration.id !== "opencode" && integration.id !== "opencode-go") continue;
    try {
      const active = await ctx.integration.connection.active(integration.id);
      if (active?.type === "credential") activeByIntegration.set(integration.id, active.id);
    } catch {
      // No active connection for this integration, or the list could not be read: fine.
    }
  }

  const entries: AccountEntry[] = [];
  for (const integration of listed.data) {
    if (integration.id !== "opencode" && integration.id !== "opencode-go") continue;
    for (const connection of integration.connections) {
      if (connection.type !== "credential") continue;
      const method = methodOf(integration.id, connection.method);
      if (!method) continue;
      entries.push({
        account: {
          id: connection.id,
          label: connection.label || (method === "console" ? "Console" : "API key"),
          method,
          integrationID: integration.id,
          active: activeByIntegration.get(integration.id) === connection.id,
        },
        connection,
      });
    }
  }

  const rank = (entry: AccountEntry) =>
    (entry.account.method === "console" ? 0 : 2) + (entry.account.active ? 0 : 1);
  entries.sort(
    (a, b) => rank(a) - rank(b) || a.account.label.localeCompare(b.account.label),
  );

  // The Console login is the full plan view; a key is the fallback.
  const preferred =
    entries.find((entry) => entry.account.method === "console" && entry.account.active) ??
    entries.find((entry) => entry.account.method === "key" && entry.account.active) ??
    entries[0];

  return { entries, defaultID: preferred?.account.id };
}

/** Picker order: a Console sign-in first, then an active credential, then the label. */
function accountRank(account: QuotaAccount): number {
  return (account.method === "console" ? 0 : 2) + (account.active ? 0 : 1);
}

/** Every method in a group, once, Console first. */
function methodList(entries: QuotaAccountLimits[]): QuotaAccountMethod[] {
  const methods: QuotaAccountMethod[] = [];
  for (const entry of entries) {
    if (!methods.includes(entry.account.method)) methods.push(entry.account.method);
  }
  return methods.sort((a, b) => (a === "console" ? -1 : b === "console" ? 1 : 0));
}

/**
 * One row per Console subscriber: a Console sign-in and the Go API keys that resolve to the same
 * subscriber id are one account. A reply without a subscriber id stays on its own, so an
 * unreachable credential never disappears into another account.
 */
export function groupAccountLimits(entries: QuotaAccountLimits[]): QuotaAccountLimits[] {
  const groups = new Map<string, QuotaAccountLimits[]>();
  for (const entry of entries) {
    const subscriberID = entry.report.limits?.subscriberID;
    const key = subscriberID ? `subscriber:${subscriberID}` : `credential:${entry.account.id}`;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const result: QuotaAccountLimits[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        accountRank(a.account) - accountRank(b.account) ||
        a.account.label.localeCompare(b.account.label),
    );
    const representative = sorted[0];
    result.push({
      account: {
        ...representative.account,
        active: sorted.some((entry) => entry.account.active),
        methods: methodList(sorted),
      },
      report: representative.report,
    });
  }

  result.sort(
    (a, b) =>
      accountRank(a.account) - accountRank(b.account) ||
      a.account.label.localeCompare(b.account.label),
  );
  return result;
}

export async function listAccounts(
  ctx: Plugin.Context,
  signal?: AbortSignal,
): Promise<QuotaAccounts> {
  const entries = await readAllLimits(ctx, signal ? { signal } : {});
  const accounts = entries.map((entry) => entry.account);
  const preferred =
    accounts.find((account) => account.method === "console" && account.active) ??
    accounts.find((account) => account.active) ??
    accounts[0];
  return {
    accounts,
    ...(preferred ? { defaultID: preferred.id } : {}),
  };
}

/**
 * The Console sign-in an account reads through: the token and where to send it.
 */
export type ConsoleAccess = {
  access: string;
  server?: string;
  orgID?: string;
};

export type ConsoleResolution =
  | { ok: true; value: ConsoleAccess }
  | { ok: false; state: "not-connected" | "error"; message: string };

/**
 * Resolves the Console sign-in for `accountID`, or the default account without one. A Go API
 * key cannot read the Console's activity, so it resolves to a short reason instead.
 */
export async function resolveConsoleAccess(
  ctx: Plugin.Context,
  accountID?: string,
): Promise<ConsoleResolution> {
  const scan = await scanAccounts(ctx);
  const entry = accountID
    ? scan.entries.find((candidate) => candidate.account.id === accountID)
    : scan.entries.find((candidate) => candidate.account.id === scan.defaultID);
  if (!entry) {
    return { ok: false, state: "not-connected", message: "That account is no longer connected." };
  }
  if (entry.account.method !== "console") {
    return {
      ok: false,
      state: "not-connected",
      message: "Usage history needs a Console sign-in, not an API key.",
    };
  }

  let value: Awaited<ReturnType<Plugin.Context["integration"]["connection"]["resolve"]>>;
  try {
    value = await ctx.integration.connection.resolve(entry.connection);
  } catch (failure) {
    return {
      ok: false,
      state: "error",
      message: `OpenCode could not resolve that credential: ${clean(
        failure instanceof Error ? failure.message : String(failure),
      )}`,
    };
  }
  if (!value) {
    return { ok: false, state: "not-connected", message: "OpenCode has no value for that credential." };
  }
  if (value.type !== "oauth" || !value.access) {
    return { ok: false, state: "error", message: "That credential cannot read OpenCode Go usage." };
  }

  const metadata = value.metadata;
  const text = (key: string) =>
    isRecord(metadata) && typeof metadata[key] === "string"
      ? (metadata[key] as string)
      : undefined;
  return {
    ok: true,
    value: { access: value.access, server: text("server"), orgID: text("orgID") },
  };
}

/** One Console API read with the sign-in's headers. */
export async function getConsoleJson(
  access: ConsoleAccess,
  path: string,
  signal?: AbortSignal,
): Promise<Reply> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access.access}`,
    Accept: "application/json",
  };
  if (access.orgID) headers["x-org-id"] = access.orgID;
  return getJson(`${consoleBase(access.server)}${path}`, headers, access.access, signal);
}

/** The Console's `/api/go/status`: `access.meters.fiveHour|week|month`, each in microcents. */
function parseConsole(json: unknown, source: "console" | "key"): QuotaReport | undefined {
  if (!isRecord(json)) return undefined;
  if (json.access === null || json.access === undefined) return { state: "not-subscribed" };
  if (!isRecord(json.access)) return undefined;

  const access = json.access;
  const meters = access.meters;
  if (!isRecord(meters)) return undefined;

  const endsAt = isoOrUndefined(access.endsAt);
  const windows: QuotaWindow[] = [];
  for (const key of WINDOW_ORDER) {
    const meter = meters[CONSOLE_METER[key]];
    if (!isRecord(meter)) return undefined;
    const used = finiteNumber(meter.usedMicroCents);
    const limit = finiteNumber(meter.limitMicroCents);
    if (used === undefined || limit === undefined || used < 0 || limit < 0) return undefined;
    const resetsAt = isoOrUndefined(meter.resetsAt) ?? endsAt;
    if (!resetsAt) return undefined;
    windows.push(windowRow(key, percentOf(used, limit), resetsAt));
  }

  const subscriberID =
    typeof json.subscriberUserId === "string" && json.subscriberUserId !== ""
      ? json.subscriberUserId
      : undefined;
  const limits: QuotaLimits = {
    source,
    windows,
    fetchedAtMs: Date.now(),
    ...(subscriberID ? { subscriberID } : {}),
    ...(endsAt ? { planEndsAt: endsAt } : {}),
  };
  return { state: "ok", limits };
}

/** The Go usage route: `usage.rolling|weekly|monthly`, each with a status and a percent. */
function parseUsage(json: unknown): QuotaReport | undefined {
  if (!isRecord(json) || !isRecord(json.usage)) return undefined;
  const usage = json.usage;

  const windows: QuotaWindow[] = [];
  for (const key of WINDOW_ORDER) {
    const window = usage[key];
    if (!isRecord(window)) return undefined;
    if (window.status !== "ok" && window.status !== "rate-limited") return undefined;
    const percent = finiteNumber(window.percent);
    if (percent === undefined || percent < 0 || percent > 100) return undefined;
    const resetsAt = isoOrUndefined(window.resetsAt);
    if (!resetsAt) return undefined;
    windows.push(windowRow(key, Math.round(percent), resetsAt, window.status === "rate-limited"));
  }

  return {
    state: "ok",
    limits: { source: "key", windows, fetchedAtMs: Date.now() },
  };
}

async function queryConsole(
  access: string,
  server: string | undefined,
  orgID: string | undefined,
  source: "console" | "key",
  signal?: AbortSignal,
): Promise<QuotaReport> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    Accept: "application/json",
  };
  if (orgID) headers["x-org-id"] = orgID;

  const reply = await getJson(
    `${consoleBase(server)}/api/go/status`,
    headers,
    access,
    signal,
  );
  if (!reply.ok) {
    if (reply.notSubscribed) {
      return { state: "not-subscribed", message: "This account has no OpenCode Go plan." };
    }
    return { state: "error", message: clean(reply.message, access) };
  }
  return (
    parseConsole(reply.json, source) ?? {
      state: "error",
      message: "The Console reply did not have the meters",
    }
  );
}

async function queryKey(key: string, signal?: AbortSignal): Promise<QuotaReport> {
  // The Console status route accepts a Go API key and reports the subscriber id, so a key and a
  // Console sign-in of the same account can be grouped. Fall back to the key's own usage route
  // if the status route does not answer with meters.
  const status = await queryConsole(key, undefined, undefined, "key", signal);
  if (status.state !== "error") return status;

  const reply = await getJson(GO_USAGE_URL, { Authorization: `Bearer ${key}` }, key, signal);
  if (!reply.ok) {
    if (reply.notSubscribed) {
      return { state: "not-subscribed", message: "This account has no OpenCode Go plan." };
    }
    return { state: "error", message: clean(reply.message, key) };
  }
  return parseUsage(reply.json) ?? { state: "error", message: "The usage reply did not have the windows" };
}

async function readEntry(
  ctx: Plugin.Context,
  entry: AccountEntry,
  signal?: AbortSignal,
): Promise<QuotaReport> {
  let value: Awaited<ReturnType<Plugin.Context["integration"]["connection"]["resolve"]>>;
  try {
    value = await ctx.integration.connection.resolve(entry.connection);
  } catch (failure) {
    return {
      state: "error",
      message: `OpenCode could not resolve that credential: ${clean(
        failure instanceof Error ? failure.message : String(failure),
      )}`,
    };
  }
  if (!value) {
    return { state: "not-connected", message: "OpenCode has no value for that credential." };
  }

  if (entry.account.method === "key" && value.type === "key" && value.key) {
    return await queryKey(value.key, signal);
  }
  if (entry.account.method === "console" && value.type === "oauth" && value.access) {
    const metadata = value.metadata;
    const text = (key: string) =>
      isRecord(metadata) && typeof metadata[key] === "string"
        ? (metadata[key] as string)
        : undefined;
    return await queryConsole(value.access, text("server"), text("orgID"), "console", signal);
  }
  return { state: "error", message: "That credential cannot read OpenCode Go limits." };
}

async function queryLimits(
  ctx: Plugin.Context,
  options: { accountID?: string; signal?: AbortSignal },
): Promise<QuotaReport> {
  const scan = await scanAccounts(ctx);
  let entry: AccountEntry | undefined;

  if (options.accountID) {
    entry = scan.entries.find((candidate) => candidate.account.id === options.accountID);
    if (!entry) {
      return { state: "not-connected", message: "That account is no longer connected." };
    }
  } else {
    entry = scan.entries.find((candidate) => candidate.account.id === scan.defaultID);
  }

  if (!entry) return { state: "not-connected" };
  return await readEntry(ctx, entry, options.signal);
}

/**
 * Read the plan's three windows for one account, from the cache when it is fresh. Without
 * `accountID`, the active Console login is used, else the active Go key.
 */
export async function readLimits(
  ctx: Plugin.Context,
  options: { force?: boolean; accountID?: string; signal?: AbortSignal } = {},
): Promise<QuotaReport> {
  const cacheKey = options.accountID || "auto";
  const cached = cachedReport(cacheKey, options.force === true);
  if (cached) return cached;

  const report = await queryLimits(ctx, options);
  cache.set(cacheKey, { at: Date.now(), report });
  return report;
}

/**
 * Read every stored credential's plan windows, so the chip can list all the accounts that
 * answer with a Go plan on hover. The scan runs once, then each account is read in parallel
 * and cached like `readLimits`; the results are grouped by subscriber id so one Go account is
 * one row even when a Console sign-in and API keys reach it.
 */
export async function readAllLimits(
  ctx: Plugin.Context,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<QuotaAccountLimits[]> {
  const scan = await scanAccounts(ctx);
  const entries = await Promise.all(
    scan.entries.map(async (entry) => {
      const cacheKey = entry.account.id;
      const cached = cachedReport(cacheKey, options.force === true);
      if (cached) return { account: entry.account, report: cached };

      const report = await readEntry(ctx, entry, options.signal);
      cache.set(cacheKey, { at: Date.now(), report });
      return { account: entry.account, report };
    }),
  );
  return groupAccountLimits(entries);
}

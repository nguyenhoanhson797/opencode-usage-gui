/**
 * The shapes the server computes and the window renders.
 *
 * This file is imported by both the server part (Node/Bun) and the GUI bundle (browser), so it
 * holds types only: no Node built-ins, no DOM.
 */

/**
 * A usage window the view can ask for. The Console reports Go usage per day, so every range is
 * a slice of those days: `today` is the latest day, `month` the current calendar month, and
 * `all` the whole plan period.
 */
export type UsageRange = "today" | "7d" | "30d" | "month" | "all";

export const USAGE_RANGES: readonly UsageRange[] = ["today", "7d", "30d", "month", "all"];

/** Tokens, requests and cost in the window, as the Console reports them. */
export type UsageTotals = {
  /** Prompt, cache and completion tokens together. */
  tokens: number;
  requests: number;
  /** The Console's cost for the window, in micro-cents ($1 = 100,000,000). */
  costMicroCents: number;
};

export type UsageModelRow = {
  providerID: string;
  modelID: string;
  requests: number;
};

export type UsageDayRow = {
  /** A day as the Console reports it, "2026-11-18". */
  date: string;
  tokens: number;
  requests: number;
  costMicroCents: number;
};

/**
 * The answer of the RPC's `usage` method: OpenCode Go activity for the chosen account, read
 * from the Console. `message` is short, already scrubbed of secrets, and present for every
 * state other than `ok`.
 */
export type UsageReport = {
  range: UsageRange;
  state: "ok" | "not-connected" | "not-subscribed" | "error";
  generatedAtMs: number;
  message?: string;
  /** When the plan period the Console reports began. */
  planStartsAt?: string;
  totals?: UsageTotals;
  /** Per-model request counts for the whole plan period. */
  models?: UsageModelRow[];
  /** Every day of the window, oldest first. */
  days?: UsageDayRow[];
};

/** One limit window of the OpenCode Go plan. */
export type QuotaWindowKey = "rolling" | "weekly" | "monthly";

export const QUOTA_WINDOW_KEYS: readonly QuotaWindowKey[] = ["rolling", "weekly", "monthly"];

export type QuotaWindow = {
  key: QuotaWindowKey;
  /** 0–100, rounded the way the Console's meters are. */
  usedPercent: number;
  remainingPercent: number;
  /** ISO timestamp when the window resets. */
  resetsAt: string;
  /** The provider reports this window as exhausted. */
  exhausted: boolean;
};

export type QuotaLimits = {
  /** Where the numbers came from: the Console sign-in or the Go API key. */
  source: "console" | "key";
  windows: QuotaWindow[];
  fetchedAtMs: number;
  /** The plan's end date, when the Console reports one. */
  planEndsAt?: string;
};

/**
 * The answer of the RPC's `limits` method. `message` is short, already scrubbed of secrets,
 * and present for every state other than `ok`.
 */
export type QuotaReport = {
  state: "ok" | "not-connected" | "not-subscribed" | "error";
  limits?: QuotaLimits;
  message?: string;
};

/** How an account is read: OpenCode's Console login, or a Go API key. */
export type QuotaAccountMethod = "console" | "key";

/** One OpenCode Go account, as a credential OpenCode already stores. */
export type QuotaAccount = {
  /** The credential id; `credential.activate` takes the same value. */
  id: string;
  /** The credential's label, such as "Personal" or "OpenCode Go". */
  label: string;
  method: QuotaAccountMethod;
  integrationID: "opencode" | "opencode-go";
  /** The active credential of its integration. */
  active: boolean;
};

/** The answer of the RPC's `accounts` method. */
export type QuotaAccounts = {
  accounts: QuotaAccount[];
  /** The account to read when the window has no stored choice. */
  defaultID?: string;
};

/** One account and the plan windows it answered with, for the chip's hover list. */
export type QuotaAccountLimits = {
  account: QuotaAccount;
  report: QuotaReport;
};

/**
 * The RPC between this plugin's server part and its window.
 *
 * Only type imports from `@opencode/*`, so loading this file loads no OpenCode package: the
 * server registers the definition, the window calls it.
 */
import type { Rpc } from "@opencode/plugin";
import type {
  QuotaAccountLimits,
  QuotaAccounts,
  QuotaReport,
  UsageRange,
  UsageReport,
} from "./types.js";

export const USAGE_RPC_ID = "opencode-usage.rpc";

const RANGES: readonly UsageRange[] = ["today", "7d", "30d", "month", "all"];

export type UsageInput = { range: UsageRange; accountID?: string };
export type UsageOutput = { report: UsageReport };
export type LimitsInput = { refresh?: boolean; accountID?: string };
export type LimitsOutput = { limits: QuotaReport };
export type AllLimitsInput = { refresh?: boolean };
export type AllLimitsOutput = { entries: QuotaAccountLimits[] };
export type AccountsInput = Record<string, never>;
export type AccountsOutput = { accounts: QuotaAccounts };

type StandardValueSchema = Extract<Rpc.PortableValueSchema, { "~standard": unknown }>;
type Typed<T> = { "~standard": { types?: { input: T; output: T } } };
type Schema<T> = StandardValueSchema & Typed<T>;

/**
 * A Standard Schema that runs `check` and passes the value through. OpenCode validates every
 * input and output with it; `types` only carries T for TypeScript.
 */
function schema<T>(check: (value: unknown) => string | null): Schema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "opencode-usage",
      validate: (value) => {
        const issue = check(value);
        return issue ? { issues: [{ message: issue }] } : { value: value as T };
      },
    },
  };
}

/** OpenCode's RPC route sends no input when a caller passes nothing; that is `{}` here. */
function inputSchema<T>(check: (value: unknown) => string | null): Schema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "opencode-usage",
      validate: (value) => {
        const input = value === undefined ? {} : value;
        const issue = check(input);
        return issue ? { issues: [{ message: issue }] } : { value: input as T };
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkUsageInput(value: unknown): string | null {
  if (!isRecord(value)) return "input must be an object";
  const range = value.range;
  if (typeof range !== "string" || !(RANGES as readonly string[]).includes(range)) {
    return `range must be one of ${RANGES.join(", ")}`;
  }
  if (value.accountID !== undefined && !isCredentialID(value.accountID)) {
    return "accountID must be a credential id";
  }
  return null;
}

function checkUsageOutput(value: unknown): string | null {
  return isRecord(value) && isRecord(value.report) ? null : "output must carry a report";
}

function checkLimitsInput(value: unknown): string | null {
  if (!isRecord(value)) return "input must be an object";
  if (value.refresh !== undefined && typeof value.refresh !== "boolean") {
    return "refresh must be a boolean";
  }
  if (value.accountID !== undefined && !isCredentialID(value.accountID)) {
    return "accountID must be a credential id";
  }
  return null;
}

function isCredentialID(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && /^cred_[A-Za-z0-9]+$/.test(value);
}

function checkLimitsOutput(value: unknown): string | null {
  return isRecord(value) && isRecord(value.limits) ? null : "output must carry limits";
}

function checkAllLimitsInput(value: unknown): string | null {
  if (!isRecord(value)) return "input must be an object";
  if (value.refresh !== undefined && typeof value.refresh !== "boolean") {
    return "refresh must be a boolean";
  }
  return null;
}

function checkAllLimitsOutput(value: unknown): string | null {
  return isRecord(value) && Array.isArray(value.entries)
    ? null
    : "output must carry entries";
}

function checkAccountsOutput(value: unknown): string | null {
  return isRecord(value) && isRecord(value.accounts) ? null : "output must carry accounts";
}

export const UsageRpc = {
  id: USAGE_RPC_ID,
  // No events: the window asks when it mounts, on a range change and on a timer.
  events: {},
  methods: {
    usage: {
      input: inputSchema<UsageInput>(checkUsageInput),
      output: schema<UsageOutput>(checkUsageOutput),
    },
    limits: {
      input: inputSchema<LimitsInput>(checkLimitsInput),
      output: schema<LimitsOutput>(checkLimitsOutput),
    },
    limitsAll: {
      input: inputSchema<AllLimitsInput>(checkAllLimitsInput),
      output: schema<AllLimitsOutput>(checkAllLimitsOutput),
    },
    accounts: {
      input: inputSchema<AccountsInput>(() => null),
      output: schema<AccountsOutput>(checkAccountsOutput),
    },
  },
} satisfies Rpc.PortableDefinition;

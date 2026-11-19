/**
 * The window's data: read-only RPC calls to the plugin's server part, held in Solid signals.
 *
 * Each surface (the side tab, the chip on the tab strip) owns one instance, so one surface's
 * range never changes another's. A call that finishes after a newer one was made is dropped.
 */
import type { Context } from "@opencode/plugin/gui";
import { createSignal } from "solid-js";
import { UsageRpc, type AllLimitsInput, type LimitsInput, type UsageInput } from "../rpc.js";
import type {
  QuotaAccountLimits,
  QuotaAccounts,
  QuotaReport,
  UsageRange,
  UsageReport,
} from "../types.js";

type CallOptions = { location?: { directory: string }; signal?: AbortSignal };

type RpcMethods = {
  usage(input: UsageInput, options?: CallOptions): Promise<{ report: UsageReport }>;
  limits(input: LimitsInput, options?: CallOptions): Promise<{ limits: QuotaReport }>;
  limitsAll(input: AllLimitsInput, options?: CallOptions): Promise<{ entries: QuotaAccountLimits[] }>;
  accounts(input: Record<string, never>, options?: CallOptions): Promise<{ accounts: QuotaAccounts }>;
  switch(input: { accountID: string }, options?: CallOptions): Promise<{ switched: true }>;
};

const RPC_TIMEOUT_MS = 60_000;

function methods(ctx: Context): RpcMethods {
  const client = ctx.client as unknown as { rpc(definition: unknown): RpcMethods };
  return client.rpc(UsageRpc);
}

function options(directory: string | undefined): CallOptions {
  const signal = AbortSignal.timeout(RPC_TIMEOUT_MS);
  return directory ? { location: { directory }, signal } : { signal };
}

/** RPC calls reject with a plain `{ type, message }` object rather than an Error. */
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export type UsageData = {
  report(): UsageReport | undefined;
  error(): string | undefined;
  loading(): boolean;
  /** Reads `range` now; a newer call replaces this one even if it answers later. */
  load(range: UsageRange, accountID?: string): Promise<void>;
};

export function createUsageData(
  ctx: Context,
  directory: () => string | undefined,
): UsageData {
  const [report, setReport] = createSignal<UsageReport>();
  const [error, setError] = createSignal<string>();
  const [loading, setLoading] = createSignal(false);
  let sequence = 0;

  return {
    report,
    error,
    loading,
    async load(range, accountID) {
      const mine = ++sequence;
      setLoading(true);
      setError(undefined);
      try {
        const answer = await methods(ctx).usage(
          accountID ? { range, accountID } : { range },
          options(directory()),
        );
        if (mine !== sequence) return;
        setReport(answer.report);
        if (answer.report.state === "error") setError(answer.report.message);
      } catch (failure) {
        if (mine === sequence) setError(errorText(failure));
      } finally {
        if (mine === sequence) setLoading(false);
      }
    },
  };
}

export type LimitsData = {
  report(): QuotaReport | undefined;
  loading(): boolean;
  /** Reads the plan limits now. `refresh` bypasses the server's one-minute cache. */
  load(refresh?: boolean): Promise<void>;
};

/**
 * `account` is read at call time: the panel and the chip then always ask for the account the
 * user picked, and an empty id means the server's default (the active Console login).
 */
export function createLimitsData(
  ctx: Context,
  directory?: () => string | undefined,
  account?: () => string | undefined,
): LimitsData {
  const [report, setReport] = createSignal<QuotaReport>();
  const [loading, setLoading] = createSignal(false);
  let sequence = 0;

  return {
    report,
    loading,
    async load(refresh) {
      const mine = ++sequence;
      setLoading(true);
      try {
        const accountID = account?.() || undefined;
        const input: LimitsInput = {
          ...(refresh ? { refresh: true } : {}),
          ...(accountID ? { accountID } : {}),
        };
        const answer = await methods(ctx).limits(input, options(directory?.()));
        if (mine === sequence) setReport(answer.limits);
      } catch (failure) {
        if (mine === sequence) setReport({ state: "error", message: errorText(failure) });
      } finally {
        if (mine === sequence) setLoading(false);
      }
    },
  };
}

export type AllLimitsData = {
  entries(): QuotaAccountLimits[] | undefined;
  loading(): boolean;
  /** Reads every stored account's limits. `refresh` bypasses the server's one-minute cache. */
  load(refresh?: boolean): Promise<void>;
};

/**
 * The chip's hover list: limits for every credential, because a Go plan can live on more than
 * one account. The server reads them in parallel and caches each one, so this stays cheap.
 */
export function createAllLimitsData(
  ctx: Context,
  directory?: () => string | undefined,
): AllLimitsData {
  const [entries, setEntries] = createSignal<QuotaAccountLimits[]>();
  const [loading, setLoading] = createSignal(false);
  let sequence = 0;

  return {
    entries,
    loading,
    async load(refresh) {
      const mine = ++sequence;
      setLoading(true);
      try {
        const input: AllLimitsInput = refresh ? { refresh: true } : {};
        const answer = await methods(ctx).limitsAll(input, options(directory?.()));
        if (mine === sequence) setEntries(answer.entries);
      } catch {
        if (mine === sequence) setEntries(undefined);
      } finally {
        if (mine === sequence) setLoading(false);
      }
    },
  };
}

export type AccountsData = {
  report(): QuotaAccounts | undefined;
  loading(): boolean;
  load(): Promise<void>;
};

export function createAccountsData(ctx: Context): AccountsData {
  const [report, setReport] = createSignal<QuotaAccounts>();
  const [loading, setLoading] = createSignal(false);
  let sequence = 0;

  return {
    report,
    loading,
    async load() {
      const mine = ++sequence;
      setLoading(true);
      try {
        const answer = await methods(ctx).accounts({}, options(undefined));
        if (mine === sequence) setReport(answer.accounts);
      } catch {
        if (mine === sequence) setReport({ accounts: [] });
      } finally {
        if (mine === sequence) setLoading(false);
      }
    },
  };
}

/** Makes an account the active one in OpenCode; rejects with the server's reason. */
export async function switchAccount(
  ctx: Context,
  accountID: string,
  directory?: string,
): Promise<void> {
  await methods(ctx).switch({ accountID }, options(directory));
}

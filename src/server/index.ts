/**
 * The plugin's server part: RPC methods that answer with OpenCode Go usage and plan limits,
 * both read from the OpenCode Console with the credential OpenCode already owns.
 *
 * Deliberately small. It registers no tools for the model, adds no slash commands, hooks no
 * session request and writes no files. The only network calls go to the Console (or the Go
 * usage route for a key), and `switch` changes the active credential through OpenCode's
 * credential API, because the user picked that account; nothing else writes.
 *
 * It exports the plugin object directly instead of calling `Plugin.define`, which only returns
 * its argument: the server part then has no runtime import at all.
 */
import type { Plugin } from "@opencode/plugin";
import { UsageRpc } from "../rpc.js";
import { readGoActivity } from "./activity.js";
import { listAccounts, readAllLimits, readLimits, switchAccount } from "./quota.js";

const plugin: Plugin.Plugin = {
  id: "usage-desktop",
  async setup(ctx) {
    await ctx.rpc.register(UsageRpc, {
      usage: async (input, call) => ({
        report: await readGoActivity(
          ctx,
          { range: input.range, accountID: input.accountID },
          call.signal,
        ),
      }),
      limits: async (input, call) => ({
        limits: await readLimits(ctx, {
          force: input.refresh === true,
          accountID: input.accountID,
          signal: call.signal,
        }),
      }),
      limitsAll: async (input, call) => ({
        entries: await readAllLimits(ctx, {
          force: input.refresh === true,
          signal: call.signal,
        }),
      }),
      accounts: async () => ({ accounts: await listAccounts(ctx) }),
      switch: async (input) => {
        await switchAccount(ctx, input.accountID);
        return { switched: true as const };
      },
    });
  },
};

export default plugin;

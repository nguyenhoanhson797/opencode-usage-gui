/**
 * The chip at the end of the side panel's tab strip, beside the new-tab button. It shows how
 * much of one OpenCode Go window is used (rolling five-hour, weekly or monthly, as set in
 * Settings) as a small progress ring, and opens the Usage tab.
 *
 * Resting the pointer on it lists all the accounts that answer with a Go plan, each with its
 * three windows, so a user with more than one account can compare them without opening the tab.
 */
import type { Context } from "@opencode/plugin/gui";
import { createEffect, For, onCleanup, Show } from "solid-js";
import {
  QUOTA_WINDOW_KEYS,
  type QuotaAccountLimits,
  type QuotaWindow,
  type QuotaWindowKey,
} from "../types.js";
import { createAllLimitsData } from "./data.js";

const CLOCK_MS = 5 * 60_000;
/** The ring is 14 px square: a 5.5 px radius at the 2.2 px stroke the stylesheet sets. */
const RING_RADIUS = 5.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** The account the chip reads when nothing is picked: the same preference the server uses. */
function preferred(entries: QuotaAccountLimits[]): QuotaAccountLimits | undefined {
  return (
    entries.find((entry) => entry.account.method === "console" && entry.account.active) ??
    entries.find((entry) => entry.account.method === "key" && entry.account.active) ??
    entries[0]
  );
}

/** The hover list: one row per account that answered with a Go plan, with all three windows. */
function EntryTooltip(props: {
  ctx: Context;
  entries: () => QuotaAccountLimits[] | undefined;
  loading: () => boolean;
  selected: () => string | undefined;
}) {
  const accounts = () =>
    (props.entries() ?? []).filter(
      (entry) => entry.report.state === "ok" && entry.report.limits,
    );

  const windowOf = (entry: QuotaAccountLimits, key: QuotaWindowKey): QuotaWindow | undefined =>
    entry.report.limits?.windows.find((window) => window.key === key);

  return (
    <Show
      when={props.entries()}
      fallback={
        <span class="ou-chip-note ou-loading-row">
          <Show when={props.loading()}>
            <props.ctx.ui.Loader size="small" />
          </Show>
          {props.ctx.t(props.loading() ? "limits.loading" : "limits.unavailable")}
        </span>
      }
    >
      <Show
        when={accounts().length > 0}
        fallback={<span class="ou-chip-note">{props.ctx.t("entry.noAccounts")}</span>}
      >
        <div class="ou-chip-tip">
          <div class="ou-chip-tip-title">{props.ctx.t("entry.accounts")}</div>
          <table class="ou-chip-table">
            <thead>
              <tr>
                <th scope="col">{props.ctx.t("limits.account")}</th>
                <For each={QUOTA_WINDOW_KEYS}>
                  {(key) => (
                    <th scope="col" class="ou-chip-num">
                      {props.ctx.t(`entry.short.${key}`)}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={accounts()}>
                {(entry) => (
                  <tr
                    classList={{
                      "ou-chip-row-on": entry.account.id === props.selected(),
                    }}
                  >
                    <th scope="row" class="ou-chip-account" title={entry.account.label}>
                      {entry.account.label}
                    </th>
                    <For each={QUOTA_WINDOW_KEYS}>
                      {(key) => {
                        const window = () => windowOf(entry, key);
                        const percent = () => window()?.usedPercent;
                        return (
                          <td
                            class="ou-chip-num"
                            classList={{
                              "ou-warn": (percent() ?? 0) >= 75 && (percent() ?? 0) < 100,
                              "ou-full": (percent() ?? 0) >= 100,
                            }}
                          >
                            {percent() === undefined ? "—" : `${Math.round(percent()!)}%`}
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </Show>
  );
}

export function QuotaEntry(props: {
  ctx: Context;
  account: () => string | undefined;
  /** The window the chip's ring shows; changed from Settings. */
  window: () => QuotaWindowKey;
  /** The slot's session directory, so the RPC reaches the session's server. */
  directory: () => string | undefined;
  onOpen: () => void;
}) {
  const ctx = props.ctx;
  const data = createAllLimitsData(ctx, props.directory);

  let loadedAt = 0;
  const load = async (refresh?: boolean) => {
    await data.load(refresh);
    loadedAt = Date.now();
  };

  const reload = () => void load();
  createEffect(() => {
    // Reads again when the pick changes in the panel.
    props.account();
    reload();
  });

  const timer = setInterval(reload, CLOCK_MS);
  onCleanup(() => clearInterval(timer));

  /** A hover may refresh stale numbers, but never more often than the server's own cache. */
  const warm = () => {
    if (!data.loading() && Date.now() - loadedAt >= 60_000) reload();
  };

  const chosen = () => {
    const entries = data.entries();
    if (!entries?.length) return undefined;
    const id = props.account();
    if (id) {
      const picked = entries.find((entry) => entry.account.id === id);
      if (picked) return picked;
    }
    return preferred(entries);
  };

  const limit = () =>
    chosen()?.report.limits?.windows.find((window) => window.key === props.window());

  const percent = () => limit()?.usedPercent;

  const label = () => {
    const window = limit();
    return window
      ? ctx.t("entry.title", {
          window: ctx.t(`limits.${window.key}`),
          percent: String(Math.round(window.usedPercent)),
        })
      : ctx.t("entry.unavailable");
  };

  const ringOffset = () => {
    const used = Math.min(100, Math.max(0, percent() ?? 0));
    return RING_CIRCUMFERENCE * (1 - used / 100);
  };

  return (
    <div class="ou-root ou-entry-wrap" data-mode={ctx.appearance.mode()}>
      <ctx.ui.Tooltip
        placement="top"
        value={
          <EntryTooltip
            ctx={ctx}
            entries={data.entries}
            loading={data.loading}
            selected={() => chosen()?.account.id}
          />
        }
      >
        <button
          type="button"
          class="ou-entry"
          aria-label={label()}
          onPointerEnter={warm}
          onFocus={warm}
          onClick={props.onOpen}
        >
          <span class="ou-entry-label">{ctx.t(`entry.short.${props.window()}`)}</span>
          <span class="ou-entry-ring" aria-hidden="true">
            <Show
              when={data.loading() && percent() === undefined}
              fallback={
                <svg viewBox="0 0 14 14">
                  <circle class="ou-ring-track" cx="7" cy="7" r={RING_RADIUS} />
                  <Show when={percent() !== undefined}>
                    <circle
                      class="ou-ring-fill"
                      classList={{
                        "ou-warn": (percent() ?? 0) >= 75 && (percent() ?? 0) < 100,
                        "ou-full": (percent() ?? 0) >= 100,
                      }}
                      cx="7"
                      cy="7"
                      r={RING_RADIUS}
                      style={{
                        "stroke-dasharray": `${RING_CIRCUMFERENCE}`,
                        "stroke-dashoffset": `${ringOffset()}`,
                      }}
                    />
                  </Show>
                </svg>
              }
            >
              <span class="ou-spinner" />
            </Show>
          </span>
        </button>
      </ctx.ui.Tooltip>
    </div>
  );
}

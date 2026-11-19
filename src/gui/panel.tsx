/**
 * The Usage tab in a session's side panel, laid out like the OpenCode Console's usage screen:
 * a Limits card for the OpenCode Go plan (rolling 5h, weekly, monthly), a green line chart over
 * dashed grid lines with a dark date strip, and bordered cards with label/value rows and slim
 * share bars.
 *
 * Every number here comes from the Console: the plan limits from `/api/go/status` and the token,
 * request and cost totals from `/api/activity/go`, both with the credential OpenCode already
 * owns. Nothing is read from this machine.
 *
 * The tab reloads when the range or the account changes, once every five minutes, and on the
 * refresh button.
 */
import type { Context, MountedSession } from "@opencode/plugin/gui";
import { createEffect, createMemo, createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import {
  USAGE_RANGES,
  type QuotaAccount,
  type QuotaAccounts,
  type QuotaReport,
  type QuotaWindow,
  type UsageDayRow,
  type UsageModelRow,
  type UsageRange,
} from "../types.js";
import {
  createAccountsData,
  createLimitsData,
  createUsageData,
} from "./data.js";
import { formatCost, formatCount, formatDay, formatDayFull, formatTokens, formatUntil } from "./format.js";

const CLOCK_MS = 5 * 60_000;
const SHARE_ROWS = 3;

export type UsagePanelProps = {
  ctx: Context;
  /** The session the tab belongs to; read reactively, the panel stays mounted across sessions. */
  session: () => MountedSession;
  initialRange: UsageRange;
  /** The account the window last picked; empty means the active one. */
  account: () => string | undefined;
  /** Stores a new pick, so the chip on the tab strip reads the same account. */
  onAccount: (id: string) => void;
};

/** The session's workspace directory, used to route RPC calls to its server. */
function directoryOf(session: MountedSession | undefined): string | undefined {
  return session?.directory;
}

function share(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function percentText(percent: number): string {
  return percent > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`;
}

function Card(props: { title: string; subtitle: string; children: JSX.Element }) {
  return (
    <section class="ou-card">
      <header class="ou-card-head">
        <div>
          <h3 class="ou-card-title">{props.title}</h3>
          <p class="ou-card-sub">{props.subtitle}</p>
        </div>
      </header>
      <div class="ou-card-body">{props.children}</div>
    </section>
  );
}

function Row(props: { label: string; value: string; hint?: string; big?: boolean }) {
  return (
    <div class="ou-row">
      <span class="ou-row-label">
        {props.label}
        <Show when={props.hint}>{(hint) => <em>{hint()}</em>}</Show>
      </span>
      <span class={props.big ? "ou-row-value big" : "ou-row-value"}>{props.value}</span>
    </div>
  );
}

/** A name, a share, and the bar under it. */
function ShareRow(props: { name: string; detail?: string; percent: number; value: string }) {
  return (
    <div class="ou-share">
      <div class="ou-share-line">
        <span class="ou-share-name" title={props.name}>
          {props.name}
        </span>
        <Show when={props.detail}>
          {(detail) => <span class="ou-share-detail">{detail()}</span>}
        </Show>
        <span class="ou-share-value">{props.value}</span>
      </div>
      <div class="ou-bar-track">
        <div class="ou-bar-fill" style={{ width: `${Math.max(1, props.percent)}%` }} />
      </div>
    </div>
  );
}

/** One plan window: its name and share, a bar, and when it resets. */
function LimitRow(props: { ctx: Context; window: QuotaWindow }) {
  const percent = () => Math.round(props.window.usedPercent);
  const left = () => Math.max(0, 100 - percent());
  return (
    <div class="ou-limit">
      <div class="ou-limit-head">
        <span class="ou-limit-name">{props.ctx.t(`limits.${props.window.key}`)}</span>
        <span class="ou-limit-value">{percent()}%</span>
      </div>
      <div class="ou-bar-track">
        <div
          class="ou-bar-fill"
          classList={{ "ou-warn": percent() >= 75, "ou-full": percent() >= 100 }}
          style={{ width: `${Math.max(1, percent())}%` }}
        />
      </div>
      <div class="ou-limit-foot">
        <span>
          {formatUntil(props.window.resetsAt) === "now"
            ? props.ctx.t("limits.resetsNow")
            : props.ctx.t("limits.resets", { when: formatUntil(props.window.resetsAt) })}
        </span>
        <span>{props.ctx.t("limits.left", { percent: String(left()) })}</span>
      </div>
    </div>
  );
}

function accountLabel(ctx: Context, account: QuotaAccount): string {
  const methods = account.methods?.length ? account.methods : [account.method];
  const kind = methods
    .map((method) =>
      ctx.t(method === "console" ? "limits.account.console" : "limits.account.key"),
    )
    .join(" + ");
  return `${account.label} · ${kind}`;
}

/** The Console's Limits card: the OpenCode Go plan's three windows for one account. */
function LimitsCard(props: {
  ctx: Context;
  report: () => QuotaReport | undefined;
  loading: () => boolean;
  accounts: () => QuotaAccounts | undefined;
  accountsLoading: () => boolean;
  selected: () => string;
  onAccount: (id: string) => void;
}) {
  const message = () => {
    const report = props.report();
    if (!report || props.loading()) return props.ctx.t("limits.loading");
    switch (report.state) {
      case "not-connected":
        return props.ctx.t("limits.notConnected");
      case "not-subscribed":
        return props.ctx.t("limits.notSubscribed");
      case "error":
        return props.ctx.t("limits.error", { message: report.message ?? "" });
      default:
        return props.ctx.t("limits.unavailable");
    }
  };

  // The options render after the select's props, so set the value once they exist.
  let select: HTMLSelectElement | undefined;
  createEffect(() => {
    const id = props.selected();
    if (select && id && select.value !== id) select.value = id;
  });

  return (
    <section class="ou-card ou-limits">
      <header class="ou-card-head">
        <div>
          <h3 class="ou-card-title">{props.ctx.t("card.limits")}</h3>
          <p class="ou-card-sub">{props.ctx.t("card.limits.sub")}</p>
        </div>
      </header>
      <div class="ou-card-body">
        <Show when={props.accountsLoading() && !props.accounts()}>
          <div class="ou-account">
            <span class="ou-account-label" title={props.ctx.t("limits.account.hint")}>
              {props.ctx.t("limits.account")}
            </span>
            <span class="ou-account-loading">
              <props.ctx.ui.Loader size="small" />
              {props.ctx.t("limits.account.loading")}
            </span>
          </div>
        </Show>
        <Show when={(props.accounts()?.accounts.length ?? 0) > 1}>
          <label class="ou-account">
            <span class="ou-account-label" title={props.ctx.t("limits.account.hint")}>
              {props.ctx.t("limits.account")}
            </span>
            <select
              ref={select}
              class="ou-account-select"
              value={props.selected()}
              onChange={(event) => props.onAccount(event.currentTarget.value)}
            >
              <For each={props.accounts()?.accounts ?? []}>
                {(account) => (
                  <option value={account.id}>{accountLabel(props.ctx, account)}</option>
                )}
              </For>
            </select>
            <Show when={props.accountsLoading()}>
              <props.ctx.ui.Loader size="small" />
            </Show>
          </label>
        </Show>
        <Show
          when={props.report()?.limits}
          fallback={<p class="ou-muted ou-small ou-limit-note">{message()}</p>}
        >
          {(limits) => (
            <>
              <div class="ou-limits-rows">
                <For each={limits().windows}>
                  {(window) => <LimitRow ctx={props.ctx} window={window} />}
                </For>
              </div>
              <Show when={limits().planEndsAt}>
                {(endsAt) => (
                  <p class="ou-muted ou-small ou-limit-note">
                    {props.ctx.t("limits.planEnds", { when: formatUntil(endsAt()) })}
                  </p>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>
    </section>
  );
}

/** The console's chart: one green line, a fading area, dashed grid lines, a hover tooltip. */
function Chart(props: {
  days: UsageDayRow[];
  locale: string;
  tokens: (value: number) => string;
  requests: (value: number) => string;
  cost: (value: number) => string;
  labels: { tokens: string; requests: string; cost: string };
  average: string;
  usage: string;
}) {
  const width = 600;
  const height = 150;
  const top = 14;
  const [hover, setHover] = createSignal<number>();
  let box: HTMLDivElement | undefined;

  const points = createMemo(() => {
    const days = props.days;
    const max = Math.max(1, ...days.map((day) => day.tokens));
    return days.map((day, index) => ({
      date: day.date,
      tokens: day.tokens,
      requests: day.requests,
      costMicroCents: day.costMicroCents,
      x: days.length === 1 ? width : (index / (days.length - 1)) * width,
      y: Math.max(top, height - (day.tokens / max) * (height - top)),
    }));
  });

  const line = () =>
    points()
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");

  const area = () =>
    `M0,${height} ${points()
      .map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ")} L${width},${height} Z`;

  /** The hovered day, or the last one when the pointer is away. */
  const active = () => {
    const last = points().length - 1;
    if (last < 0) return 0;
    const index = hover();
    return index === undefined ? last : Math.min(last, Math.max(0, index));
  };

  const marker = createMemo(() => {
    const point = points()[active()];
    if (!point) return undefined;
    return {
      tokens: point.tokens,
      left: (point.x / width) * 100,
      top: (point.y / height) * 100,
    };
  });

  const hovered = createMemo(() => (hover() === undefined ? undefined : points()[active()]));
  /** Keep the popup inside the box: it may not reach the outer 22% on either side. */
  const tipLeft = () => Math.min(72, Math.max(28, ((points()[active()]?.x ?? 0) / width) * 100));
  const tipBelow = () => (points()[active()]?.y ?? 0) < height * 0.38;

  const pick = (event: PointerEvent) => {
    if (points().length === 0 || !box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    // A single day has one point; the tooltip is then that point.
    setHover(points().length === 1 ? 0 : Math.round(ratio * (points().length - 1)));
  };

  const axis = createMemo(() => {
    const days = props.days;
    if (days.length <= 1) return days.map((day) => day.date);
    if (days.length === 2) return [days[0].date, days[1].date];
    return [days[0].date, days[Math.floor((days.length - 1) / 2)].date, days[days.length - 1].date];
  });

  return (
    <div class="ou-chart-wrap">
      <div
        class="ou-chart-box"
        ref={box}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHover(undefined)}
        onPointerCancel={() => setHover(undefined)}
      >
        <svg
          class="ou-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ou-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--ou-green)" stop-opacity="0.2" />
              <stop offset="100%" stop-color="var(--ou-green)" stop-opacity="0" />
            </linearGradient>
          </defs>
          <For each={[0, 0.5, 1]}>
            {(ratio) => (
              <line
                class="ou-grid-line"
                x1="0"
                x2={width}
                y1={top + ratio * (height - top)}
                y2={top + ratio * (height - top)}
              />
            )}
          </For>
          <Show when={points().length > 1}>
            <path d={area()} fill="url(#ou-area-fill)" />
          </Show>
          <path class="ou-chart-line" d={line()} />
        </svg>
        <Show when={marker()}>
          {(point) => (
            <>
              <Show when={hovered()}>
                <span class="ou-cursor" style={{ left: `${point().left}%` }} />
              </Show>
              <span
                class="ou-marker"
                style={{ left: `${point().left}%`, top: `${point().top}%` }}
              />
              <Show when={!hovered()}>
                <span class="ou-marker-label" style={{ top: `${point().top}%` }}>
                  {props.tokens(point().tokens)}
                </span>
              </Show>
              <Show when={hovered()}>
                {(day) => (
                  <div
                    class="ou-tip"
                    classList={{ below: tipBelow() }}
                    style={{ left: `${tipLeft()}%`, top: `${point().top}%` }}
                    role="tooltip"
                  >
                    <div class="ou-tip-head">{formatDayFull(day().date, props.locale)}</div>
                    <div class="ou-tip-row">
                      <span>{props.labels.tokens}</span>
                      <b>{props.tokens(day().tokens)}</b>
                    </div>
                    <div class="ou-tip-row">
                      <span>{props.labels.requests}</span>
                      <b>{props.requests(day().requests)}</b>
                    </div>
                    <div class="ou-tip-row">
                      <span>{props.labels.cost}</span>
                      <b>{props.cost(day().costMicroCents)}</b>
                    </div>
                  </div>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>
      <div class="ou-axis">
        <For each={axis()}>
          {(date, index) => (
            <span
              class={
                index() === axis().length - 1
                  ? "ou-axis-last"
                  : index() > 0
                    ? "ou-axis-mid"
                    : undefined
              }
            >
              {formatDay(date, props.locale)}
            </span>
          )}
        </For>
      </div>
      <div class="ou-chart-foot">
        <span>{props.average}</span>
        <span class="ou-legend">
          <i />
          {props.usage}
        </span>
      </div>
    </div>
  );
}

export function UsagePanel(props: UsagePanelProps) {
  const ctx = props.ctx;
  const locale = () => ctx.locale.locale();
  const data = createUsageData(ctx, () => directoryOf(props.session()));
  const accounts = createAccountsData(ctx);
  const [selected, setSelected] = createSignal("");
  const limits = createLimitsData(
    ctx,
    () => directoryOf(props.session()),
    () => selected() || props.account(),
  );
  const [range, setRange] = createSignal<UsageRange>(props.initialRange);

  const tokens = (value: number) => formatTokens(value, locale());

  const reloadUsage = () => void data.load(range(), selected() || props.account());
  const reloadLimits = (refresh = false) => void limits.load(refresh);

  createEffect(() => {
    // Runs again when the session changes.
    props.session().id;
    void accounts.load();
  });

  // The pick survives in the store; the server's default covers a first run or a removed
  // credential. The store is rewritten when it held a stale id; the chip reads the same value.
  createEffect(() => {
    const report = accounts.report();
    const list = report?.accounts;
    if (!list || list.length === 0) return;
    const stored = props.account();
    const has = (id: string | undefined) =>
      !!id && list.some((account) => account.id === id);
    const next =
      (has(stored) ? stored : undefined) ??
      (has(selected()) ? selected() : undefined) ??
      report?.defaultID ??
      list[0].id;
    if (next !== selected()) setSelected(next);
    if (next !== stored) props.onAccount(next);
  });

  createEffect(() => {
    const list = accounts.report()?.accounts;
    const id = selected();
    // Wait for the account list, so the first read is for the account the select shows.
    if (!list && !id) return;
    reloadLimits();
  });

  createEffect(() => {
    // Usage follows both the range and the picked account.
    range();
    selected() || props.account();
    props.session().id;
    reloadUsage();
  });

  /**
   * Changes the account the tab reads. This is a view change only: it never activates a
   * credential in OpenCode, so the running session keeps its current provider.
   */
  const changeAccount = (id: string) => {
    if (!id || id === selected()) return;
    setSelected(id);
    props.onAccount(id);
    reloadLimits(true);
    reloadUsage();
  };

  const timer = setInterval(() => {
    reloadUsage();
    reloadLimits();
    void accounts.load();
  }, CLOCK_MS);
  onCleanup(() => clearInterval(timer));

  const report = () => data.report();
  const totals = () => report()?.totals;
  const totalTokens = () => totals()?.tokens ?? 0;

  const models = createMemo(() => (report()?.models ?? []).slice(0, SHARE_ROWS));
  const modelRequests = createMemo(() =>
    (report()?.models ?? []).reduce((sum, row) => sum + row.requests, 0),
  );

  const dayCount = () => Math.max(1, report()?.days?.length ?? 1);
  const average = () => ctx.t("chart.average", { tokens: tokens(totalTokens() / dayCount()) });

  const modelLabel = (row: UsageModelRow) => row.modelID || row.providerID;

  const stateMessage = () => {
    if (data.error()) return ctx.t("panel.error", { message: data.error() ?? "" });
    const value = report();
    if (!value || value.state === "ok") return undefined;
    if (value.state === "not-connected") return ctx.t("usage.notConnected");
    if (value.state === "not-subscribed") return ctx.t("limits.notSubscribed");
    return ctx.t("panel.error", { message: value.message ?? "" });
  };

  const isError = () => !!data.error() || report()?.state === "error";

  return (
    <div
      class="ou-root ou-padded"
      classList={{ "ou-loading": data.loading() }}
      data-mode={ctx.appearance.mode()}
    >
      <div class="ou-head">
        <div class="ou-seg" role="group" aria-label={ctx.t("panel.title")}>
          <For each={USAGE_RANGES}>
            {(option) => (
              <button
                type="button"
                aria-pressed={range() === option}
                onClick={() => setRange(option)}
              >
                {ctx.t(`range.${option}`)}
              </button>
            )}
          </For>
        </div>
        <span class="ou-spacer" />
        <ctx.ui.IconButton
          icon="refresh"
          label={ctx.t("panel.refresh")}
          onClick={() => {
            void data.load(range(), selected() || props.account());
            void accounts.load();
            void limits.load(true);
          }}
        />
      </div>

      <LimitsCard
        ctx={ctx}
        report={limits.report}
        loading={limits.loading}
        accounts={accounts.report}
        accountsLoading={accounts.loading}
        selected={selected}
        onAccount={(id) => changeAccount(id)}
      />

      <Show when={stateMessage()}>
        {(message) => (
          <p class={isError() ? "ou-error" : "ou-muted ou-small"}>{message()}</p>
        )}
      </Show>

      <Show
        when={totals()}
        fallback={
          <Show when={!stateMessage()}>
            <p class="ou-muted ou-loading-row">
              <ctx.ui.Loader size="small" />
              {ctx.t("panel.loading")}
            </p>
          </Show>
        }
      >
        {(sums) => (
          <>
            <Show when={(report()?.days?.length ?? 0) > 0}>
              <Chart
                days={report()?.days ?? []}
                locale={locale()}
                tokens={tokens}
                requests={(value) => formatCount(value, locale())}
                cost={(value) => formatCost(value, locale())}
                labels={{
                  tokens: ctx.t("total.tokens"),
                  requests: ctx.t("total.requests"),
                  cost: ctx.t("total.cost"),
                }}
                average={average()}
                usage={ctx.t("chart.usage")}
              />
            </Show>

            <Show when={sums().tokens === 0}>
              <p class="ou-muted">{ctx.t("panel.empty")}</p>
            </Show>

            <div class="ou-cards">
              <Card title={ctx.t("card.totals")} subtitle={ctx.t("card.totals.sub")}>
                <Row label={ctx.t("total.tokens")} value={tokens(sums().tokens)} big />
                <Row
                  label={ctx.t("total.requests")}
                  value={formatCount(sums().requests, locale())}
                />
                <Row
                  label={ctx.t("total.cost")}
                  value={formatCost(sums().costMicroCents, locale())}
                />
              </Card>

              <Card title={ctx.t("card.models")} subtitle={ctx.t("card.models.sub")}>
                <For each={models()}>
                  {(row) => (
                    <ShareRow
                      name={modelLabel(row)}
                      detail={row.providerID}
                      percent={share(row.requests, modelRequests())}
                      value={percentText(share(row.requests, modelRequests()))}
                    />
                  )}
                </For>
                <div class="ou-divider" />
                <Row
                  label={ctx.t("row.models")}
                  value={formatCount(report()?.models?.length ?? 0, locale())}
                />
                <Row
                  label={ctx.t("total.requests")}
                  value={formatCount(modelRequests(), locale())}
                />
              </Card>
            </div>

            <p class="ou-muted ou-small">{ctx.t("panel.source")}</p>
          </>
        )}
      </Show>
    </div>
  );
}

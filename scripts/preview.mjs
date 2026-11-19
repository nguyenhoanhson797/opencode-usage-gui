/**
 * Renders `preview/panel.html`: the panel's markup and the plugin's real CSS, filled with a
 * fixed sample of what the OpenCode Go activity API reports. Open the file (or show it with the
 * browser tool) to check the look without restarting the app.
 *
 * This is a styling aid, not part of what OpenCode loads. The markup mirrors `src/gui/panel.tsx`
 * by hand; when that file changes, change this one too. Numbers are a sample, not a live read:
 * the panel itself asks the Console through the plugin's server part.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The CSS string from `src/gui/style.ts`, between `STYLE = \`` and the closing backtick. */
function readCss() {
  const source = readFileSync(path.join(root, "src/gui/style.ts"), "utf8");
  const match = /export const STYLE = `([\s\S]*?)`;\s*$/m.exec(source);
  if (!match) throw new Error("STYLE template not found in src/gui/style.ts");
  return match[1];
}

const sampleDays = [
  ["2026-11-12", 112_480_000, 412, 61_240_000],
  ["2026-11-13", 168_230_000, 640, 84_910_000],
  ["2026-11-14", 96_420_000, 355, 52_680_000],
  ["2026-11-15", 131_870_000, 505, 71_350_000],
  ["2026-11-16", 88_540_000, 318, 47_920_000],
  ["2026-11-17", 142_960_000, 522, 78_410_000],
  ["2026-11-18", 160_320_000, 604, 86_070_000],
];

const report = {
  range: "7d",
  days: sampleDays.map(([date, tokens, requests, costMicroCents]) => ({
    date,
    tokens,
    requests,
    costMicroCents,
  })),
  models: [
    { providerID: "opencode-go", modelID: "deepseek-v4.1-flash", requests: 4100 },
    { providerID: "opencode-go", modelID: "qwen4-max", requests: 1180 },
    { providerID: "opencode-go", modelID: "gpt-6-luna", requests: 590 },
  ],
};

const totals = report.days.reduce(
  (sum, day) => ({
    tokens: sum.tokens + day.tokens,
    requests: sum.requests + day.requests,
    costMicroCents: sum.costMicroCents + day.costMicroCents,
  }),
  { tokens: 0, requests: 0, costMicroCents: 0 },
);
const modelRequests = report.models.reduce((sum, row) => sum + row.requests, 0);

const locale = "en";
const tokens = (value) => {
  if (value === 0) return "0";
  const digits = value >= 1e9 ? 2 : value >= 1000 ? 1 : 0;
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: digits }).format(value);
};
const count = (value) => new Intl.NumberFormat(locale).format(value);
const cost = (microCents) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: microCents / 1e8 >= 1 ? 2 : 4,
  }).format(microCents / 1e8);
const dayLabel = (date) => {
  const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
    new Date(Number(y), Number(m) - 1, Number(d)),
  );
};
const dayFull = (date) => {
  const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Number(y), Number(m) - 1, Number(d)));
};
const percent = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
const percentText = (p) => (p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`);

function chartSvg() {
  const days = report.days;
  const width = 600;
  const height = 150;
  const top = 14;
  const max = Math.max(1, ...days.map((d) => d.tokens));
  const points = days.map((day, index) => ({
    day,
    x: days.length === 1 ? width : (index / (days.length - 1)) * width,
    y: Math.max(top, height - (day.tokens / max) * (height - top)),
  }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `M0,${height} ${points
    .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ")} L${width},${height} Z`;
  const last = points.at(-1);
  const hover = points[Math.min(points.length - 1, 3)];
  const grid = [0, 0.5, 1]
    .map(
      (r) =>
        `<line class="ou-grid-line" x1="0" x2="${width}" y1="${top + r * (height - top)}" y2="${top + r * (height - top)}" />`,
    )
    .join("");
  const marker = last
    ? `<span class="ou-marker" style="left:${((last.x / width) * 100).toFixed(2)}%;top:${((last.y / height) * 100).toFixed(2)}%"></span>`
    : "";
  const cursor = hover
    ? `<span class="ou-cursor" style="left:${((hover.x / width) * 100).toFixed(2)}%"></span>`
    : "";
  const tip = hover
    ? `<div class="ou-tip${hover.y < height * 0.38 ? " below" : ""}" style="left:${Math.min(72, Math.max(28, (hover.x / width) * 100)).toFixed(2)}%;top:${((hover.y / height) * 100).toFixed(2)}%">
        <div class="ou-tip-head">${dayFull(hover.day.date)}</div>
        <div class="ou-tip-row"><span>Tokens</span><b>${tokens(hover.day.tokens)}</b></div>
        <div class="ou-tip-row"><span>Requests</span><b>${count(hover.day.requests)}</b></div>
        <div class="ou-tip-row"><span>Cost</span><b>${cost(hover.day.costMicroCents)}</b></div>
      </div>`
    : "";
  const axisDays =
    days.length <= 2
      ? days.map((d) => d.date)
      : [days[0].date, days[Math.floor((days.length - 1) / 2)].date, days.at(-1).date];
  const axis = axisDays
    .map((date, i) => {
      const cls =
        i === axisDays.length - 1 ? "ou-axis-last" : i > 0 ? "ou-axis-mid" : "";
      return `<span class="${cls}">${dayLabel(date)}</span>`;
    })
    .join("");
  return `
    <div class="ou-chart-wrap">
      <div class="ou-chart-box">
        <svg class="ou-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="ou-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--ou-green)" stop-opacity="0.2" />
              <stop offset="100%" stop-color="var(--ou-green)" stop-opacity="0" />
            </linearGradient>
          </defs>
          ${grid}
          ${points.length > 1 ? `<path d="${area}" fill="url(#ou-area-fill)" />` : ""}
          <path class="ou-chart-line" d="${line}" />
        </svg>
        ${cursor}
        ${marker}
        ${tip}
      </div>
      <div class="ou-axis">${axis}</div>
      <div class="ou-chart-foot">
        <span>Averaging ${tokens(totals.tokens / Math.max(1, days.length))} a day</span>
        <span class="ou-legend"><i></i>Usage</span>
      </div>
    </div>`;
}

function shareRow(name, detail, part, whole) {
  const p = percent(part, whole);
  return `<div class="ou-share">
    <div class="ou-share-line">
      <span class="ou-share-name">${name}</span>
      ${detail ? `<span class="ou-share-detail">${detail}</span>` : ""}
      <span class="ou-share-value">${percentText(p)}</span>
    </div>
    <div class="ou-bar-track"><div class="ou-bar-fill" style="width:${Math.max(1, p).toFixed(1)}%"></div></div>
  </div>`;
}

function row(label, value, big) {
  return `<div class="ou-row"><span class="ou-row-label">${label}</span><span class="ou-row-value${big ? " big" : ""}">${value}</span></div>`;
}

function card(title, subtitle, body) {
  return `<section class="ou-card">
    <header class="ou-card-head">
      <div><h3 class="ou-card-title">${title}</h3><p class="ou-card-sub">${subtitle}</p></div>
      <span class="ou-chevron" aria-hidden="true">›</span>
    </header>
    <div class="ou-card-body">${body}</div>
  </section>`;
}

const modelRows = report.models
  .map((m) => shareRow(m.modelID, m.providerID, m.requests, modelRequests))
  .join("");

const ranges = ["Today", "7d", "30d", "Month", "Plan"]
  .map(
    (label) =>
      `<button type="button" aria-pressed="${label === "7d" ? "true" : "false"}">${label}</button>`,
  )
  .join("");

const limitWindows = [
  ["Rolling 5h", 5, "2h 14m", "95% left"],
  ["Weekly", 9, "4d 3h", "91% left"],
  ["Monthly", 94, "2d 18h", "6% left"],
];

const limitsCard = card(
  "Limits",
  "OpenCode Go plan",
  `<label class="ou-account">
    <span class="ou-account-label">Account</span>
    <select class="ou-account-select">
      <option>Personal · Console</option>
      <option>Default · Console</option>
      <option>OpenCode Go · API key</option>
    </select>
  </label>
  <div class="ou-limits-rows">${limitWindows
    .map(
      ([name, percent, resets, left]) => `<div class="ou-limit">
        <div class="ou-limit-head"><span class="ou-limit-name">${name}</span><span class="ou-limit-value">${percent}%</span></div>
        <div class="ou-bar-track"><div class="ou-bar-fill${percent >= 100 ? " ou-full" : percent >= 75 ? " ou-warn" : ""}" style="width:${Math.max(1, percent)}%"></div></div>
        <div class="ou-limit-foot"><span>Resets in ${resets}</span><span>${left}</span></div>
      </div>`,
    )
    .join("")}</div>
  <p class="ou-muted ou-small ou-limit-note">Plan ends in 2d 18h</p>`,
).replace('class="ou-card"', 'class="ou-card ou-limits"');

const cards = [
  card(
    "Totals",
    "This window",
    row("Tokens", tokens(totals.tokens), true) +
      row("Requests", count(totals.requests)) +
      row("Cost", cost(totals.costMicroCents)),
  ),
  card(
    "Models",
    "By requests, whole plan period",
    modelRows +
      `<div class="ou-divider"></div>` +
      row("Models", count(report.models.length)) +
      row("Requests", count(modelRequests)),
  ),
].join("");

function strip(width) {
  return `<div class="ou-strip-demo" style="width:${width}px">
    <span class="ou-tab ou-tab-on">Usage</span>
    <span class="ou-tab">Files</span>
    <span class="ou-strip-gap"></span>
    <div class="ou-root ou-entry-wrap" data-mode="dark">
      <button type="button" class="ou-entry" aria-label="OpenCode Go Rolling 5h: 5% used">
        <span class="ou-entry-label">5h</span>
        <span class="ou-entry-ring">
          <svg viewBox="0 0 14 14">
            <circle class="ou-ring-track" cx="7" cy="7" r="5.5"></circle>
            <circle class="ou-ring-fill" cx="7" cy="7" r="5.5" style="stroke-dasharray:34.56;stroke-dashoffset:32.83"></circle>
          </svg>
        </span>
      </button>
    </div>
    <span class="ou-plus" aria-hidden="true">+</span>
  </div>`;
}

function panel(width) {
  return `<div class="ou-root ou-padded" data-mode="dark" style="width:${width}px;background:#0c0c0c">
    <div class="ou-head">
      <div class="ou-seg" role="group" aria-label="Usage">${ranges}</div>
      <span class="ou-spacer"></span>
      <span class="ou-iconbtn" aria-hidden="true">⟳</span>
    </div>
    ${limitsCard}
    ${chartSvg()}
    <div class="ou-cards">${cards}</div>
    <p class="ou-muted ou-small">Usage and limits are read from the OpenCode Console for the selected account.</p>
  </div>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Usage panel preview</title>
<style>
  body { margin: 0; background: #0a0a0a; color: #ededed; font-family: var(--font-family-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif); }
  .frame { display: flex; gap: 28px; align-items: flex-start; padding: 28px; flex-wrap: wrap; }
  .caption { color: #8a8a8a; font-size: 12px; margin: 0 0 10px; }
  .ou-iconbtn { color: #8a8a8a; font-size: 14px; }
  .ou-strip-demo { display: flex; align-items: center; gap: 6px; height: 32px; margin-bottom: 10px; box-sizing: border-box;
    padding: 0 8px; border: 1px solid #262626; border-radius: 8px; background: #101010; }
  .ou-strip-demo .ou-root { gap: 0; }
  .ou-tab { color: #8a8a8a; font-size: 12px; padding: 3px 8px; border-radius: 5px; background: #171717; }
  .ou-tab-on { color: #ededed; }
  .ou-strip-gap { flex: 1; }
  .ou-plus { color: #8a8a8a; font-size: 15px; width: 20px; text-align: center; }
${readCss()}
</style>
</head>
<body>
  <div class="frame">
    <div>
      <p class="caption">Tab strip: the chip sits beside +</p>
      ${strip(320)}
      <p class="caption">Side panel · 320 px</p>
      ${panel(320)}
    </div>
    <div>
      <p class="caption">Dragged wide · 900 px (cards sit in one row)</p>
      ${strip(900)}
      ${panel(900)}
    </div>
  </div>
</body>
</html>
`;

mkdirSync(path.join(root, "preview"), { recursive: true });
writeFileSync(path.join(root, "preview/panel.html"), html, "utf8");

// A single wide panel in an app-window shell, for the README screenshot.
const hero = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Usage panel</title>
<style>
  body { margin: 0; padding: 20px; background: #0a0a0a; color: #ededed; font-family: var(--font-family-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif); }
  .window { display: inline-block; width: 576px; padding: 8px; box-sizing: border-box;
    border: 1px solid #262626; border-radius: 12px; background: #0c0c0c;
    box-shadow: 0 20px 60px rgba(0, 0, 0, .55); }
  .ou-iconbtn { color: #8a8a8a; font-size: 14px; }
  .ou-strip-demo { display: flex; align-items: center; gap: 6px; height: 32px; margin-bottom: 10px; box-sizing: border-box;
    padding: 0 8px; border: 1px solid #262626; border-radius: 8px; background: #101010; }
  .ou-strip-demo .ou-root { gap: 0; }
  .ou-tab { color: #8a8a8a; font-size: 12px; padding: 3px 8px; border-radius: 5px; background: #171717; }
  .ou-tab-on { color: #ededed; }
  .ou-strip-gap { flex: 1; }
  .ou-plus { color: #8a8a8a; font-size: 15px; width: 20px; text-align: center; }
${readCss()}
</style>
</head>
<body>
  <div class="window">
    ${strip(560)}
    ${panel(560)}
  </div>
</body>
</html>
`;
writeFileSync(path.join(root, "preview/hero.html"), hero, "utf8");
console.log("wrote preview/panel.html", report.days.length, "days", report.models.length, "models");

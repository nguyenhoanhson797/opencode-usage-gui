/**
 * The plugin's CSS, added once with the `Style` registry.
 *
 * It follows the OpenCode Console's usage screen: dark flat cards with a thin border, a green
 * line chart over dashed grid lines, a dark date strip under it, and label/value rows with slim
 * progress bars. Light mode keeps the same shapes with the app's light tokens.
 *
 * Every class starts with `ou-`. Colours prefer the app's theme variables and fall back to the
 * console palette; `data-mode` comes from `ctx.appearance.mode()`.
 */
export const STYLE = `
.ou-root {
  --ou-text: var(--text-strong, #0b0b0b);
  --ou-text-2: var(--text-base, #444444);
  --ou-muted: var(--text-weak, #6b7280);
  --ou-card: var(--surface-raised-base, #ffffff);
  --ou-card-border: var(--border-weak-base, #e5e5e5);
  --ou-track: #ececec;
  --ou-green: #16a34a;
  --ou-grid: #e8e8e8;
  color: var(--ou-text);
  font-size: 13px;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  container-type: inline-size;
}
.ou-root[data-mode="dark"] {
  --ou-text: var(--text-strong, #ededed);
  --ou-text-2: var(--text-base, #b3b3b3);
  --ou-muted: var(--text-weak, #8a8a8a);
  --ou-card: var(--surface-raised-base, #121212);
  --ou-card-border: var(--border-weak-base, #262626);
  --ou-track: #2a2a2a;
  --ou-green: #43d17a;
  --ou-grid: #2a2a2a;
}
.ou-padded { padding: 12px 14px 14px; }
.ou-root.ou-padded { height: 100%; max-height: 100%; min-height: 0; overflow-y: auto;
  box-sizing: border-box; overscroll-behavior: contain; scrollbar-width: thin; }
.ou-loading .ou-chart-wrap, .ou-loading .ou-cards { opacity: .55; transition: opacity .15s ease; }
.ou-muted { color: var(--ou-muted); }
.ou-small { font-size: 12px; }
.ou-error { color: var(--icon-critical-base, #d03b3b); margin: 0; }
.ou-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.ou-spacer { margin-left: auto; }
.ou-seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 8px; background: var(--ou-track); }
.ou-seg button { border: 0; background: transparent; color: var(--ou-muted); font: inherit; font-size: 12px;
  padding: 3px 7px; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.ou-seg button:hover { color: var(--ou-text); }
.ou-seg button[aria-pressed="true"] { background: var(--ou-card); color: var(--ou-text);
  box-shadow: 0 0 0 1px var(--ou-card-border); }

.ou-chart-wrap { display: flex; flex-direction: column; gap: 10px; }
.ou-chart-box { position: relative; touch-action: pan-y; }
.ou-chart { width: 100%; height: 150px; display: block; overflow: visible; }
.ou-grid-line { stroke: var(--ou-grid); stroke-width: 1; stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.ou-chart-line { fill: none; stroke: var(--ou-green); stroke-width: 2; stroke-linejoin: round;
  stroke-linecap: round; vector-effect: non-scaling-stroke; }
.ou-marker { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: var(--ou-green);
  transform: translate(-50%, -50%); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ou-green) 22%, transparent); }
.ou-marker-label { position: absolute; right: 2px; transform: translateY(-100%); padding-bottom: 7px;
  font-size: 11px; font-variant-numeric: tabular-nums; color: var(--ou-text); }
.ou-cursor { position: absolute; top: 0; bottom: 0; width: 1px; transform: translateX(-.5px);
  background: color-mix(in srgb, var(--ou-green) 45%, transparent); pointer-events: none; }
.ou-tip { position: absolute; z-index: 2; min-width: 132px; max-width: 200px; padding: 7px 9px;
  border: 1px solid var(--ou-card-border); border-radius: 8px; background: var(--ou-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28); transform: translate(-50%, calc(-100% - 10px));
  pointer-events: none; }
.ou-tip.below { transform: translate(-50%, 10px); }
.ou-tip-head { margin-bottom: 4px; color: var(--ou-muted); font-size: 11px; white-space: nowrap; }
.ou-tip-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; }
.ou-tip-row span { color: var(--ou-text-2); }
.ou-tip-row b { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ou-axis { display: flex; justify-content: space-between; gap: 8px; padding: 5px 10px;
  border-radius: 6px; background: var(--ou-track); color: var(--ou-muted); font-size: 11px; }
.ou-axis .ou-axis-last { color: var(--ou-green); }
.ou-chart-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  color: var(--ou-muted); font-size: 12px; }
.ou-legend { display: inline-flex; align-items: center; gap: 6px; }
.ou-legend i { display: inline-block; width: 3px; height: 12px; border-radius: 2px; background: var(--ou-green); }

.ou-cards { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
@container (min-width: 480px) {
  .ou-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ou-chart { height: 168px; }
}
@container (max-width: 400px) {
  .ou-cards { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .ou-chart { height: 116px; }
  .ou-card { padding: 10px 10px 9px; }
  .ou-card-body { gap: 7px; }
  .ou-card-title { font-size: 13px; }
  .ou-card-sub { font-size: 11px; }
  .ou-row-value.big { font-size: 16px; }
  .ou-seg button { padding: 3px 6px; font-size: 11px; }
  .ou-axis { padding: 4px 8px; font-size: 10px; }
  .ou-axis .ou-axis-mid { display: none; }
  .ou-marker-label { font-size: 10px; }
  .ou-chart-foot { font-size: 11px; }
}
.ou-card { border: 1px solid var(--ou-card-border); background: var(--ou-card); border-radius: 10px;
  padding: 12px 12px 10px; min-width: 0; }
.ou-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.ou-card-title { margin: 0; font-size: 14px; font-weight: 600; }
.ou-card-sub { margin: 2px 0 0; color: var(--ou-muted); font-size: 12px; }
.ou-card-body { margin-top: 10px; display: flex; flex-direction: column; gap: 9px; }
.ou-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; }
.ou-row-label { color: var(--ou-text-2); min-width: 0; }
.ou-row-label em { display: block; font-style: normal; color: var(--ou-muted); font-size: 11px; }
.ou-row-value { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ou-row-value.big { font-size: 18px; }
.ou-share { display: flex; flex-direction: column; gap: 4px; }
.ou-share-line { display: flex; align-items: baseline; gap: 6px; font-size: 13px; min-width: 0; }
.ou-share-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ou-share-detail { color: var(--ou-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ou-share-value { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
.ou-bar-track { height: 3px; border-radius: 2px; background: var(--ou-track); overflow: hidden; }
.ou-bar-fill { height: 100%; border-radius: 2px; background: var(--ou-green); }
.ou-divider { height: 1px; background: var(--ou-card-border); margin: 1px 0; }

.ou-limits .ou-card-body { gap: 11px; }
.ou-account { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ou-account-label { color: var(--ou-muted); font-size: 11px; white-space: nowrap; cursor: help; }
.ou-account-loading { display: inline-flex; align-items: center; gap: 6px; color: var(--ou-muted); font-size: 12px; }
.ou-loading-row { display: flex; align-items: center; gap: 8px; margin: 0; }
.ou-account-select { flex: 1; min-width: 0; height: 26px; padding: 0 6px; border-radius: 6px;
  border: 1px solid var(--ou-card-border); background: var(--ou-track); color: var(--ou-text);
  font: inherit; font-size: 12px; }
.ou-account-select:disabled { opacity: .6; }
.ou-limits-rows { display: flex; flex-direction: column; gap: 11px; }
.ou-limit { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ou-limit-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; }
.ou-limit-name { color: var(--ou-text-2); }
.ou-limit-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.ou-limit-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  color: var(--ou-muted); font-size: 11px; }
.ou-limit-note { margin: 2px 0; }
.ou-bar-fill.ou-warn { background: #d97706; }
.ou-bar-fill.ou-full { background: #dc2626; }

.ou-entry-wrap { flex: none; container-type: normal; }
.ou-entry { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 7px;
  border: 1px solid var(--ou-card-border); border-radius: 6px; background: transparent;
  color: var(--ou-text-2); font: inherit; font-size: 11px; line-height: 1; cursor: pointer;
  white-space: nowrap; }
.ou-entry:hover { color: var(--ou-text); background: var(--surface-base-hover, rgba(127,127,127,.12)); }
.ou-entry-label { color: var(--ou-muted); }
.ou-entry-ring { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex: none; }
.ou-entry-ring svg { display: block; width: 14px; height: 14px; transform: rotate(-90deg); }
.ou-entry-ring circle { fill: none; stroke-width: 2.2; }
.ou-spinner { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--ou-track);
  border-top-color: var(--ou-green); animation: ou-spin .8s linear infinite; }
@keyframes ou-spin { to { transform: rotate(360deg); } }
.ou-ring-track { stroke: var(--ou-track); }
.ou-ring-fill { stroke: var(--ou-green); stroke-linecap: round; transition: stroke-dashoffset .3s ease; }
.ou-ring-fill.ou-warn { stroke: #d97706; }
.ou-ring-fill.ou-full { stroke: #dc2626; }

/* The hover list lives in the app's tooltip, outside the panel's ou-root, so it reads the
   app tokens with fallbacks instead of the console palette. */
.ou-chip-tip { display: flex; flex-direction: column; gap: 6px; min-width: 186px; color: inherit; }
.ou-chip-tip-title { color: var(--text-weak, #8a8a8a); font-size: 11px; }
.ou-chip-table { border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
.ou-chip-table th, .ou-chip-table td { padding: 2px 0 2px 12px; text-align: right; font-weight: 400;
  white-space: nowrap; }
.ou-chip-table thead th { padding-bottom: 3px; color: var(--text-weak, #8a8a8a); font-size: 11px; }
.ou-chip-table th:first-child, .ou-chip-table td:first-child { padding-left: 0; text-align: left; }
.ou-chip-account { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.ou-chip-row-on .ou-chip-account { font-weight: 600; }
.ou-chip-num.ou-warn { color: #d97706; }
.ou-chip-num.ou-full { color: #dc2626; }
.ou-chip-note { display: inline-block; max-width: 190px; font-size: 12px; }
.ou-settings-path { font-family: var(--font-family-mono, ui-monospace, monospace); font-size: 11px;
  word-break: break-all; color: var(--ou-muted); }
`;

/** Number and date formatting that follows the app's language. */

export function formatTokens(value: number, locale: string): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  // About four significant digits: 1.03B, 158.8M, 4.5K, 812.
  const digits = value >= 1e9 ? 2 : value >= 1000 ? 1 : 0;
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** The Console's cost, in micro-cents ($1 = 100,000,000). */
export function formatCost(microCents: number, locale: string): string {
  const dollars = microCents / 100_000_000;
  const digits = Math.abs(dollars) >= 1 ? 2 : 4;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(dollars);
}

/** "2026-11-18" as a short local date. */
export function formatDay(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(parsed);
}

/** "2026-11-18" with the weekday, for the chart's hover tooltip. */
export function formatDayFull(date: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

/** A span as "2h 14m", "3d 4h" or "45m". */export function formatSpan(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return "<1m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  return `${rest}m`;
}

/** How long until an ISO timestamp: "2h 14m", or "now" once it has passed. */
export function formatUntil(iso: string, now = Date.now()): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const diff = at - now;
  return diff <= 0 ? "now" : formatSpan(diff);
}

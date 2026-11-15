// Date and money helpers. Dates are plain "YYYY-MM-DD" strings handled in UTC
// so a forecast never shifts by a day because of the server's time zone.

const DAY = 86_400_000;

export function toDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return toISO(new Date(toDate(s).getTime() + n * DAY));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Jan 15" */
export function fmtDate(s: string): string {
  const d = toDate(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Fri, Jan 15" */
export function fmtDay(s: string): string {
  const d = toDate(s);
  return `${WEEKDAYS[d.getUTCDay()]}, ${fmtDate(s)}`;
}

/** "Jan 15 – 28" or "Dec 25 – Jan 7" */
export function fmtRange(a: string, b: string): string {
  const da = toDate(a);
  const db = toDate(b);
  if (da.getUTCMonth() === db.getUTCMonth()) return `${fmtDate(a)} – ${db.getUTCDate()}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}

/** "$3,400" (whole dollars), "−$300" for negatives. */
export function usd(cents: number, opts: { sign?: boolean } = {}): string {
  const dollars = Math.round(cents / 100);
  const abs = Math.abs(dollars).toLocaleString("en-US");
  if (dollars < 0) return `−$${abs}`;
  return `${opts.sign && dollars > 0 ? "+" : ""}$${abs}`;
}

/** "$3.4k", "$12k", "−$800" */
export function usdCompact(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "−" : "";
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}$${Math.round(abs)}`;
}

/** Round up to the next $100, in cents. */
export function ceilHundred(cents: number): number {
  return Math.ceil(cents / 10_000) * 10_000;
}

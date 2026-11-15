// Small helpers shared by the edit forms.
import { addDays, toDate, toISO, usd } from "./format";
import { HORIZON_WEEKS } from "./engine/forecast";
import type { ExpectedPayment, IncomeStream } from "./types";

export function newId(prefix: string) {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}

/** "1,250.50" or "$1250" -> 125050 cents. Returns null if not a number. */
export function parseDollars(s: string): number | null {
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function centsToInput(cents: number): string {
  const d = Math.abs(cents) / 100;
  return Number.isInteger(d) ? String(d) : d.toFixed(2);
}

export type RepeatCadence = "weekly" | "biweekly" | "monthly";

function addMonth(date: string, n: number): string {
  const d = toDate(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return toISO(target);
}

/** Expand a repeating payment into dated payments through the forecast horizon. */
export function repeatPayments(cadence: RepeatCadence, first: string, amountCents: number, lateDays: number, today: string): ExpectedPayment[] {
  const end = addDays(today, HORIZON_WEEKS * 7 + 7);
  const out: ExpectedPayment[] = [];
  let d = first;
  for (let i = 0; d <= end && i < 60; i++) {
    out.push({ expectedDate: d, amountCents, latestDate: lateDays > 0 ? addDays(d, lateDays) : undefined });
    d = cadence === "weekly" ? addDays(d, 7) : cadence === "biweekly" ? addDays(d, 14) : addMonth(first, i + 1);
  }
  return out;
}

const CADENCE_TEXT: Record<RepeatCadence, string> = { weekly: "every week", biweekly: "every other week", monthly: "every month" };

export function summarizeStream(s: Pick<IncomeStream, "cadence" | "payments">): string {
  const amounts = s.payments.map((p) => p.amountCents);
  if (amounts.length === 0) return "No payments scheduled";
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (s.cadence === "weekly" || s.cadence === "biweekly" || s.cadence === "monthly") return `${usd(max)} ${CADENCE_TEXT[s.cadence]}`;
  if (amounts.length === 1) return `${usd(max)} expected`;
  return `${amounts.length} payments, ${min === max ? usd(max) : `${usd(min)}–${usd(max)}`} each`;
}

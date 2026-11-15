// Runway's forecast engine. Pure, deterministic, no I/O: same profile in, same
// forecast out. The UI and (later) the AI assistant only explain its numbers.
//
// Method, in plain words:
// - We project the CHECKING (operating) balance day by day for 12 weeks.
//   Savings ("reserve") is shown separately: a dip in checking that savings can
//   cover is fixable by moving money; a dip savings can't cover is a real shortfall.
// - Three cases, built from each item's own uncertainty:
//     low  = income late (latest date), at the low end, uncertain income left out;
//            bills at the high end; day-to-day spending above average.
//     base = everything on its expected date at its expected amount
//            (income marked "uncertain" is left out).
//     high = income early and at the high end, uncertain income included;
//            bills and spending at the low end.
// - Spending uncertainty grows with the square root of time, so the range widens
//   the further out you look.

import { addDays, ceilHundred, daysBetween, fmtDate, fmtRange, toDate, toISO, usd } from "../format";
import type { Confidence, Profile } from "../types";

export const HORIZON_WEEKS = 12;
const HORIZON_DAYS = HORIZON_WEEKS * 7;

export type Case = "low" | "base" | "high";
export type Status = "ok" | "tight" | "short" | "shortfall";

export interface CashEvent {
  id: string;
  kind: "income" | "bill" | "transfer" | "planned" | "tax";
  label: string;
  sourceName?: string;
  /** What produced this event, so the UI can open the right editor: an income stream, bill or plan id, or "tax" for the computed estimate. */
  sourceId: string;
  date: Record<Case, string>;
  amount: Record<Case, number>;
  included: Record<Case, boolean>;
  confidence?: Confidence;
  toReserve?: boolean;
  essential?: boolean;
}

export interface WeekResult {
  index: number; // 1..12
  start: string;
  end: string;
  low: number;
  base: number;
  high: number;
  lowMinDate: string;
  status: Status;
}

export interface Reasons {
  outflows: { label: string; date: string; amount: number }[];
  waitingFor: { label: string; earliest: string; latest: string; amount: number } | null;
  sentence: string;
}

export interface Fix {
  kind: "move" | "shortfall";
  amount: number;
  from?: string;
  by?: string;
  sentence: string;
  rule: string;
}

export interface WindowResult {
  index: number; // 1..6
  weeks: [WeekResult, WeekResult];
  start: string;
  end: string;
  low: number;
  base: number;
  high: number;
  lowMinDate: string;
  status: Status;
  reasons?: Reasons;
  fix?: Fix;
  /** Set when this window is the same dip as an earlier flagged window. */
  continuesFrom?: number;
}

export interface Forecast {
  today: string;
  zFor: number;
  operatingToday: number;
  reserveToday: number;
  reserveAccounts: { id: string; name: string; balance: number }[];
  events: CashEvent[];
  weeks: WeekResult[];
  windows: WindowResult[];
  lowest: { base: number; baseDate: string; low: number; lowDate: string };
  runway: { weeks: number; weeklyBurn: number; liquid: number; target: number };
  tax?: { amount: number; dueDate: string; setAside: number; covered: boolean };
  cushion: number;
}

const Z = { 80: 1.2816, 90: 1.6449 } as const;

// ---------------------------------------------------------------------------
// 1. Expand the profile into dated cash events inside the horizon.

function expandBillDates(
  bill: Profile["recurringBills"][number],
  from: string,
  to: string,
): string[] {
  const dates: string[] = [];
  if (bill.cadence === "weekly" || bill.cadence === "biweekly") {
    const step = bill.cadence === "weekly" ? 7 : 14;
    let d = bill.firstDate!;
    while (d < from) d = addDays(d, step);
    for (; d <= to; d = addDays(d, step)) dates.push(d);
    return dates;
  }
  const monthStep = bill.cadence === "bimonthly" ? 2 : 1;
  const start = toDate(bill.firstDate ?? from);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  for (let i = 0; i < 6; i++) {
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(bill.dayOfMonth ?? start.getUTCDate(), lastDay);
    const d = toISO(new Date(Date.UTC(y, m, day)));
    if (d >= from && d <= to) dates.push(d);
    m += monthStep;
    if (m > 11) { y += Math.floor(m / 12); m %= 12; }
  }
  return dates;
}

function buildEvents(p: Profile, from: string, to: string): { events: CashEvent[]; taxAmount?: number } {
  const events: CashEvent[] = [];
  const inRange = (d: string) => d >= from && d <= to;

  for (const s of p.incomeStreams) {
    s.payments.forEach((pay, i) => {
      const conf = pay.confidence ?? s.confidence;
      const latest = pay.latestDate ?? pay.expectedDate;
      const earliest = pay.earliestDate ?? pay.expectedDate;
      const ev: CashEvent = {
        id: `${s.id}-${i}`,
        sourceId: s.id,
        kind: "income",
        label: pay.label ?? s.name,
        sourceName: s.name,
        confidence: conf,
        date: { low: latest, base: pay.expectedDate, high: earliest },
        amount: {
          low: Math.max(0, pay.amountCents - s.amountSpreadCents),
          base: pay.amountCents,
          high: pay.amountCents + s.amountSpreadCents,
        },
        included: {
          low: conf !== "uncertain" && inRange(latest),
          base: conf !== "uncertain" && inRange(pay.expectedDate),
          high: inRange(earliest),
        },
      };
      if (ev.included.low || ev.included.base || ev.included.high) events.push(ev);
    });
  }

  for (const b of p.recurringBills) {
    for (const d of expandBillDates(b, from, to)) {
      const isTransfer = Boolean(b.toAccountId);
      events.push({
        id: `${b.id}-${d}`,
        sourceId: b.id,
        kind: isTransfer ? "transfer" : "bill",
        label: b.name,
        date: { low: d, base: d, high: d },
        amount: {
          low: b.amountCents - b.amountSpreadCents,
          base: b.amountCents,
          high: Math.min(0, b.amountCents + b.amountSpreadCents),
        },
        included: { low: true, base: true, high: true },
        toReserve: isTransfer,
        essential: b.essential,
      });
    }
  }

  for (const e of p.plannedEvents) {
    if (!inRange(e.dueDate)) continue;
    events.push({
      id: e.id,
      sourceId: e.id,
      kind: e.kind === "tax_payment" ? "tax" : "planned",
      label: e.name,
      date: { low: e.dueDate, base: e.dueDate, high: e.dueDate },
      amount: { low: e.amountCents, base: e.amountCents, high: e.amountCents },
      included: { low: true, base: true, high: true },
    });
  }

  // Estimated tax: set-aside % of untaxed income in the period (received so far
  // plus what the base case expects before the period ends). A planned
  // tax_payment on the due date overrides this.
  let taxAmount: number | undefined;
  if (p.tax && inRange(p.tax.dueDate) && !p.plannedEvents.some((e) => e.kind === "tax_payment" && e.dueDate === p.tax!.dueDate)) {
    const untaxedStreams = new Set(p.incomeStreams.filter((s) => !s.taxWithheld).map((s) => s.id));
    const expected = events
      .filter((e) => e.kind === "income" && e.included.base && e.date.base <= p.tax!.periodEnd && untaxedStreams.has(e.sourceId))
      .reduce((sum, e) => sum + e.amount.base, 0);
    taxAmount = -ceilHundred(((p.tax.receivedThisPeriodCents + expected) * p.tax.setAsidePct) / 100);
    events.push({
      id: "est-tax",
      sourceId: "tax",
      kind: "tax",
      label: "Estimated tax payment",
      date: { low: p.tax.dueDate, base: p.tax.dueDate, high: p.tax.dueDate },
      amount: { low: taxAmount, base: taxAmount, high: taxAmount },
      included: { low: true, base: true, high: true },
      essential: false,
    });
  }

  return { events, taxAmount };
}

// ---------------------------------------------------------------------------
// 2. Simulate daily balances for each case.

function simulate(p: Profile, events: CashEvent[], c: Case, start: number, z: number) {
  const days = HORIZON_DAYS;
  const delta = new Array<number>(days + 1).fill(0);
  const reserveDelta = new Array<number>(days + 1).fill(0);
  for (const e of events) {
    if (!e.included[c]) continue;
    const i = daysBetween(p.today, e.date[c]);
    if (i < 1 || i > days) continue;
    delta[i] += e.amount[c];
    if (e.toReserve) reserveDelta[i] -= e.amount[c];
  }
  const daily = p.spending.weeklyMeanCents / 7;
  const bal: number[] = [start];
  const reserveAdd: number[] = [0];
  let running = start;
  let reserveRunning = 0;
  for (let i = 1; i <= days; i++) {
    running += delta[i];
    reserveRunning += reserveDelta[i];
    const spentSoFar = daily * i;
    const wobble = z * p.spending.weeklySdCents * Math.sqrt(i / 7);
    const spend = c === "low" ? spentSoFar + wobble : c === "high" ? Math.max(0, spentSoFar - wobble) : spentSoFar;
    bal.push(Math.round(running - spend));
    reserveAdd.push(reserveRunning);
  }
  return { bal, reserveAdd };
}

// ---------------------------------------------------------------------------
// 3. Explain a dip: what lands before it, and what it is waiting for.

function explain(events: CashEvent[], minDate: string): Reasons {
  const outflows = events
    .filter((e) => e.included.low && e.kind !== "income" && e.kind !== "transfer")
    .filter((e) => e.date.low <= minDate && daysBetween(e.date.low, minDate) <= 20 && e.amount.low <= -40_000)
    .sort((a, b) => a.amount.low - b.amount.low)
    .slice(0, 3)
    .map((e) => ({ label: e.label, date: e.date.low, amount: e.amount.low }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const next = events
    .filter((e) => e.kind === "income" && e.included.high && e.date.high <= addDays(minDate, 21) && e.date.low >= minDate)
    .sort((a, b) => b.amount.base - a.amount.base)[0];

  const waitingFor = next
    ? { label: next.sourceName ?? next.label, earliest: next.date.high, latest: next.date.low, amount: next.amount.base }
    : null;

  const names = outflows.map((o) => `${o.label} (${usd(-o.amount)}, ${fmtDate(o.date)})`);
  const list = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  let sentence: string;
  if (list && waitingFor) {
    const when = waitingFor.earliest === waitingFor.latest ? fmtDate(waitingFor.latest) : fmtRange(waitingFor.earliest, waitingFor.latest).replace(" – ", "–");
    sentence = `${list} ${outflows.length > 1 ? "land" : "lands"} before ${waitingFor.label} (${usd(waitingFor.amount)}) arrives, likely ${when}.`;
  } else if (list) {
    sentence = `${list} ${outflows.length > 1 ? "come" : "comes"} out before your next income.`;
  } else {
    sentence = "Day-to-day spending outpaces income here in the cautious case.";
  }
  return { outflows, waitingFor, sentence };
}

// ---------------------------------------------------------------------------
// 4. Put it together.

export function forecast(p: Profile): Forecast {
  const z = Z[p.rangeConfidence];
  const from = addDays(p.today, 1);
  const to = addDays(p.today, HORIZON_DAYS);
  const { events, taxAmount } = buildEvents(p, from, to);

  const operatingToday = p.accounts.filter((a) => a.tier === "operating").reduce((s, a) => s + a.balanceCents, 0);
  const reserveAccounts = p.accounts.filter((a) => a.tier === "reserve").map((a) => ({ id: a.id, name: `${a.institution} ${a.name}`, balance: a.balanceCents }));
  const reserveToday = reserveAccounts.reduce((s, a) => s + a.balance, 0);

  const sims = {
    low: simulate(p, events, "low", operatingToday, z),
    base: simulate(p, events, "base", operatingToday, z),
    high: simulate(p, events, "high", operatingToday, z),
  };

  // Weekly burn: essential bills + everyday spending, averaged over the horizon.
  const essentialBills = events
    .filter((e) => e.kind === "bill" && e.essential)
    .reduce((s, e) => s - e.amount.base, 0);
  const weeklyBurn = Math.round(essentialBills / HORIZON_WEEKS + p.spending.weeklyMeanCents);
  const cushion = Math.max(50_000, Math.round(weeklyBurn / 100) * 100);

  const weeks: WeekResult[] = [];
  for (let w = 1; w <= HORIZON_WEEKS; w++) {
    const first = (w - 1) * 7 + 1;
    const last = w * 7;
    let lowMin = Infinity, lowIdx = first, baseMin = Infinity, highMin = Infinity;
    for (let i = first; i <= last; i++) {
      if (sims.low.bal[i] < lowMin) { lowMin = sims.low.bal[i]; lowIdx = i; }
      baseMin = Math.min(baseMin, sims.base.bal[i]);
      highMin = Math.min(highMin, sims.high.bal[i]);
    }
    const reserveThen = reserveToday + sims.low.reserveAdd[lowIdx];
    const status: Status =
      lowMin < 0 ? (lowMin + reserveThen < 0 ? "shortfall" : "short") : lowMin < cushion ? "tight" : "ok";
    weeks.push({
      index: w,
      start: addDays(p.today, first),
      end: addDays(p.today, last),
      low: lowMin,
      base: baseMin,
      high: highMin,
      lowMinDate: addDays(p.today, lowIdx),
      status,
    });
  }

  const rank: Record<Status, number> = { ok: 0, tight: 1, short: 2, shortfall: 3 };
  const windows: WindowResult[] = [];
  for (let i = 0; i < HORIZON_WEEKS / 2; i++) {
    const a = weeks[2 * i];
    const b = weeks[2 * i + 1];
    const lowWeek = a.low <= b.low ? a : b;
    const status = rank[a.status] >= rank[b.status] ? a.status : b.status;
    const win: WindowResult = {
      index: i + 1,
      weeks: [a, b],
      start: a.start,
      end: b.end,
      low: Math.min(a.low, b.low),
      base: Math.min(a.base, b.base),
      high: Math.min(a.high, b.high),
      lowMinDate: lowWeek.lowMinDate,
      status,
    };
    windows.push(win);
  }

  // A dip that spans several windows is one problem: explain it once, on the
  // first window, using the deepest point of the whole run.
  for (let i = 0; i < windows.length; i++) {
    const first = windows[i];
    if (first.status === "ok") continue;
    let j = i;
    while (j + 1 < windows.length && windows[j + 1].status !== "ok" && windows[j + 1].status !== "tight" && first.status !== "tight") j++;
    const run = windows.slice(i, j + 1);
    const worst = run.reduce((a, b) => (b.low < a.low ? b : a));
    const status = run.reduce<Status>((s, w) => (rank[w.status] > rank[s] ? w.status : s), "ok");
    const win = first;
    win.reasons = explain(events, worst.lowMinDate);
    for (const later of run.slice(1)) later.continuesFrom = first.index;
    // The fix has to be in place before the run's first dip below zero.
    const firstDip = run.find((w) => w.low < 0) ?? worst;
    {
      if (status === "short" && reserveAccounts.length > 0) {
        const amount = Math.min(ceilHundred(-worst.low + 20_000), reserveToday);
        const by = addDays(firstDip.lowMinDate, -3) > p.today ? addDays(firstDip.lowMinDate, -3) : addDays(p.today, 1);
        // Draw from the largest savings account first, then the next.
        const parts: string[] = [];
        let left = amount;
        for (const r of [...reserveAccounts].sort((x, y) => y.balance - x.balance)) {
          if (left <= 0) break;
          const take = Math.min(left, Math.floor(r.balance / 10_000) * 10_000);
          if (take > 0) { parts.push(`${usd(take)} from ${r.name}`); left -= take; }
        }
        const from = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
        win.fix = {
          kind: "move",
          amount,
          from,
          by,
          sentence: `Move ${from} to checking by ${fmtDate(by)}.`,
          rule: "Rule of thumb: checking should cover the cautious case; savings is the buffer, not the bill-payer.",
        };
      } else if (status === "shortfall") {
        const shortBy = ceilHundred(-(worst.low + reserveToday));
        win.fix = {
          kind: "shortfall",
          amount: shortBy,
          sentence: `Even with all savings moved to checking, you'd be about ${usd(shortBy)} short around ${fmtDate(worst.lowMinDate)} in the cautious case. Push a planned expense, chase an invoice, or line up extra income before then.`,
          rule: "Rule of thumb: fix a real shortfall weeks ahead, while you still have options.",
        };
      } else if (status === "tight") {
        win.fix = {
          kind: "move",
          amount: 0,
          sentence: `Nothing to move yet. Checking stays positive, but with less than a week of spending to spare around ${fmtDate(win.lowMinDate)}.`,
          rule: "Rule of thumb: keep about one week of spending in checking as a cushion.",
        };
      }
    }
    i = j;
  }

  let lowest = { base: Infinity, baseDate: p.today, low: Infinity, lowDate: p.today };
  for (let i = 1; i <= HORIZON_DAYS; i++) {
    if (sims.base.bal[i] < lowest.base) lowest = { ...lowest, base: sims.base.bal[i], baseDate: addDays(p.today, i) };
    if (sims.low.bal[i] < lowest.low) lowest = { ...lowest, low: sims.low.bal[i], lowDate: addDays(p.today, i) };
  }

  const liquid = operatingToday + reserveToday;
  let tax: Forecast["tax"];
  if (p.tax && taxAmount !== undefined) {
    const setAside = p.accounts.find((a) => a.id === p.tax!.reserveAccountId)?.balanceCents ?? 0;
    tax = { amount: -taxAmount, dueDate: p.tax.dueDate, setAside, covered: setAside >= -taxAmount };
  }

  return {
    today: p.today,
    zFor: z,
    operatingToday,
    reserveToday,
    reserveAccounts,
    events,
    weeks,
    windows,
    lowest,
    runway: { weeks: weeklyBurn > 0 ? liquid / weeklyBurn : Infinity, weeklyBurn, liquid, target: p.runwayTargetWeeks },
    tax,
    cushion,
  };
}

/** Base-case events in the next `days` days, soonest first (for the "Coming up" list). */
export function upcoming(f: Forecast, days: number) {
  const until = addDays(f.today, days);
  return f.events
    .filter((e) => e.included.base && e.date.base > f.today && e.date.base <= until)
    .sort((a, b) => (a.date.base < b.date.base ? -1 : a.date.base > b.date.base ? 1 : b.amount.base - a.amount.base));
}

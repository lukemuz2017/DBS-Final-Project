// Planning helpers built on the forecast engine. Pure and deterministic, like
// forecast.ts: same profile in, same answer out. The UI only explains these numbers.
//
// - safePay: how much a freelancer can pay themselves each week or two weeks.
// - windfallSplits: what to do with each upcoming client payment (tax first).
// - retirementPlan: SEP / Solo 401(k) room for the self-employed; 401(k) match for employees.
// - refundPlan: how far a student's loan refund stretches, and how much less to borrow.
//
// 2026 limits (IRS, announced Nov 2025): IRA $7,500; 401(k) employee deferral $24,500;
// SEP and Solo 401(k) total $72,000. Federal grad Direct Unsubsidized 2026-27: 8.07%.

import { addDays, ceilHundred, daysBetween } from "../format";
import type { Profile, RecurringBill } from "../types";
import { forecast, HORIZON_WEEKS, type CashEvent, type Forecast } from "./forecast";

export const LIMITS_2026 = {
  ira: 750_000,
  employee401k: 2_450_000,
  sepOrSoloTotal: 7_200_000,
} as const;

const roundDown = (cents: number, step = 500) => Math.max(0, Math.floor(cents / step) * step);
const round10 = (cents: number) => Math.round(cents / 1000) * 1000;

/** Average monthly cost of a bill, whatever its schedule (negative). */
export function billPerMonth(b: RecurringBill) {
  const n = { monthly: 1, bimonthly: 0.5, weekly: 52 / 12, biweekly: 26 / 12 }[b.cadence];
  return Math.round(b.amountCents * n);
}

// ---------------------------------------------------------------------------
// 1. Pay yourself: the most everyday spending per week that keeps checking +
//    savings above a one-week cushion in the low case, all 12 weeks.

export interface SafePay {
  weeklyCents: number;
  paycheckCents: number; // every two weeks
  currentWeeklyCents: number;
  cushionCents: number;
  /** False when even $0 of everyday spending dips below the cushion. */
  feasible: boolean;
  /** How far below the cushion the cash gets with no everyday spending (when not feasible). */
  gapCents: number;
}

export function safePay(p: Profile): SafePay {
  const cushion = forecast(p).cushion;
  const lowest = (weekly: number) =>
    Math.min(...forecast({ ...p, spending: { ...p.spending, weeklyMeanCents: weekly } }, { scope: "cash" }).weeks.map((w) => w.low));
  const ok = (weekly: number) => lowest(weekly) >= cushion;

  if (!ok(0)) {
    return { weeklyCents: 0, paycheckCents: 0, currentWeeklyCents: p.spending.weeklyMeanCents, cushionCents: cushion, feasible: false, gapCents: ceilHundred(cushion - lowest(0)) };
  }
  // Binary search (to within $1) between $0 and $5,000 a week, then round down to $5.
  let lo = 0;
  let hi = 500_000;
  while (hi - lo > 100) {
    const mid = Math.round((lo + hi) / 2);
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  const weekly = roundDown(lo);
  return { weeklyCents: weekly, paycheckCents: weekly * 2, currentWeeklyCents: p.spending.weeklyMeanCents, cushionCents: cushion, feasible: true, gapCents: 0 };
}

// ---------------------------------------------------------------------------
// 2. Windfall splits: when an untaxed payment lands, where should it go?
//    Order: tax set-aside -> keep what upcoming weeks need -> buffer (if runway is
//    below target) -> retirement -> yours to spend.

export interface SplitLeg {
  kind: "tax" | "keep" | "buffer" | "retirement" | "spend";
  label: string;
  account?: string;
  amountCents: number;
}

export interface WindfallSplit {
  event: CashEvent;
  amountCents: number;
  legs: SplitLeg[];
  note?: string;
}

export function windfallSplits(p: Profile, max = 3): WindfallSplit[] {
  if (!p.tax) return [];
  const f = forecast(p, { scope: "cash" });
  const untaxed = new Set(p.incomeStreams.filter((s) => !s.taxWithheld).map((s) => s.id));
  const acct = (id?: string) => {
    const a = p.accounts.find((x) => x.id === id);
    return a ? `${a.institution} ${a.name}` : undefined;
  };
  const reserves = p.accounts.filter((a) => a.tier === "reserve" && a.id !== p.tax!.reserveAccountId);
  const bufferAccount = reserves.sort((a, b) => b.balanceCents - a.balanceCents)[0];
  const runwayGapCents = Math.max(0, Math.round((f.runway.target - f.runway.weeks) * f.runway.weeklyBurn));
  const ret = p.retirement && (p.retirement.plan === "sep_ira" || p.retirement.plan === "solo_401k") ? p.retirement : undefined;
  let retirementRoom = ret ? retirementPlan(p).roomCents : 0;
  let bufferGap = runwayGapCents;

  const events = f.events
    .filter((e) => e.kind === "income" && e.included.base && untaxed.has(e.sourceId) && e.amount.base >= 50_000)
    .sort((a, b) => (a.date.base < b.date.base ? -1 : 1))
    .slice(0, max);

  return events.map((e) => {
    const amount = e.amount.base;
    const tax = round10((amount * p.tax!.setAsidePct) / 100);
    const free = amount - tax;
    // Three tests, from least to most cautious:
    // - the buffer top-up stays in your cash (savings), so it's always allowed;
    // - retirement leaves your cash, so it must be safe in the expected case;
    // - spending money must be safe even in the low case.
    const after = f.weeks.filter((w) => w.end >= e.date.base);
    const likelyRoom = Math.max(0, Math.min(...after.map((w) => w.base)) - f.cushion);
    const cautiousRoom = Math.max(0, Math.min(...after.map((w) => w.low)) - f.cushion);

    let left = free;
    const buffer = bufferAccount ? Math.min(round10(free * 0.25), bufferGap, left) : 0;
    bufferGap -= buffer;
    left -= buffer;
    const retirement = ret ? Math.min(round10((free * (ret.windfallPct ?? 10)) / 100), retirementRoom, likelyRoom, left) : 0;
    retirementRoom -= retirement;
    left -= retirement;
    const spend = Math.max(0, Math.min(left, cautiousRoom - retirement));
    const keep = left - spend;
    left = spend;

    const legs: SplitLeg[] = [
      { kind: "tax" as const, label: "Tax set-aside", account: acct(p.tax!.reserveAccountId), amountCents: tax },
      { kind: "keep" as const, label: "Keep for upcoming bills", account: acct(p.accounts.find((a) => a.tier === "operating")?.id), amountCents: keep },
      { kind: "buffer" as const, label: "Top up your buffer", account: bufferAccount ? acct(bufferAccount.id) : undefined, amountCents: buffer },
      { kind: "retirement" as const, label: "Retirement", account: ret ? acct(ret.accountId) : undefined, amountCents: retirement },
      { kind: "spend" as const, label: "Yours to spend", amountCents: left },
    ].filter((l) => l.amountCents > 0);

    const note =
      ret && retirement === 0
        ? "Retirement waits this time: even the expected case is tight after this payment."
        : spend === 0 && keep > 0
          ? "Nothing to spend yet: the low case still needs this money for the weeks ahead."
          : undefined;
    return { event: e, amountCents: amount, legs, note };
  });
}

// ---------------------------------------------------------------------------
// 3. Retirement.

export interface RetirementPlan {
  kind: "self_employed" | "employer" | "none";
  // self-employed
  sepLimitCents: number;
  soloLimitCents: number;
  ytdCents: number;
  roomCents: number;
  /** Rough tax saved per $1,000 contributed, using the tax set-aside rate. */
  taxSavedPer1000Cents: number;
  deadline?: string;
  // employer plan
  contributionPct?: number;
  matchUpToPct?: number;
  freeMatchMissedCents?: number; // per year
  raiseToPct?: number;
  costPerPaycheckCents?: number; // after tax, rough
  matchGainedPerYearCents?: number;
}

export function retirementPlan(p: Profile): RetirementPlan {
  const r = p.retirement;
  const none: RetirementPlan = { kind: "none", sepLimitCents: 0, soloLimitCents: 0, ytdCents: 0, roomCents: 0, taxSavedPer1000Cents: 0 };
  if (!r || r.plan === "none") return none;

  if (r.plan === "sep_ira" || r.plan === "solo_401k") {
    const profit = r.estNetProfitCents ?? 0;
    // Self-employed "25% of compensation" works out to about 20% of net profit
    // once self-employment tax is taken off.
    const employerShare = Math.round(profit * 0.2);
    const sep = Math.min(employerShare, LIMITS_2026.sepOrSoloTotal);
    const solo = Math.min(Math.min(LIMITS_2026.employee401k, profit) + employerShare, LIMITS_2026.sepOrSoloTotal);
    const limit = r.plan === "sep_ira" ? sep : solo;
    return {
      kind: "self_employed",
      sepLimitCents: sep,
      soloLimitCents: solo,
      ytdCents: r.ytdContributedCents,
      roomCents: Math.max(0, limit - r.ytdContributedCents),
      taxSavedPer1000Cents: Math.round((100_000 * (p.tax?.setAsidePct ?? 25)) / 100),
      deadline: "2027-04-15",
    };
  }

  // Employer plan: get the full match first.
  const salary = r.salaryCents ?? 0;
  const c = r.contributionPct ?? 0;
  const upTo = r.matchUpToPct ?? 0;
  const rate = (r.matchRatePct ?? 0) / 100;
  const missedPct = Math.max(0, upTo - c);
  const freeMatchMissed = Math.round(salary * (missedPct / 100) * rate);
  // Pre-tax contributions cost less than they look: assume ~30% combined marginal tax.
  const costPerPaycheck = Math.round(((salary * (missedPct / 100)) / 26) * 0.7);
  return {
    ...none,
    kind: "employer",
    ytdCents: r.ytdContributedCents,
    contributionPct: c,
    matchUpToPct: upTo,
    freeMatchMissedCents: freeMatchMissed,
    raiseToPct: missedPct > 0 ? upTo : undefined,
    costPerPaycheckCents: missedPct > 0 ? costPerPaycheck : 0,
    matchGainedPerYearCents: freeMatchMissed,
  };
}

// ---------------------------------------------------------------------------
// 4. Student refund plan: does the next refund last until the one after, and
//    will borrowed money sit idle (costing interest) when it arrives?

export interface RefundPlan {
  refundCents: number;
  refundDate: string;
  nextRefundDate: string;
  weeks: number;
  /** Checking balance just before the refund (negative = savings covered the gap). */
  checkingBeforeCents: number;
  billsCents: number; // recurring bills between the two refunds
  spendingCents: number; // everyday spending between the two refunds
  plannedCents: number; // one-off plans between the two refunds (negative)
  otherIncomeCents: number;
  /** Per week, from this refund alone, after bills and plans. */
  allowanceWeeklyCents: number;
  /** Checking + savings expected at the next refund. */
  cashAtNextRefundCents: number;
  cushionCents: number;
  /** Loan money likely to sit idle at the next refund (0 if none). */
  idleCents: number;
  borrowLessCents: number;
  interestSavedPerYearCents: number;
  federalReturnableCents: number;
  returnByDate: string;
}

export function refundPlan(p: Profile, f: Forecast = forecast(p)): RefundPlan | null {
  const sl = p.studentLoans;
  const refundStream = p.incomeStreams.find((s) => s.kind === "loan_refund");
  const next = refundStream?.payments.filter((x) => x.expectedDate > p.today).sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1))[0];
  if (!sl || !next) return null;

  const d = next.expectedDate;
  const d2 = sl.followingRefundDate;
  const weeks = Math.max(1, daysBetween(d, d2) / 7);
  const week = f.weeks.find((w) => w.start <= d && d <= w.end);
  const checkingBefore = week ? week.base : f.startBalance;

  const billsPerWeek = -p.recurringBills.filter((b) => !b.toAccountId).reduce((s, b) => s + billPerMonth(b), 0) * (12 / 52);
  const bills = Math.round(billsPerWeek * weeks);
  const spending = Math.round(p.spending.weeklyMeanCents * weeks);
  const planned = p.plannedEvents.filter((e) => e.dueDate >= d && e.dueDate < d2 && e.amountCents < 0).reduce((s, e) => s + e.amountCents, 0);
  const otherIncome = p.incomeStreams
    .filter((s) => s.kind !== "loan_refund")
    .flatMap((s) => s.payments.map((x) => ({ x, conf: x.confidence ?? s.confidence })))
    .filter(({ x, conf }) => conf !== "uncertain" && x.expectedDate >= d && x.expectedDate < d2)
    .reduce((s, { x }) => s + x.amountCents, 0);

  const refund = next.amountCents;
  const allowance = Math.max(0, Math.floor((refund + Math.min(0, checkingBefore) - bills + planned + otherIncome) / weeks));
  const cashAtNext = f.reserveToday + checkingBefore + refund - bills - spending + planned + otherIncome;
  const cushion = Math.round((billsPerWeek + p.spending.weeklyMeanCents) * 4); // about a month of costs
  const idle = Math.max(0, cashAtNext - cushion);
  const borrowLess = idle >= 50_000 ? Math.floor(idle / 10_000) * 10_000 : 0;

  return {
    refundCents: refund,
    refundDate: d,
    nextRefundDate: d2,
    weeks: Math.round(weeks * 10) / 10,
    checkingBeforeCents: checkingBefore,
    billsCents: bills,
    spendingCents: spending,
    plannedCents: planned,
    otherIncomeCents: otherIncome,
    allowanceWeeklyCents: roundDown(allowance),
    cashAtNextRefundCents: cashAtNext,
    cushionCents: cushion,
    idleCents: idle,
    borrowLessCents: borrowLess,
    interestSavedPerYearCents: Math.round((borrowLess * sl.privateRatePct) / 100),
    federalReturnableCents: Math.min(borrowLess, sl.federalPerTermCents),
    returnByDate: addDays(sl.nextDisbursementDate, 120),
  };
}

export { HORIZON_WEEKS };

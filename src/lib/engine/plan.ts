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

import { addDays, ceilHundred, daysBetween, fmtDate } from "../format";
import type { Goal, Profile, RecurringBill } from "../types";
import { coverOrder, forecast, HORIZON_WEEKS, type CashEvent, type Forecast } from "./forecast";
import { goalPace } from "./goals";

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
// 1. Pay yourself: the most everyday spending per week that keeps CHECKING above a
//    one-week cushion in the low case, assuming the Payday Plan is followed. Like the
//    plan, it looks as far as the last client payment it splits (at least four weeks):
//    savings is for dips and goals, not for paying yourself.

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
  const plan = paydayPlan(p);
  const lowest = (weekly: number) =>
    Math.min(
      ...forecast({ ...p, spending: { ...p.spending, weeklyMeanCents: weekly } }, { extra: plan.events })
        .weeks.filter((w) => w.start <= plan.lookahead)
        .map((w) => w.low),
    );
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
// 2. Payday Plan: when an untaxed payment lands, where should it go?
//    Order: tax set-aside -> buffer (if runway is below target) -> retirement ->
//    goals -> yours to spend -> keep in checking.
//
//    Each step is tested against CHECKING (the account the money leaves). Saving steps
//    are planned payment by payment in date order, after earlier payments' moves; then
//    spending is planned for every payment, after all the saving:
//    - buffer and goals move money to savings, so they only use money checking
//      doesn't need in the low case (otherwise a suggestion would move it back);
//    - retirement leaves your cash for good, so checking must stay above the
//      cushion in the expected case;
//    - spending money must be safe in the low case.
//    The dashboard's forecast then assumes the plan is followed (forecastWithPlan).

export interface SplitLeg {
  kind: "tax" | "keep" | "buffer" | "retirement" | "goals" | "spend";
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

export interface PaydayPlan {
  splits: WindfallSplit[];
  /** How far the plan looks in the low case: the last payment it splits, at least four weeks out. */
  lookahead: string;
  /** The plan's moves after tax (buffer, retirement, goals), as forecast events. */
  events: CashEvent[];
}

const floor10 = (cents: number) => Math.max(0, Math.floor(cents / 1000) * 1000);
const planCache = new WeakMap<Profile, PaydayPlan>();

/** The Payday Plan for every untaxed payment of $500 or more in the next 12 weeks. */
export function paydayPlan(p: Profile): PaydayPlan {
  let plan = planCache.get(p);
  if (!plan) {
    plan = buildPaydayPlan(p);
    planCache.set(p, plan);
  }
  return plan;
}

export function windfallSplits(p: Profile, max = 5): WindfallSplit[] {
  return paydayPlan(p).splits.slice(0, max);
}

/** The forecast, assuming you follow the Payday Plan. Use this for anything the dashboard shows. */
export function forecastWithPlan(p: Profile, opts: { scope?: "checking" | "cash" } = {}): Forecast {
  return forecast(p, { ...opts, extra: paydayPlan(p).events });
}

function accountName(p: Profile, id?: string) {
  const a = p.accounts.find((x) => x.id === id);
  return a ? `${a.institution} ${a.name}` : undefined;
}

/** Goals that save into an account of their own get that account's balance as "saved". */
function linkedSaved(p: Profile, g: Goal): number {
  if (!g.accountId || p.goals.filter((x) => x.accountId === g.accountId).length > 1) return g.savedCents;
  return p.accounts.find((a) => a.id === g.accountId)?.balanceCents ?? g.savedCents;
}

function buildPaydayPlan(p: Profile): PaydayPlan {
  if (!p.tax) return { splits: [], events: [], lookahead: addDays(p.today, HORIZON_WEEKS * 7) };
  const base = forecast(p); // checking, with tax set-asides
  const untaxed = new Set(p.incomeStreams.filter((s) => !s.taxWithheld).map((s) => s.id));
  const cover = coverOrder(p);
  const bufferAccount = cover.find((a) => a.purpose === "emergency") ?? cover.find((a) => a.purpose !== "goals");
  let bufferGap = Math.max(0, Math.round((base.runway.target - base.runway.weeks) * base.runway.weeklyBurn));
  const ret = p.retirement && (p.retirement.plan === "sep_ira" || p.retirement.plan === "solo_401k") ? p.retirement : undefined;
  let retirementRoom = ret ? retirementPlan(p).roomCents : 0;

  // Goals with their own savings account (the emergency fund is the buffer step's job):
  // each month, up to the pace that reaches the goal by its date.
  const goals = p.goals.filter((g) => g.kind !== "emergency_fund" && g.accountId && g.targetCents > linkedSaved(p, g));
  const goalMonthly = goals.reduce((s, g) => s + goalPace({ ...g, savedCents: linkedSaved(p, g) }, p.today).neededMonthlyCents, 0);
  let goalRoom = goals.reduce((s, g) => s + g.targetCents - linkedSaved(p, g), 0);
  const goalAccounts = [...new Set(goals.map((g) => g.accountId!))];
  const goalsAccountId = goalAccounts.length === 1 ? goalAccounts[0] : undefined;
  const goalsByMonth = new Map<string, number>();

  const incomes = base.events
    .filter((e) => e.kind === "income" && e.included.base && untaxed.has(e.sourceId) && e.amount.base >= 50_000)
    .sort((a, b) => (a.date.base < b.date.base ? -1 : 1));

  // Past the last big payment Runway knows about, the forecast only has money going
  // out, so judging room there would block savings for anyone with irregular income.
  // Look only as far as the last payment this plan splits (per case), at least four weeks.
  const lastLow = incomes.filter((e) => e.included.low).reduce((d, e) => (e.date.low > d ? e.date.low : d), p.today);
  const lastBase = incomes.reduce((d, e) => (e.date.base > d ? e.date.base : d), p.today);

  const moves: CashEvent[] = []; // what the forecast assumes
  const goalLabel = goals.length === 1 ? goals[0].name : "Goals";
  const move = (e: CashEvent, kind: string, label: string, cents: number, toAccountId: string | undefined, toReserve: boolean): CashEvent => ({
    id: `plan-${kind}-${e.id}`,
    sourceId: "payday",
    kind: "transfer",
    label,
    date: { ...e.date },
    amount: { low: -cents, base: -cents, high: -cents },
    included: { ...e.included },
    toReserve,
    toAccountId,
    fromPlan: true,
  });

  // Room in checking after a payment lands, given the moves planned so far. Each case is
  // judged from the day the payment lands in that case to the last payment the plan
  // splits, and always at least four weeks (a month of bills).
  const room = (e: CashEvent, extra: CashEvent[]) => {
    const f = extra.length ? forecast(p, { extra }) : base;
    const between = (from: string, last: string) => {
      const until = last > addDays(from, 28) ? last : addDays(from, 28);
      const ws = f.weeks.filter((w) => w.end >= from && w.start <= until);
      return ws.length ? ws : f.weeks.filter((w) => w.end >= from).slice(0, 1);
    };
    const lowWeeks = e.included.low ? between(e.date.low, lastLow) : [];
    const lowWeek = lowWeeks.length ? lowWeeks.reduce((a, b) => (b.low < a.low ? b : a)) : f.weeks[f.weeks.length - 1];
    return {
      // Not in the low case at all (lands too late): nothing is safe to move.
      low: lowWeeks.length ? Math.max(0, lowWeek.low - f.cushion) : 0,
      lowDate: lowWeek.lowMinDate,
      base: Math.max(0, Math.min(...between(e.date.base, lastBase).map((w) => w.base)) - f.cushion),
    };
  };

  // Pass 1, payment by payment: tax, buffer, retirement, goals.
  const steps = incomes.map((e) => {
    const r = room(e, moves);
    const amount = e.amount.base;
    const tax = round10((amount * p.tax!.setAsidePct) / 100);
    let left = amount - tax;
    const free = left;

    const buffer = bufferAccount ? floor10(Math.min(round10(free * 0.25), bufferGap, left, r.low)) : 0;
    bufferGap -= buffer;
    left -= buffer;
    const retirement = ret ? floor10(Math.min(round10((free * (ret.windfallPct ?? 10)) / 100), retirementRoom, r.base - buffer, left)) : 0;
    retirementRoom -= retirement;
    left -= retirement;
    const month = e.date.base.slice(0, 7);
    const monthLeft = Math.max(0, goalMonthly - (goalsByMonth.get(month) ?? 0));
    const toGoals = goals.length ? floor10(Math.min(round10(monthLeft), goalRoom, r.low - buffer - retirement, left)) : 0;
    goalsByMonth.set(month, (goalsByMonth.get(month) ?? 0) + toGoals);
    goalRoom -= toGoals;
    left -= toGoals;

    moves.push(
      ...[
        buffer > 0 && move(e, "buffer", `Buffer top-up → ${accountName(p, bufferAccount?.id)}`, buffer, bufferAccount?.id, true),
        retirement > 0 && move(e, "retirement", `Retirement → ${accountName(p, ret?.accountId) ?? "retirement"}`, retirement, ret?.accountId, false),
        toGoals > 0 && move(e, "goals", `${goalLabel} → ${accountName(p, goalsAccountId) ?? "goal savings"}`, toGoals, goalsAccountId, true),
      ].filter((x): x is CashEvent => Boolean(x)),
    );
    return { e, amount, tax, buffer, retirement, toGoals, left, lowDate: r.lowDate };
  });

  // Pass 2, after every saving step is planned: spending comes last, and must be safe in
  // the low case. Planned spending counts against later payments' room.
  const spent: CashEvent[] = [];
  const splits = steps.map((s) => {
    const r = room(s.e, [...moves, ...spent]);
    const spend = floor10(Math.min(s.left, r.low));
    if (spend > 0) spent.push({ ...move(s.e, "spend", "Spending from this payment", spend, undefined, false), fromPlan: false });
    const keep = s.left - spend;

    const legs: SplitLeg[] = [
      { kind: "tax" as const, label: "Tax set-aside", account: accountName(p, p.tax!.reserveAccountId), amountCents: s.tax },
      { kind: "keep" as const, label: "Keep for upcoming bills", account: accountName(p, p.accounts.find((a) => a.tier === "operating")?.id), amountCents: keep },
      { kind: "buffer" as const, label: "Top up your buffer", account: accountName(p, bufferAccount?.id), amountCents: s.buffer },
      { kind: "retirement" as const, label: "Retirement", account: accountName(p, ret?.accountId), amountCents: s.retirement },
      { kind: "goals" as const, label: goalLabel, account: accountName(p, goalsAccountId), amountCents: s.toGoals },
      { kind: "spend" as const, label: "Yours to spend", amountCents: spend },
    ].filter((l) => l.amountCents > 0);

    const wanted = Boolean(bufferAccount) || goals.length > 0;
    const note =
      wanted && s.buffer === 0 && s.toGoals === 0 && keep > 0
        ? `Savings and goals wait: checking needs this money around ${fmtDate(s.lowDate)} in the low case.`
        : ret && s.retirement === 0
          ? "Retirement waits this time: even the expected case is tight after this payment."
          : spend === 0 && keep > 0
            ? "Nothing extra to spend yet: the low case still needs the rest for the weeks ahead."
            : undefined;
    return { event: s.e, amountCents: s.amount, legs, note };
  });

  return { splits, events: moves, lookahead: lastLow > addDays(p.today, 28) ? lastLow : addDays(p.today, 28) };
}

// ---------------------------------------------------------------------------
// 2b. Goal funding: where each goal's money actually comes from.

export interface GoalFunding {
  savedCents: number;
  monthlyCents: number;
  /** payday = Payday Plan moves, transfer = a recurring transfer, you = the amount you entered. */
  source: "payday" | "transfer" | "you" | "none";
}

export function goalFunding(p: Profile): Map<string, GoalFunding> {
  const moves = paydayPlan(p).events;
  const months = (HORIZON_WEEKS * 7) / 30.44;
  const out = new Map<string, GoalFunding>();
  for (const g of p.goals) {
    if (!g.accountId) {
      out.set(g.id, { savedCents: g.savedCents, monthlyCents: g.monthlyContributionCents, source: g.monthlyContributionCents > 0 ? "you" : "none" });
      continue;
    }
    const fromTransfers = p.recurringBills.filter((b) => b.toAccountId === g.accountId).reduce((s, b) => s - billPerMonth(b), 0);
    const fromPlan = Math.round(moves.filter((e) => e.toAccountId === g.accountId).reduce((s, e) => s - e.amount.base, 0) / months);
    // An account that backs several goals splits its inflow evenly between them.
    const share = p.goals.filter((x) => x.accountId === g.accountId).length;
    const monthly = Math.round((fromTransfers + fromPlan) / share);
    out.set(g.id, {
      savedCents: linkedSaved(p, g),
      monthlyCents: monthly,
      source: monthly === 0 ? "none" : fromPlan >= fromTransfers ? "payday" : "transfer",
    });
  }
  return out;
}

/** Goals with saved and monthly amounts from the money that actually feeds them. */
export function fundedGoals(p: Profile): Goal[] {
  const f = goalFunding(p);
  return p.goals.map((g) => ({ ...g, savedCents: f.get(g.id)!.savedCents, monthlyContributionCents: f.get(g.id)!.monthlyCents }));
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
// 3b. Retirement outlook: where today's saving rate leads, plus this year's
//     contributions by quarter against a 15%-of-income pace, and what would keep pace.
//
// Rules of thumb (explained in the card's hover info), all in today's dollars:
// - Save 15% of pre-tax income, employer match included.
// - In retirement you'll want about 80% of today's pre-tax income each year.
// - Social Security covers about 40% of today's income, starting at 67.
// - Savings can pay out about 4% a year, so you need 25x the yearly gap.
// - Retiring before 67 means savings also cover the Social Security share until 67.
// - Returns after inflation: 3% low, 5% expected, 7% high.

export const OUTLOOK_RULES = {
  savePct: 15,
  replacePct: 80,
  socialSecurityPct: 40,
  socialSecurityAge: 67,
  withdrawPct: 4,
  returnPct: { low: 3, base: 5, high: 7 },
  earliestAge: 50,
  lastAge: 75,
} as const;

export interface RetirementQuarter {
  label: string; // "Q3"
  start: string;
  end: string;
  youCents: number;
  employerCents: number;
  /** False for the quarter still in progress. */
  complete: boolean;
}

/** What would bring contributions up to the 15% pace. */
export type KeepPace =
  | {
      kind: "self_employed";
      currentSharePct: number; // of each after-tax payment, today
      sharePct: number; // of each after-tax payment, to reach 15% of pre-tax income
      /** More you could still put in for this tax year to reach 15% of the year's income. */
      catchUpCents: number;
      deadline: string;
      taxSavedPer1000Cents: number;
      planLimitCents: number;
      /** Solo 401(k) limit, when it's higher than the SEP's at this income. */
      soloLimitCents?: number;
    }
  | {
      kind: "employer";
      currentPct: number;
      /** Raise to this to get the full match (absent when you already do). */
      matchPct?: number;
      matchGainedPerYearCents: number;
      costPerPaycheckCents: number;
      /** Your contribution that, with the match, reaches 15% of pay. */
      pacePct: number;
    };

export interface OutlookPoint {
  age: number;
  /** Projected balance if you keep saving at today's rate until this age. */
  low: number;
  base: number;
  high: number;
  /** What you'd need saved to retire at this age. */
  needCents: number;
}

export interface RetirementOutlook {
  quarters: RetirementQuarter[]; // this year, from the first quarter with a contribution to the current one
  /** Average of the complete quarters above (0 if none yet). */
  avgQuarterCents: number;
  /** 15% of a quarter's income. */
  paceQuarterCents: number;
  keepPace: KeepPace;
  annualIncomeCents: number;
  annualContributionCents: number;
  balanceCents: number;
  age: number;
  retirementAge: number;
  path: OutlookPoint[]; // one per year of age, today's age to lastAge
  atRetirement: OutlookPoint;
  /** Expected case: projected balance as a share of what you'd need, at retirement age. */
  readinessPct: number;
  /** First age (from earliestAge) where the expected case reaches the need; null if not by lastAge. */
  readyAge: number | null;
  /** The same outlook if you saved the rule's 15% of income instead (null when you already do). */
  atRule: { annualContributionCents: number; readinessPct: number; readyAge: number | null } | null;
}

function projectPath(balance: number, yearly: number, income: number, age: number): OutlookPoint[] {
  const R = OUTLOOK_RULES;
  const path: OutlookPoint[] = [];
  let low = balance;
  let base = balance;
  let high = balance;
  for (let a = age; a <= Math.max(age, R.lastAge); a++) {
    path.push({ age: a, low, base, high, needCents: retirementNeed(income, a) });
    // Grow a year, then add a year of contributions.
    low = Math.round((low * (100 + R.returnPct.low)) / 100) + yearly;
    base = Math.round((base * (100 + R.returnPct.base)) / 100) + yearly;
    high = Math.round((high * (100 + R.returnPct.high)) / 100) + yearly;
  }
  return path;
}

function readiness(path: OutlookPoint[], retirementAge: number) {
  const at = path.find((pt) => pt.age === retirementAge)!;
  const ready = path.find((pt) => pt.age >= OUTLOOK_RULES.earliestAge && pt.base >= pt.needCents);
  return { at, readinessPct: at.needCents > 0 ? Math.round((at.base * 100) / at.needCents) : 100, readyAge: ready ? ready.age : null };
}

/** What you'd need saved to retire at `age`, given yearly pre-tax income. */
export function retirementNeed(incomeCents: number, age: number): number {
  const R = OUTLOOK_RULES;
  const target = (incomeCents * R.replacePct) / 100;
  const ss = Math.min(target, (incomeCents * R.socialSecurityPct) / 100);
  const gapYears = Math.max(0, R.socialSecurityAge - age);
  return Math.round((target - ss) * (100 / R.withdrawPct) + ss * gapYears);
}

export function retirementOutlook(p: Profile): RetirementOutlook | null {
  const r = p.retirement;
  if (!r || r.plan === "none" || !p.birthYear) return null;
  const R = OUTLOOK_RULES;
  const selfEmployed = r.plan === "sep_ira" || r.plan === "solo_401k";

  const income = selfEmployed ? (r.estNetProfitCents ?? 0) : (r.salaryCents ?? 0);
  let yearly: number;
  if (selfEmployed) {
    // The Payday Plan's share of each after-tax payment, over a year.
    const afterTax = (income * (100 - (p.tax?.setAsidePct ?? 25))) / 100;
    yearly = Math.round((afterTax * (r.windfallPct ?? 10)) / 100);
  } else {
    const c = r.contributionPct ?? 0;
    const match = (Math.min(c, r.matchUpToPct ?? 0) * (r.matchRatePct ?? 0)) / 100;
    yearly = Math.round((income * (c + match)) / 100);
  }

  // This year's quarters, up to the current one.
  const contributions = r.contributions ?? [];
  const year = p.today.slice(0, 4);
  const currentQ = Math.floor((Number(p.today.slice(5, 7)) - 1) / 3);
  let quarters: RetirementQuarter[] = Array.from({ length: currentQ + 1 }, (_, q) => {
    const start = `${year}-${String(q * 3 + 1).padStart(2, "0")}-01`;
    const end = addDays(q === 3 ? `${Number(year) + 1}-01-01` : `${year}-${String(q * 3 + 4).padStart(2, "0")}-01`, -1);
    const inQ = contributions.filter((c) => c.date >= start && c.date <= end);
    const sum = (src: "you" | "employer") => inQ.filter((c) => c.source === src).reduce((s, c) => s + c.amountCents, 0);
    return { label: `Q${q + 1}`, start, end, youCents: sum("you"), employerCents: sum("employer"), complete: end < p.today };
  });
  const first = quarters.findIndex((q) => q.youCents + q.employerCents > 0);
  quarters = quarters.slice(first === -1 ? currentQ : first);
  const done = quarters.filter((q) => q.complete);
  const avgQuarter = done.length ? Math.round(done.reduce((s, q) => s + q.youCents + q.employerCents, 0) / done.length) : 0;
  const paceQuarter = Math.round((income * R.savePct) / 100 / 4);

  // What would keep pace.
  const plan = retirementPlan(p);
  let keepPace: KeepPace;
  if (selfEmployed) {
    const setAside = p.tax?.setAsidePct ?? 25;
    keepPace = {
      kind: "self_employed",
      currentSharePct: r.windfallPct ?? 10,
      sharePct: Math.ceil((R.savePct * 100) / (100 - setAside)),
      catchUpCents: Math.max(0, Math.min(plan.roomCents, Math.round((income * R.savePct) / 100) - r.ytdContributedCents)),
      deadline: plan.deadline!,
      taxSavedPer1000Cents: plan.taxSavedPer1000Cents,
      planLimitCents: r.plan === "sep_ira" ? plan.sepLimitCents : plan.soloLimitCents,
      soloLimitCents: r.plan === "sep_ira" && plan.soloLimitCents > plan.sepLimitCents ? plan.soloLimitCents : undefined,
    };
  } else {
    const upTo = r.matchUpToPct ?? 0;
    const rate = (r.matchRatePct ?? 0) / 100;
    keepPace = {
      kind: "employer",
      currentPct: r.contributionPct ?? 0,
      matchPct: plan.raiseToPct,
      matchGainedPerYearCents: plan.matchGainedPerYearCents ?? 0,
      costPerPaycheckCents: plan.costPerPaycheckCents ?? 0,
      // You + match = 15%: past the match cap, each extra 1% counts once.
      pacePct: upTo * (1 + rate) >= R.savePct ? Math.ceil(R.savePct / (1 + rate)) : Math.ceil(R.savePct - upTo * rate),
    };
  }

  // Long-term path, and the same path at the rule's 15%.
  const balance = p.accounts.find((a) => a.id === r.accountId)?.balanceCents ?? 0;
  const age = Number(p.today.slice(0, 4)) - p.birthYear;
  const retirementAge = Math.min(R.lastAge, Math.max(age, r.retirementAge ?? R.socialSecurityAge));
  const path = projectPath(balance, yearly, income, age);
  const now = readiness(path, retirementAge);
  const ruleYearly = Math.round((income * R.savePct) / 100);
  const rule = ruleYearly > yearly ? readiness(projectPath(balance, ruleYearly, income, age), retirementAge) : null;

  return {
    quarters,
    avgQuarterCents: avgQuarter,
    paceQuarterCents: paceQuarter,
    keepPace,
    annualIncomeCents: income,
    annualContributionCents: yearly,
    balanceCents: balance,
    age,
    retirementAge,
    path,
    atRetirement: now.at,
    readinessPct: now.readinessPct,
    readyAge: now.readyAge,
    atRule: rule ? { annualContributionCents: ruleYearly, readinessPct: rule.readinessPct, readyAge: rule.readyAge } : null,
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

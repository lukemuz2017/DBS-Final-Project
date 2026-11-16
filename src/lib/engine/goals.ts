// Goal pacing: will you reach each goal by its date at your current monthly
// pace, and if not, when would you? Pure and deterministic, like the forecast.

import { toDate, toISO } from "../format";
import type { Goal } from "../types";

export type GoalStatus = "reached" | "on_track" | "late" | "not_started";

export interface GoalPace {
  goal: Goal;
  status: GoalStatus;
  remainingCents: number;
  monthsLeft: number; // whole months from today to the target date
  /** Month you'd reach it at the current pace ("YYYY-MM-01"), or null if never (no monthly amount). */
  reachDate: string | null;
  /** Months late (positive) or early (negative) versus the target; null if never. */
  monthsLate: number | null;
  /** Monthly amount needed to hit the target date exactly. */
  neededMonthlyCents: number;
  /** Projected amount saved by the target date at the current pace. */
  projectedAtTargetCents: number;
}

export function monthsBetween(a: string, b: string): number {
  const da = toDate(a);
  const db = toDate(b);
  return Math.max(0, (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + db.getUTCMonth() - da.getUTCMonth());
}

function addMonths(date: string, n: number): string {
  const d = toDate(date);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

export function goalPace(g: Goal, today: string): GoalPace {
  const remaining = Math.max(0, g.targetCents - g.savedCents);
  const monthsLeft = monthsBetween(today, g.targetDate);
  const projectedAtTarget = g.savedCents + g.monthlyContributionCents * monthsLeft;
  const needed = remaining === 0 ? 0 : monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;

  if (remaining === 0) {
    return { goal: g, status: "reached", remainingCents: 0, monthsLeft, reachDate: addMonths(today, 0), monthsLate: 0, neededMonthlyCents: 0, projectedAtTargetCents: projectedAtTarget };
  }
  if (g.monthlyContributionCents <= 0) {
    return { goal: g, status: "not_started", remainingCents: remaining, monthsLeft, reachDate: null, monthsLate: null, neededMonthlyCents: needed, projectedAtTargetCents: projectedAtTarget };
  }
  const monthsToReach = Math.ceil(remaining / g.monthlyContributionCents);
  return {
    goal: g,
    status: monthsToReach <= monthsLeft ? "on_track" : "late",
    remainingCents: remaining,
    monthsLeft,
    reachDate: addMonths(today, monthsToReach),
    monthsLate: monthsToReach - monthsLeft,
    neededMonthlyCents: needed,
    projectedAtTargetCents: projectedAtTarget,
  };
}

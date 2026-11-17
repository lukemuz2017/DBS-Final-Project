// Account gaps: account *types* a user is missing for their situation (a separate
// tax savings account, an emergency fund, a retirement account). Suggestions name
// account types only, never banks or investments. Pure and deterministic.

import { usd } from "../format";
import type { Profile } from "../types";
import { forecast } from "./forecast";
import { retirementPlan } from "./plan";
import { rulesOf } from "./rules";

export interface AccountGap {
  /** Stable id, stored in rules.dismissedGaps when the user says "I have one" or "Not now". */
  id: "tax-savings" | "emergency-savings" | "retirement-self" | "employer-match" | "emergency-goal";
  title: string;
  /** One sentence: why it matters for this person. */
  why: string;
  /** Glossary term for the hover explanation, if any. */
  term?: "retirementSelf" | "soloVsSep" | "retirementEmployer";
}

export function accountGaps(p: Profile): AccountGap[] {
  const dismissed = new Set(rulesOf(p).dismissedGaps);
  const freelance = p.profileType === "freelance";
  const savings = p.accounts.filter((a) => a.tier === "reserve");
  const taxAccount = p.tax?.reserveAccountId ? p.accounts.find((a) => a.id === p.tax!.reserveAccountId) : undefined;
  const nonTaxSavings = savings.filter((a) => a.id !== taxAccount?.id);
  const hasRetirementAccount = p.accounts.some((a) => a.tier === "long_term") || Boolean(p.retirement && p.retirement.plan !== "none");
  const gaps: AccountGap[] = [];

  // Most urgent first: untaxed income with nowhere to park the tax.
  if (freelance && !taxAccount) {
    gaps.push({
      id: "tax-savings",
      title: "Open a separate savings account for taxes",
      why: `No one withholds tax from client payments. Moving ${p.tax?.setAsidePct ?? 30}% of each one into its own account keeps it from being spent before the quarterly due date.`,
    });
  }
  if (nonTaxSavings.length === 0) {
    gaps.push({
      id: "emergency-savings",
      title: "Open a savings account for an emergency fund",
      why: "Right now everything sits in checking. A separate account is the buffer that covers a slow month without touching bill money.",
    });
  }
  if (freelance && !hasRetirementAccount) {
    gaps.push({
      id: "retirement-self",
      title: "Open a retirement account for the self-employed",
      why: "Without an employer plan, a SEP IRA or Solo 401(k) lets you save for retirement and lower this year's taxes. Contributions can go in after good months.",
      term: "retirementSelf",
    });
  }
  const plan = retirementPlan(p);
  if (plan.kind === "employer" && plan.raiseToPct) {
    gaps.push({
      id: "employer-match",
      title: `Raise your 401(k) contribution to ${plan.raiseToPct}%`,
      why: `You're missing about ${usd(plan.freeMatchMissedCents ?? 0)} a year of employer match.`,
      term: "retirementEmployer",
    });
  }
  if (!p.goals.some((g) => g.kind === "emergency_fund")) {
    const f = forecast(p);
    const target = Math.ceil((f.runway.weeklyBurn * p.runwayTargetWeeks) / 10_000) * 10_000;
    gaps.push({
      id: "emergency-goal",
      title: "Set an emergency fund goal",
      why: `${p.runwayTargetWeeks} weeks of essentials is about ${usd(target)}. A goal lets the Payday Plan fill it from good months.`,
    });
  }
  return gaps.filter((g) => !dismissed.has(g.id));
}

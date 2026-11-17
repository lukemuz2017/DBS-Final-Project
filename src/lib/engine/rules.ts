// Money rules: the user's cash-flow policy (how hard to save, how big a cushion,
// how predictable their income is) turned into the concrete numbers the Payday
// Plan and Pay yourself use. Pure and deterministic. Planning settings, not
// financial advice: nothing here picks investments.

import type { MoneyRules, Profile, SavingsStyle } from "../types";

export const DEFAULT_RULES: MoneyRules = {
  savingsStyle: "balanced",
  predictability: "lumpy",
  clientsPay: "on_time",
  cushionWeeks: 1,
  minWeeklySpendCents: 0,
  dismissedGaps: [],
};

/** What each savings style does to a client payment, after tax. */
export const STYLES: Record<SavingsStyle, { label: string; bufferPct: number; retirementPct: number; goalPace: number }> = {
  safe: { label: "Play it safe", bufferPct: 35, retirementPct: 5, goalPace: 1 },
  balanced: { label: "Balanced", bufferPct: 25, retirementPct: 10, goalPace: 1 },
  push: { label: "Push hard", bufferPct: 15, retirementPct: 20, goalPace: 1.5 },
};

/** Push hard needs this much Cash Runway, and no dip below $0 in the low case. */
export const PUSH_MIN_RUNWAY_WEEKS = 4;

export function rulesOf(p: Profile): MoneyRules {
  return { ...DEFAULT_RULES, ...p.rules };
}

export interface ResolvedRules {
  style: SavingsStyle;
  /** The style actually applied: Push hard falls back to Balanced when cash is tight. */
  applied: SavingsStyle;
  pushPaused: boolean;
  /** When paused: the low-case low point that caused it (date), if any. */
  pausedBy?: { reason: "runway" | "dip" | "necessities"; date?: string };
  bufferPct: number;
  retirementPct: number;
  goalPace: number;
  cushionWeeks: number;
  /** Pay yourself plans on the expected case only for very steady income. */
  payBasis: "low" | "base";
  minWeeklySpendCents: number;
}

/**
 * Resolve the rules for a profile. `cash` is today's position from the forecast
 * (before the plan's own moves): Cash Runway in weeks and the lowest low-case
 * checking balance in the 12 weeks.
 */
export function resolveRules(p: Profile, cash?: { runwayWeeks: number; lowestLow: number; lowestLowDate: string }): ResolvedRules {
  const r = rulesOf(p);
  let applied = r.savingsStyle;
  let pausedBy: ResolvedRules["pausedBy"];
  if (r.savingsStyle === "push" && cash) {
    if (cash.runwayWeeks < PUSH_MIN_RUNWAY_WEEKS) pausedBy = { reason: "runway" };
    else if (cash.lowestLow < 0) pausedBy = { reason: "dip", date: cash.lowestLowDate };
    if (pausedBy) applied = "balanced";
  }
  const s = STYLES[applied];
  return {
    style: r.savingsStyle,
    applied,
    pushPaused: Boolean(pausedBy),
    pausedBy,
    bufferPct: s.bufferPct,
    // An explicit share on the retirement setup wins over the style's default.
    retirementPct: p.retirement?.windfallPct ?? s.retirementPct,
    goalPace: s.goalPace,
    cushionWeeks: r.cushionWeeks,
    payBasis: r.predictability === "very_steady" ? "base" : "low",
    minWeeklySpendCents: r.minWeeklySpendCents,
  };
}

/** The answer to "Are taxes taken out of your pay?", with a default by how they're paid. */
export function payTaxesOf(p: Profile): NonNullable<Profile["payTaxes"]> {
  return p.payTaxes ?? (p.profileType === "freelance" ? "self" : "withheld");
}

/** Push hard, paused: Balanced shares, keeping the reason so the UI can say why. */
export function pauseToBalanced(r: ResolvedRules, pausedBy: NonNullable<ResolvedRules["pausedBy"]>): ResolvedRules {
  const s = STYLES.balanced;
  const explicitRetirement = r.retirementPct !== STYLES[r.applied].retirementPct;
  return { ...r, applied: "balanced", pushPaused: true, pausedBy, bufferPct: s.bufferPct, retirementPct: explicitRetirement ? r.retirementPct : s.retirementPct, goalPace: s.goalPace };
}

/** Defaults for a new income source, from how predictable the user says their income is. */
export function incomeDefaults(p: Profile) {
  const r = rulesOf(p);
  const confidence = ({ very_steady: "certain", mostly_steady: "likely", lumpy: "likely", feast_famine: "uncertain" } as const)[r.predictability];
  /** Typical amount variation, as a share of the payment. */
  const spreadPct = { very_steady: 0, mostly_steady: 5, lumpy: 15, feast_famine: 30 }[r.predictability];
  /** How many days late a payment can land in the low case. */
  const lateDays = { on_time: 0, "1_2_weeks_late": 10, "3_plus_weeks_late": 21 }[r.clientsPay];
  /** New income has tax withheld only if the user said taxes come out of their pay. */
  const taxWithheld = payTaxesOf(p) === "withheld";
  return { confidence, spreadPct, lateDays, taxWithheld };
}

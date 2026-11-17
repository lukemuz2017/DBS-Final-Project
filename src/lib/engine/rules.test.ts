import { describe, expect, it } from "vitest";
import { ALL_DEMO_PROFILES } from "../demo";
import type { Profile } from "../types";
import { forecast } from "./forecast";
import { accountGaps } from "./gaps";
import { paydayPlan, safePay, windfallSplits } from "./plan";
import { incomeDefaults, resolveRules } from "./rules";

function base(overrides: Partial<Profile> = {}): Profile {
  return {
    slug: "freelance",
    name: "Test Person",
    initials: "TP",
    role: "Tester",
    city: "Testville",
    neighborhood: "Downtown",
    blurb: "",
    profileType: "freelance",
    today: "2026-11-13",
    runwayTargetWeeks: 104,
    rangeConfidence: 80,
    accounts: [
      { id: "chk", institution: "Bank", name: "Checking", mask: "0001", type: "checking", tier: "operating", balanceCents: 1_000_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "tax", institution: "Bank", name: "Tax savings", mask: "0002", type: "savings", tier: "reserve", balanceCents: 200_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "emg", institution: "Bank", name: "Emergency", mask: "0003", type: "savings", tier: "reserve", purpose: "emergency", balanceCents: 300_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "sep", institution: "Broker", name: "SEP IRA", mask: "0004", type: "investment", tier: "long_term", balanceCents: 1_000_000, balanceAsOf: "2026-11-13T00:00:00Z" },
    ],
    incomeStreams: [
      { id: "client", name: "Client", kind: "freelance_client", cadence: "irregular", confidence: "likely", amountSpreadCents: 0, taxWithheld: false, payments: [{ expectedDate: "2026-11-23", amountCents: 200_000 }], summary: "" },
    ],
    recurringBills: [],
    plannedEvents: [],
    spending: { weeklyMeanCents: 20_000, weeklySdCents: 0 },
    tax: { setAsidePct: 30, receivedThisPeriodCents: 0, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2027-04-15", reserveAccountId: "tax", note: "" },
    retirement: { plan: "sep_ira", accountId: "sep", ytdContributedCents: 0, estNetProfitCents: 5_000_000 },
    goals: [],
    transactions: [],
    ...overrides,
  };
}

const roomy = { runwayWeeks: 20, lowestLow: 100_000, lowestLowDate: "2026-12-01" };

describe("money rules", () => {
  it("defaults to Balanced: 25% buffer, 10% retirement, a one-week cushion, low case", () => {
    expect(resolveRules(base())).toMatchObject({ style: "balanced", applied: "balanced", bufferPct: 25, retirementPct: 10, goalPace: 1, cushionWeeks: 1, payBasis: "low", pushPaused: false });
  });

  it("each style changes the shares", () => {
    expect(resolveRules(base({ rules: { savingsStyle: "safe" } }))).toMatchObject({ bufferPct: 35, retirementPct: 5, goalPace: 1 });
    expect(resolveRules(base({ rules: { savingsStyle: "push" } }), roomy)).toMatchObject({ bufferPct: 15, retirementPct: 20, goalPace: 1.5 });
  });

  it("pauses Push hard when Cash Runway is under 4 weeks or the low case dips below $0", () => {
    const push = base({ rules: { savingsStyle: "push" } });
    expect(resolveRules(push, { ...roomy, runwayWeeks: 3.5 })).toMatchObject({ applied: "balanced", pushPaused: true, pausedBy: { reason: "runway" } });
    expect(resolveRules(push, { ...roomy, lowestLow: -1, lowestLowDate: "2027-01-08" })).toMatchObject({ applied: "balanced", pushPaused: true, pausedBy: { reason: "dip", date: "2027-01-08" } });
    expect(resolveRules(push, roomy).pushPaused).toBe(false);
  });

  it("an explicit retirement share wins over the style", () => {
    const p = base({ rules: { savingsStyle: "push" }, retirement: { plan: "sep_ira", accountId: "sep", ytdContributedCents: 0, estNetProfitCents: 5_000_000, windfallPct: 12 } });
    expect(resolveRules(p, roomy).retirementPct).toBe(12);
  });

  it("very steady income plans Pay yourself on the expected case", () => {
    expect(resolveRules(base({ rules: { predictability: "very_steady" } })).payBasis).toBe("base");
    expect(safePay(base({ rules: { predictability: "very_steady" } })).basis).toBe("base");
  });

  it("sets the checking cushion from the weeks chosen (at least $500)", () => {
    // Weekly burn = $400 of spending: 1 week = $400 -> $500 floor; 2 weeks = $800.
    const p = base({ spending: { weeklyMeanCents: 40_000, weeklySdCents: 0 } });
    expect(forecast(p).cushion).toBe(50_000);
    expect(forecast({ ...p, rules: { cushionWeeks: 2 } }).cushion).toBe(80_000);
  });

  it("feeds the style into the Payday Plan", () => {
    const leg = (p: Profile, k: string) => windfallSplits(p)[0].legs.find((l) => l.kind === k)?.amountCents ?? 0;
    // $2,000 payment, $1,400 after the 30% tax set-aside.
    expect(leg(base(), "buffer")).toBe(35_000); // 25%
    expect(leg(base(), "retirement")).toBe(14_000); // 10%
    const push = base({ rules: { savingsStyle: "push" } });
    expect(paydayPlan(push).rules.pushPaused).toBe(false);
    expect(leg(push, "buffer")).toBe(21_000); // 15%
    expect(leg(push, "retirement")).toBe(28_000); // 20%
  });

  it("falls back to Balanced shares, and says so, when Push hard is paused", () => {
    // A $12,000 bill in January sends the low case below $0.
    const tight = base({ rules: { savingsStyle: "push" }, plannedEvents: [{ id: "x", name: "Big bill", kind: "other", amountCents: -1_200_000, dueDate: "2027-01-10" }] });
    const plan = paydayPlan(tight);
    expect(plan.rules).toMatchObject({ pushPaused: true, applied: "balanced", bufferPct: 25 });
  });

  it("pauses Push hard when it would cut everyday spending below the user's minimum", () => {
    // Jordan on Push hard: the bigger retirement and goal moves would leave about $50/week
    // for everyday spending, under his $100 minimum, so the plan falls back to Balanced.
    const jordan = ALL_DEMO_PROFILES.find((x) => x.slug === "freelance")!;
    const push = { ...jordan, rules: { ...jordan.rules, savingsStyle: "push" as const } };
    expect(paydayPlan(push).rules).toMatchObject({ pushPaused: true, applied: "balanced", pausedBy: { reason: "necessities" } });
    expect(safePay(push).weeklyCents).toBeGreaterThanOrEqual(10_000);
    // Without a minimum, Push hard stays on, and Pay yourself drops below $100.
    const noMin = { ...push, rules: { ...push.rules, minWeeklySpendCents: 0 } };
    expect(paydayPlan(noMin).rules.pushPaused).toBe(false);
    expect(safePay(noMin).weeklyCents).toBeLessThan(10_000);
  });

  it("turns predictability into defaults for new income", () => {
    expect(incomeDefaults(base({ rules: { predictability: "very_steady", clientsPay: "on_time" } }))).toEqual({ confidence: "certain", spreadPct: 0, lateDays: 0 });
    expect(incomeDefaults(base({ rules: { predictability: "feast_famine", clientsPay: "3_plus_weeks_late" } }))).toEqual({ confidence: "uncertain", spreadPct: 30, lateDays: 21 });
  });
});

describe("account gaps", () => {
  it("suggests tax savings, an emergency fund and a retirement account to a freelancer with only checking", () => {
    const p = base({ accounts: [base().accounts[0]], tax: undefined, retirement: undefined });
    expect(accountGaps(p).map((g) => g.id)).toEqual(["tax-savings", "emergency-savings", "retirement-self", "emergency-goal"]);
  });

  it("stops suggesting what the user dismissed", () => {
    const p = base({ accounts: [base().accounts[0]], tax: undefined, retirement: undefined, rules: { dismissedGaps: ["retirement-self", "emergency-goal"] } });
    expect(accountGaps(p).map((g) => g.id)).toEqual(["tax-savings", "emergency-savings"]);
  });

  it("has nothing to suggest to Jordan, and the full match to Sam", () => {
    const by = (slug: string) => ALL_DEMO_PROFILES.find((p) => p.slug === slug)!;
    expect(accountGaps(by("freelance"))).toEqual([]);
    expect(accountGaps(by("steady")).map((g) => g.id)).toEqual(["employer-match"]);
  });
});

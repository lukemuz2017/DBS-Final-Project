import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../demo";
import type { Profile } from "../types";
import { refundPlan, retirementPlan, safePay, windfallSplits } from "./plan";

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
    runwayTargetWeeks: 17,
    rangeConfidence: 80,
    accounts: [
      { id: "chk", institution: "Bank", name: "Checking", mask: "0001", type: "checking", tier: "operating", balanceCents: 100_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "tax", institution: "Bank", name: "Tax savings", mask: "0002", type: "savings", tier: "reserve", balanceCents: 200_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "emg", institution: "Bank", name: "Emergency", mask: "0003", type: "savings", tier: "reserve", balanceCents: 300_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "sep", institution: "Broker", name: "SEP IRA", mask: "0004", type: "investment", tier: "long_term", balanceCents: 1_000_000, balanceAsOf: "2026-11-13T00:00:00Z" },
    ],
    incomeStreams: [],
    recurringBills: [],
    plannedEvents: [],
    spending: { weeklyMeanCents: 0, weeklySdCents: 0 },
    goals: [],
    transactions: [],
    ...overrides,
  };
}

describe("safe pay", () => {
  it("is the most weekly spending that keeps cash above the cushion for 12 weeks", () => {
    // $6,000 of cash, nothing else happening, cushion $500:
    // 6,000 - 12 x weekly >= 500  ->  weekly <= $458.33, rounded down to $455.
    const s = safePay(base());
    expect(s.feasible).toBe(true);
    expect(s.cushionCents).toBe(50_000);
    expect(s.weeklyCents).toBe(45_500);
    expect(s.paycheckCents).toBe(91_000);
  });

  it("says when there is no room at all, and by how much", () => {
    const s = safePay(base({ plannedEvents: [{ id: "x", name: "Big bill", kind: "other", amountCents: -700_000, dueDate: "2026-11-20" }] }));
    expect(s.feasible).toBe(false);
    expect(s.weeklyCents).toBe(0);
    expect(s.gapCents).toBe(150_000); // cash ends at -$1,000; cushion is $500
  });
});

describe("windfall splits", () => {
  // $200/week of spending and a 52-week runway target, so the buffer needs topping up.
  const p = base({
    runwayTargetWeeks: 52,
    spending: { weeklyMeanCents: 20_000, weeklySdCents: 0 },
    tax: { setAsidePct: 30, receivedThisPeriodCents: 0, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2027-04-15", reserveAccountId: "tax", note: "" },
    retirement: { plan: "sep_ira", accountId: "sep", ytdContributedCents: 0, estNetProfitCents: 5_000_000, windfallPct: 10 },
    incomeStreams: [
      { id: "client", name: "Client", kind: "freelance_client", cadence: "irregular", confidence: "likely", amountSpreadCents: 0, taxWithheld: false, payments: [{ expectedDate: "2026-11-23", amountCents: 200_000 }], summary: "" },
    ],
  });

  it("sets tax aside first, then splits the rest, and accounts for every dollar", () => {
    const [w] = windfallSplits(p);
    expect(w.amountCents).toBe(200_000);
    const leg = (k: string) => w.legs.find((l) => l.kind === k)?.amountCents ?? 0;
    expect(leg("tax")).toBe(60_000); // 30%
    expect(leg("buffer")).toBe(35_000); // 25% of the $1,400 left after tax
    expect(leg("retirement")).toBe(14_000); // 10% of $1,400
    expect(w.legs.reduce((s, l) => s + l.amountCents, 0)).toBe(200_000);
    expect(w.legs.find((l) => l.kind === "tax")?.account).toBe("Bank Tax savings");
  });

  it("only splits untaxed payments, and only when tax tracking is on", () => {
    expect(windfallSplits({ ...p, tax: undefined })).toEqual([]);
    expect(windfallSplits({ ...p, incomeStreams: p.incomeStreams.map((s) => ({ ...s, taxWithheld: true })) })).toEqual([]);
  });
});

describe("retirement plan", () => {
  it("self-employed: SEP is about 20% of net profit; a Solo 401(k) adds the $24,500 employee deferral", () => {
    const r = retirementPlan(base({ tax: { setAsidePct: 30, receivedThisPeriodCents: 0, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2027-01-15", note: "" }, retirement: { plan: "sep_ira", ytdContributedCents: 300_000, estNetProfitCents: 6_800_000 } }));
    expect(r.kind).toBe("self_employed");
    expect(r.sepLimitCents).toBe(1_360_000);
    expect(r.soloLimitCents).toBe(3_810_000);
    expect(r.roomCents).toBe(1_060_000);
    expect(r.taxSavedPer1000Cents).toBe(30_000);
  });

  it("employee: raise contributions to get the full match", () => {
    const r = retirementPlan(base({ retirement: { plan: "employer_401k", ytdContributedCents: 0, salaryCents: 7_800_000, contributionPct: 3, matchRatePct: 50, matchUpToPct: 6 } }));
    expect(r.kind).toBe("employer");
    expect(r.raiseToPct).toBe(6);
    expect(r.matchGainedPerYearCents).toBe(117_000); // 3% of $78,000 x 50%
    expect(r.costPerPaycheckCents).toBe(6_300); // $90 pre-tax per paycheck, about $63 after tax
  });

  it("no plan, no advice", () => {
    expect(retirementPlan(base()).kind).toBe("none");
  });
});

describe("student refund plan (demo: Priya)", () => {
  const priya = DEMO_PROFILES.find((x) => x.slug === "student")!;
  const r = refundPlan(priya)!;

  it("stretches the winter refund to the spring refund", () => {
    expect(r.refundCents).toBe(1_420_000);
    expect(r.refundDate).toBe("2027-01-07");
    expect(r.nextRefundDate).toBe("2027-03-30");
    expect(r.weeks).toBe(11.7);
  });

  it("flags borrowed money likely to sit idle, and the federal 120-day window", () => {
    expect(r.idleCents).toBeGreaterThan(0);
    expect(r.borrowLessCents % 10_000).toBe(0);
    expect(r.interestSavedPerYearCents).toBe(Math.round((r.borrowLessCents * 9.25) / 100));
    expect(r.federalReturnableCents).toBe(Math.min(r.borrowLessCents, 683_300));
    expect(r.returnByDate).toBe("2027-05-07");
  });

  it("only applies to profiles with student loans", () => {
    expect(refundPlan(DEMO_PROFILES.find((x) => x.slug === "freelance")!)).toBeNull();
  });
});

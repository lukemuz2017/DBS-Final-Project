import { describe, expect, it } from "vitest";
import { ALL_DEMO_PROFILES as DEMO_PROFILES } from "../demo";
import type { Profile } from "../types";
import { forecastWithPlan, goalFunding, refundPlan, retirementNeed, retirementOutlook, retirementPlan, safePay, windfallSplits } from "./plan";

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
  it("is the most weekly spending that keeps checking above the cushion; savings don't pay you", () => {
    // $1,000 in checking ($5,000 in savings doesn't count), nothing else happening, cushion $500:
    // 1,000 - 12 x weekly >= 500  ->  weekly <= $41.67, rounded down to $40.
    const s = safePay(base());
    expect(s.feasible).toBe(true);
    expect(s.cushionCents).toBe(50_000);
    expect(s.weeklyCents).toBe(4_000);
    expect(s.paycheckCents).toBe(8_000);
  });

  it("says when there is no room at all, and by how much", () => {
    const s = safePay(base({ plannedEvents: [{ id: "x", name: "Big bill", kind: "other", amountCents: -700_000, dueDate: "2026-11-20" }] }));
    expect(s.feasible).toBe(false);
    expect(s.weeklyCents).toBe(0);
    expect(s.gapCents).toBe(650_000); // checking ends at -$6,000; cushion is $500
  });
});

describe("windfall splits", () => {
  // $200/week of spending and a 104-week runway target, so the buffer needs topping up;
  // $10,000 in checking, so checking has room for every step.
  const p = base({
    runwayTargetWeeks: 104,
    accounts: [
      { id: "chk", institution: "Bank", name: "Checking", mask: "0001", type: "checking", tier: "operating", balanceCents: 1_000_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "tax", institution: "Bank", name: "Tax savings", mask: "0002", type: "savings", tier: "reserve", balanceCents: 200_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "emg", institution: "Bank", name: "Emergency", mask: "0003", type: "savings", tier: "reserve", purpose: "emergency", balanceCents: 300_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "sep", institution: "Broker", name: "SEP IRA", mask: "0004", type: "investment", tier: "long_term", balanceCents: 1_000_000, balanceAsOf: "2026-11-13T00:00:00Z" },
    ],
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

  it("puts each month's goal pace toward goals, once a month, skipping the emergency fund", () => {
    const withGoals = base({
      ...p,
      accounts: [...p.accounts, { id: "goals", institution: "Bank", name: "Goals", mask: "0006", type: "savings", tier: "reserve", balanceCents: 0, balanceAsOf: "2026-11-13T00:00:00Z" }],
      goals: [
        // $1,200 by March 31 = 4 months -> $300 a month.
        { id: "g1", name: "New camera", kind: "other", targetCents: 120_000, targetDate: "2027-03-31", savedCents: 0, monthlyContributionCents: 0, accountId: "goals" },
        { id: "g2", name: "Emergency fund", kind: "emergency_fund", targetCents: 1_000_000, targetDate: "2027-12-31", savedCents: 0, monthlyContributionCents: 50_000 },
      ],
      incomeStreams: [
        {
          ...p.incomeStreams[0],
          payments: [
            { expectedDate: "2026-11-23", amountCents: 200_000 },
            { expectedDate: "2026-11-27", amountCents: 200_000 },
            { expectedDate: "2026-12-07", amountCents: 200_000 },
          ],
        },
      ],
    });
    const splits = windfallSplits(withGoals);
    const goals = splits.map((w) => w.legs.find((l) => l.kind === "goals")?.amountCents ?? 0);
    expect(goals).toEqual([30_000, 0, 30_000]); // November's $300 is covered by the first payment
    const leg = splits[0].legs.find((l) => l.kind === "goals")!;
    expect(leg.label).toBe("New camera");
    expect(leg.account).toBe("Bank Goals");
    for (const w of splits) expect(w.legs.reduce((s, l) => s + l.amountCents, 0)).toBe(200_000);
  });

  it("keeps everything in checking when checking needs it in the low case", () => {
    // Only $1,000 in checking and $400/week of spending: within a month the $1,400 left after tax is gone.
    const tight = base({ ...p, accounts: p.accounts.map((a) => (a.id === "chk" ? { ...a, balanceCents: 100_000 } : a)), spending: { weeklyMeanCents: 40_000, weeklySdCents: 5_000 } });
    const [w] = windfallSplits(tight);
    expect(w.legs.map((l) => l.kind)).toEqual(["tax", "keep"]);
    expect(w.note).toMatch(/Savings and goals wait/);
  });

  it("feeds its moves into the forecast, marked as Payday Plan moves", () => {
    const f = forecastWithPlan(p);
    const moves = f.events.filter((e) => e.fromPlan && e.sourceId === "payday");
    expect(moves.map((e) => [e.toAccountId, e.amount.base])).toEqual([["emg", -35_000], ["sep", -14_000]]);
    // Checking at the end: 10,000 + 2,000 - 600 tax - 350 buffer - 140 retirement - 12 x 200 spending.
    expect(f.weeks[11].endBase).toBe(1_000_000 + 200_000 - 60_000 - 35_000 - 14_000 - 240_000);
  });

  it("counts goals by what actually feeds them", () => {
    const g = goalFunding(
      base({
        ...p,
        recurringBills: [{ id: "auto", name: "Auto-transfer", category: "transfer", cadence: "monthly", dayOfMonth: 1, amountCents: -40_000, amountSpreadCents: 0, toAccountId: "emg", essential: false }],
        goals: [
          { id: "e", name: "Emergency fund", kind: "emergency_fund", targetCents: 1_000_000, targetDate: "2027-12-31", savedCents: 0, monthlyContributionCents: 99_999, accountId: "emg" },
          { id: "t", name: "Trip", kind: "travel", targetCents: 100_000, targetDate: "2027-06-30", savedCents: 20_000, monthlyContributionCents: 10_000 },
        ],
      }),
    );
    // Linked: the account's balance, and the $400/month transfer plus the plan's $350 buffer top-up
    // spread over the 12 weeks (350 / 2.76 months = $127). The typed $999.99 is ignored.
    expect(g.get("e")).toEqual({ savedCents: 300_000, monthlyCents: 40_000 + 12_683, source: "transfer" });
    // Not linked: what you entered.
    expect(g.get("t")).toEqual({ savedCents: 20_000, monthlyCents: 10_000, source: "you" });
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

describe("retirement outlook", () => {
  const employer = (overrides: Partial<Profile> = {}) =>
    base({
      profileType: "steady",
      birthYear: 2000, // 26 in 2026
      accounts: [{ id: "k", institution: "Broker", name: "401(k)", mask: "0005", type: "investment", tier: "long_term", balanceCents: 0, balanceAsOf: "2026-11-13T00:00:00Z" }],
      retirement: {
        plan: "employer_401k",
        accountId: "k",
        ytdContributedCents: 0,
        salaryCents: 7_800_000,
        contributionPct: 3,
        matchRatePct: 50,
        matchUpToPct: 6,
        contributions: [
          { date: "2026-08-21", amountCents: 9_000, source: "you" }, // 12 weeks + 1 day ago: outside the window
          { date: "2026-08-22", amountCents: 9_000, source: "you" }, // first day of the oldest week
          { date: "2026-08-22", amountCents: 4_500, source: "employer" },
          { date: "2026-11-13", amountCents: 9_000, source: "you" }, // today: last week
        ],
      },
      ...overrides,
    });

  it("needs 25x the gap between 80% of income and Social Security, plus the years before 67", () => {
    // $100k income: want $80k a year, Social Security covers $40k, so 25 x $40k = $1,000,000 at 67.
    expect(retirementNeed(10_000_000, 67)).toBe(100_000_000);
    // Retiring at 60 also means covering Social Security's $40k for 7 years: + $280,000.
    expect(retirementNeed(10_000_000, 60)).toBe(128_000_000);
  });

  it("groups this year's contributions by quarter, from the first quarter with any", () => {
    const o = retirementOutlook(employer())!;
    // Nothing in Q1-Q2, so the chart starts at Q3; Q4 is still in progress on Nov 13.
    expect(o.quarters.map((q) => q.label)).toEqual(["Q3", "Q4"]);
    expect(o.quarters[0]).toMatchObject({ start: "2026-07-01", end: "2026-09-30", youCents: 18_000, employerCents: 4_500, complete: true });
    expect(o.quarters[1]).toMatchObject({ end: "2026-12-31", youCents: 9_000, complete: false });
    // Average of complete quarters only.
    expect(o.avgQuarterCents).toBe(22_500);
    // 15% of $78,000, a quarter of it = $2,925.
    expect(o.paceQuarterCents).toBe(292_500);
  });

  it("employee: get the full match first, then the contribution that reaches 15% with the match", () => {
    const kp = retirementOutlook(employer())!.keepPace;
    expect(kp).toMatchObject({ kind: "employer", currentPct: 3, matchPct: 6, matchGainedPerYearCents: 117_000 });
    // Match caps at 3% (half of 6%), so 12% + 3% = 15%.
    expect(kp.kind === "employer" && kp.pacePct).toBe(12);
  });

  it("projects contributions plus match at the expected 5% return", () => {
    const o = retirementOutlook(employer())!;
    // 3% of $78,000 plus a 1.5% match = $3,510 a year.
    expect(o.annualContributionCents).toBe(351_000);
    expect(o.age).toBe(26);
    expect(o.path[0].base).toBe(0);
    expect(o.path[1].base).toBe(351_000);
    expect(o.path[2].base).toBe(719_550); // 3,510 x 1.05 + 3,510
    expect(o.path[2].low).toBe(712_530); // 3,510 x 1.03 + 3,510
    expect(o.path.at(-1)!.age).toBe(75);
    expect(o.retirementAge).toBe(67);
    expect(o.atRetirement.needCents).toBe(retirementNeed(7_800_000, 67));
  });

  it("compares with saving the rule's 15%", () => {
    const o = retirementOutlook(employer())!;
    expect(o.atRule!.annualContributionCents).toBe(1_170_000);
    expect(o.atRule!.readinessPct).toBeGreaterThan(o.readinessPct);
  });

  it("says when the expected case is ready, no earlier than 50", () => {
    const rich = employer({
      accounts: [{ id: "k", institution: "Broker", name: "401(k)", mask: "0005", type: "investment", tier: "long_term", balanceCents: 500_000_000, balanceAsOf: "2026-11-13T00:00:00Z" }],
    });
    expect(retirementOutlook(rich)!.readyAge).toBe(50);
  });

  it("uses the Payday Plan share of after-tax profit for the self-employed", () => {
    const o = retirementOutlook(
      base({
        birthYear: 1992,
        tax: { setAsidePct: 30, receivedThisPeriodCents: 0, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2027-01-15", note: "" },
        retirement: { plan: "sep_ira", accountId: "sep", ytdContributedCents: 0, estNetProfitCents: 6_800_000, windfallPct: 10 },
      }),
    )!;
    // 10% of ($68,000 less 30% set aside for tax) = $4,760.
    expect(o.annualContributionCents).toBe(476_000);
    expect(o.balanceCents).toBe(1_000_000);
    // 15% of pre-tax income = 21.4% of what's left after a 30% set-aside -> 22%.
    // Catch-up: 15% of $68,000 = $10,200, all still to go (SEP room is $13,600).
    expect(o.keepPace).toMatchObject({ kind: "self_employed", currentSharePct: 10, sharePct: 22, catchUpCents: 1_020_000, planLimitCents: 1_360_000, soloLimitCents: 3_810_000 });
  });

  it("is off without a plan or a birth year", () => {
    expect(retirementOutlook(employer({ birthYear: undefined }))).toBeNull();
    expect(retirementOutlook(base({ birthYear: 1990 }))).toBeNull();
  });
});

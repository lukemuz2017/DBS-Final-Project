import { describe, expect, it } from "vitest";
import { ALL_DEMO_PROFILES as DEMO_PROFILES } from "../demo";
import type { Profile } from "../types";
import { coverOrder, forecast } from "./forecast";
import { forecastWithPlan, windfallSplits } from "./plan";

// A tiny profile with numbers small enough to check by hand.
function simpleProfile(overrides: Partial<Profile> = {}): Profile {
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
      { id: "sav", institution: "Bank", name: "Savings", mask: "0002", type: "savings", tier: "reserve", balanceCents: 500_000, balanceAsOf: "2026-11-13T00:00:00Z" },
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

describe("forecast engine", () => {
  it("is deterministic: the same profile gives the same forecast", () => {
    for (const p of DEMO_PROFILES) {
      expect(JSON.stringify(forecast(p))).toBe(JSON.stringify(forecast(p)));
    }
  });

  it("keeps a flat balance when nothing happens", () => {
    const f = forecast(simpleProfile());
    expect(f.weeks).toHaveLength(12);
    expect(f.windows).toHaveLength(6);
    for (const w of f.weeks) {
      expect([w.low, w.base, w.high]).toEqual([100_000, 100_000, 100_000]);
      expect(w.status).toBe("ok");
    }
  });

  it("applies a planned expense on its date and flags the dip as fixable from savings", () => {
    const f = forecast(simpleProfile({ plannedEvents: [{ id: "x", name: "Big bill", kind: "other", amountCents: -300_000, dueDate: "2026-11-20" }] }));
    // Day 7 is the last day of week 1 (Nov 14–20).
    expect(f.weeks[0].base).toBe(-200_000);
    expect(f.weeks[0].endBase).toBe(-200_000); // week 1 ends on the day it lands
    expect(f.weeks[1].endBase).toBe(-200_000); // nothing else happens
    expect(f.weeks[0].status).toBe("short"); // −$2,000 in checking, $5,000 in savings
    expect(f.windows[0].fix?.kind).toBe("move");
    expect(f.windows[0].fix?.amount).toBe(220_000); // $2,000 + $200 cushion
    expect(f.windows[0].fix?.legs).toEqual([{ accountId: "sav", account: "Bank Savings", amount: 220_000, balance: 500_000 }]);
    expect(f.windows[0].fix?.to).toBe("Bank Checking");
  });

  it("calls a dip savings can't cover a shortfall", () => {
    const f = forecast(simpleProfile({ plannedEvents: [{ id: "x", name: "Huge bill", kind: "other", amountCents: -900_000, dueDate: "2026-11-20" }] }));
    expect(f.weeks[0].status).toBe("shortfall");
    expect(f.windows[0].fix?.kind).toBe("shortfall");
    expect(f.windows[0].fix?.amount).toBe(300_000); // −$8,000 + $5,000 savings = $3,000 short
  });

  it("checking + savings scope: savings count, so a dip savings can cover isn't flagged", () => {
    const p = simpleProfile({ plannedEvents: [{ id: "x", name: "Big bill", kind: "other", amountCents: -300_000, dueDate: "2026-11-20" }] });
    const f = forecast(p, { scope: "cash" });
    expect(f.scope).toBe("cash");
    expect(f.startBalance).toBe(600_000); // $1,000 checking + $5,000 savings
    expect(f.weeks[0].base).toBe(300_000);
    expect(f.weeks[0].status).toBe("ok");
    expect(forecast(p).weeks[0].status).toBe("short"); // same profile, checking only
  });

  it("checking + savings scope: a real shortfall is the amount below $0 across both", () => {
    const f = forecast(simpleProfile({ plannedEvents: [{ id: "x", name: "Huge bill", kind: "other", amountCents: -900_000, dueDate: "2026-11-20" }] }), { scope: "cash" });
    expect(f.weeks[0].base).toBe(-300_000);
    expect(f.weeks[0].status).toBe("shortfall");
    expect(f.windows[0].fix?.amount).toBe(300_000); // not double-counting savings
  });

  it("checking + savings scope: transfers into savings don't lower the balance", () => {
    const p = simpleProfile({
      recurringBills: [{ id: "save", name: "To savings", category: "transfer", cadence: "weekly", firstDate: "2026-11-16", amountCents: -20_000, amountSpreadCents: 0, toAccountId: "sav", essential: false }],
    });
    expect(forecast(p).weeks[11].endBase).toBe(100_000 - 12 * 20_000); // checking drains into savings
    expect(forecast(p, { scope: "cash" }).weeks[11].endBase).toBe(600_000); // total cash unchanged
  });

  it("delays income in the cautious case and leaves uncertain income out of it", () => {
    const f = forecast(
      simpleProfile({
        incomeStreams: [
          {
            id: "client",
            name: "Client",
            kind: "freelance_client",
            cadence: "irregular",
            confidence: "likely",
            amountSpreadCents: 0,
            taxWithheld: true,
            payments: [
              { expectedDate: "2026-11-15", latestDate: "2026-11-25", amountCents: 50_000 },
              { expectedDate: "2026-11-16", amountCents: 70_000, confidence: "uncertain" },
            ],
            summary: "",
          },
        ],
      }),
    );
    const week1 = f.weeks[0]; // Nov 14–20
    expect(week1.base).toBe(100_000); // lowest point is before the Nov 15 payment
    expect(week1.low).toBe(100_000); // cautious: payment slips to Nov 25
    expect(f.weeks[1].low).toBe(100_000); // week 2 (Nov 21–27): low point is before the Nov 25 arrival
    expect(f.weeks[2].low).toBe(150_000); // week 3: paid; uncertain $700 never counted
    expect(f.weeks[1].base).toBe(150_000); // base also skips uncertain income
    expect(f.weeks[1].high).toBe(220_000); // good case counts it
  });

  it("estimates quarterly tax from the set-aside rate and untaxed income", () => {
    const f = forecast(
      simpleProfile({
        tax: { setAsidePct: 30, receivedThisPeriodCents: 1_000_000, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2027-01-15", reserveAccountId: "sav", note: "" },
      }),
    );
    expect(f.tax?.amount).toBe(300_000); // 30% of $10,000
    expect(f.tax?.covered).toBe(true); // $5,000 set aside
  });

  it("treats tax savings as earmarked: estimated tax is paid from it first, and it never covers other bills", () => {
    // Checking $1,000; tax savings ("sav") $5,000 earmarked; a separate $2,000 emergency fund.
    const p = simpleProfile({
      accounts: [
        ...simpleProfile().accounts,
        { id: "emg", institution: "Bank", name: "Emergency", mask: "0003", type: "savings", tier: "reserve", balanceCents: 200_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      ],
      tax: { setAsidePct: 30, receivedThisPeriodCents: 2_000_000, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2026-11-20", reserveAccountId: "sav", note: "" },
      plannedEvents: [{ id: "rent", name: "Rent", kind: "other", amountCents: -150_000, dueDate: "2026-11-18" }],
    });
    const f = forecast(p);
    // Tax is $6,000: $5,000 from tax savings, $1,000 from checking. Rent $1,500. Checking: 1,000 - 1,500 - 1,000.
    const tax = f.events.find((e) => e.kind === "tax")!;
    expect(tax.amount.base).toBe(-600_000);
    expect(tax.earmarkedCents).toBe(500_000);
    expect(f.weeks[0].base).toBe(-150_000);
    // The fix draws only from the emergency fund, never from tax savings.
    expect(f.windows[0].fix?.legs?.map((l) => l.accountId)).toEqual(["emg"]);
    // Runway counts checking + the emergency fund, never tax savings.
    expect(f.taxEarmarkToday).toBe(500_000);
    expect(f.runway.liquid).toBe(100_000 + 200_000);
    // Checking + savings never counts tax savings: it starts at checking + the emergency fund
    // ($3,000), and only the $1,000 of tax beyond tax savings leaves it. 3,000 - 1,500 - 1,000.
    const cash = forecast(p, { scope: "cash" });
    expect(cash.startBalance).toBe(300_000);
    expect(cash.weeks[0].base).toBe(50_000);
  });

  it("sets tax aside from each untaxed payment the day it lands, and pays the bill from it", () => {
    // Tax savings starts empty. A $1,000 untaxed payment on Nov 16; 30% is due Nov 30.
    const p = simpleProfile({
      accounts: [
        { id: "chk", institution: "Bank", name: "Checking", mask: "0001", type: "checking", tier: "operating", balanceCents: 100_000, balanceAsOf: "2026-11-13T00:00:00Z" },
        { id: "tax", institution: "Bank", name: "Tax savings", mask: "0002", type: "savings", tier: "reserve", balanceCents: 0, balanceAsOf: "2026-11-13T00:00:00Z" },
      ],
      incomeStreams: [{ id: "c", name: "Client", kind: "freelance_client", cadence: "irregular", confidence: "certain", amountSpreadCents: 0, taxWithheld: false, payments: [{ expectedDate: "2026-11-16", amountCents: 100_000 }], summary: "" }],
      tax: { setAsidePct: 30, receivedThisPeriodCents: 0, periodLabel: "", periodEnd: "2026-12-31", dueDate: "2026-11-30", reserveAccountId: "tax", note: "" },
    });
    const f = forecast(p);
    const setAside = f.events.find((e) => e.fromPlan)!;
    expect(setAside).toMatchObject({ kind: "transfer", toAccountId: "tax", date: { base: "2026-11-16" } });
    expect(setAside.amount.base).toBe(-30_000);
    // The $300 bill is paid entirely from what was set aside, so checking ends at 1,000 + 1,000 - 300.
    expect(f.events.find((e) => e.kind === "tax")!.earmarkedCents).toBe(30_000);
    expect(f.weeks[11].endBase).toBe(170_000);
    expect(f.tax).toMatchObject({ amount: 30_000, setAside: 0, plannedSetAside: 30_000, covered: true });
    expect(f.followsPlan).toBe(true);
  });

  it("draws on the emergency fund first and goal savings last", () => {
    const p = simpleProfile({
      accounts: [
        { id: "chk", institution: "Bank", name: "Checking", mask: "0001", type: "checking", tier: "operating", balanceCents: 0, balanceAsOf: "2026-11-13T00:00:00Z" },
        { id: "goals", institution: "Bank", name: "Goals", mask: "0002", type: "savings", tier: "reserve", purpose: "goals", balanceCents: 900_000, balanceAsOf: "2026-11-13T00:00:00Z" },
        { id: "emg", institution: "Bank", name: "Emergency", mask: "0003", type: "savings", tier: "reserve", purpose: "emergency", balanceCents: 100_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      ],
      plannedEvents: [{ id: "x", name: "Repair", kind: "other", amountCents: -150_000, dueDate: "2026-11-18" }],
    });
    expect(coverOrder(p).map((a) => a.id)).toEqual(["emg", "goals"]);
    // $1,700 needed ($1,500 + $200 margin): all $1,000 of the emergency fund, then $700 from goals.
    expect(forecast(p).windows[0].fix?.legs?.map((l) => [l.accountId, l.amount])).toEqual([["emg", 100_000], ["goals", 70_000]]);
  });

  it("widens the range further out (spending uncertainty grows with time)", () => {
    const f = forecast(simpleProfile({ spending: { weeklyMeanCents: 10_000, weeklySdCents: 5_000 } }));
    const spread = (i: number) => f.weeks[i].high - f.weeks[i].low;
    expect(spread(11)).toBeGreaterThan(spread(0));
  });

  it("produces the intended demo stories", () => {
    const demo = (slug: string) => DEMO_PROFILES.find((p) => p.slug === slug)!;
    const statuses = (slug: string) => forecastWithPlan(demo(slug)).windows.map((w) => w.status);
    // Sam: steady. Priya: January needs a move from savings. Jordan: a tight end of January,
    // and the Payday Plan funds the buffer, retirement and the camera goal before then.
    expect(statuses("steady").every((s) => s === "ok")).toBe(true);
    expect(statuses("student")).toContain("short");
    expect(statuses("freelance")).toContain("tight");
    expect(statuses("freelance")).not.toContain("short");
    const kinds = new Set(windfallSplits(demo("freelance")).flatMap((w) => w.legs.map((l) => l.kind)));
    for (const k of ["tax", "buffer", "retirement", "goals"]) expect(kinds).toContain(k);
  });
});

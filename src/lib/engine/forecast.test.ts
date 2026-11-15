import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../demo";
import type { Profile } from "../types";
import { forecast } from "./forecast";

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
    expect(f.weeks[0].status).toBe("short"); // −$2,000 in checking, $5,000 in savings
    expect(f.windows[0].fix?.kind).toBe("move");
    expect(f.windows[0].fix?.amount).toBe(220_000); // $2,000 + $200 cushion
  });

  it("calls a dip savings can't cover a shortfall", () => {
    const f = forecast(simpleProfile({ plannedEvents: [{ id: "x", name: "Huge bill", kind: "other", amountCents: -900_000, dueDate: "2026-11-20" }] }));
    expect(f.weeks[0].status).toBe("shortfall");
    expect(f.windows[0].fix?.kind).toBe("shortfall");
    expect(f.windows[0].fix?.amount).toBe(300_000); // −$8,000 + $5,000 savings = $3,000 short
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

  it("widens the range further out (spending uncertainty grows with time)", () => {
    const f = forecast(simpleProfile({ spending: { weeklyMeanCents: 10_000, weeklySdCents: 5_000 } }));
    const spread = (i: number) => f.weeks[i].high - f.weeks[i].low;
    expect(spread(11)).toBeGreaterThan(spread(0));
  });

  it("produces the intended demo stories", () => {
    const statuses = (slug: string) => forecast(DEMO_PROFILES.find((p) => p.slug === slug)!).windows.map((w) => w.status);
    expect(statuses("steady").every((s) => s === "ok")).toBe(true);
    expect(statuses("student")).toContain("short");
    expect(statuses("freelance")).toContain("short");
  });
});

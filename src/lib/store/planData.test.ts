import { describe, expect, it } from "vitest";
import { ALL_DEMO_PROFILES } from "../demo";
import { estimatedTaxPeriod } from "../engine/taxPeriods";
import { planDataOf, profileColumns, todayIn, toProfile, validatePlanData, type ProfileRow } from "./planData";

const row: ProfileRow = {
  user_id: "user_123",
  display_name: "Alex Rivera",
  occupation: "Wedding videographer",
  city: "Chicago",
  state: "IL",
  birth_year: 1995,
  profile_type: "freelance",
  timezone: "America/Chicago",
  runway_target_weeks: 17,
  range_confidence: 80,
  savings_style: "push",
  predictability: "feast_famine",
  clients_pay: "1_2_weeks_late",
  cushion_weeks: "2.0",
  min_weekly_spend_cents: 12_000,
  dismissed_gaps: ["retirement-self"],
  onboarded_at: null,
  tour_seen_at: null,
};

describe("saved plans", () => {
  it("round-trips a profile through the database shape", () => {
    const jordan = ALL_DEMO_PROFILES.find((p) => p.slug === "freelance")!;
    const back = toProfile({ ...row, ...profileColumns(jordan), timezone: "America/New_York" }, planDataOf(jordan), jordan.today);
    expect(back.accounts).toEqual(jordan.accounts);
    expect(back.incomeStreams).toEqual(jordan.incomeStreams);
    expect(back.tax).toEqual(jordan.tax);
    expect(back.retirement).toEqual(jordan.retirement);
    expect(back.rules).toMatchObject(jordan.rules!);
    expect(back.name).toBe(jordan.name);
  });

  it("reads money rules from the profile row, including numeric strings", () => {
    const p = toProfile(row, validatePlanData({}), "2026-11-17");
    expect(p.rules).toEqual({ savingsStyle: "push", predictability: "feast_famine", clientsPay: "1_2_weeks_late", cushionWeeks: 2, minWeeklySpendCents: 12_000, dismissedGaps: ["retirement-self"] });
    expect(p.initials).toBe("AR");
    expect(p.accounts).toEqual([]);
  });

  it("rejects money that isn't whole cents, and damaged lists", () => {
    expect(() => validatePlanData({ accounts: [{ id: "a", balanceCents: 12.5 }] })).toThrow(/whole number of cents/);
    expect(() => validatePlanData({ goals: "nope" })).toThrow(/not a list/);
    expect(validatePlanData(null).accounts).toEqual([]);
  });

  it("works out today's date in the user's time zone", () => {
    // 3:30 a.m. UTC on Nov 18 is still Nov 17 in Chicago.
    expect(todayIn("America/Chicago", new Date("2026-11-18T03:30:00Z"))).toBe("2026-11-17");
    expect(todayIn("Not/AZone", new Date("2026-11-18T03:30:00Z"))).toBe("2026-11-18");
  });
});

describe("estimated tax periods", () => {
  it("finds the IRS period and due date for a day", () => {
    expect(estimatedTaxPeriod("2026-11-17")).toEqual({ periodStart: "2026-09-01", periodEnd: "2026-12-31", periodLabel: "Sep 1 – Dec 31, 2026", dueDate: "2027-01-15" });
    expect(estimatedTaxPeriod("2027-02-03").dueDate).toBe("2027-04-15");
    expect(estimatedTaxPeriod("2027-05-31").dueDate).toBe("2027-06-15");
    expect(estimatedTaxPeriod("2027-06-01").periodLabel).toBe("Jun 1 – Aug 31, 2027");
  });
});

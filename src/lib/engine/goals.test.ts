import { describe, expect, it } from "vitest";
import type { Goal } from "../types";
import { goalPace } from "./goals";

const goal = (o: Partial<Goal>): Goal => ({
  id: "g",
  name: "Goal",
  kind: "other",
  targetCents: 1_200_000, // $12,000
  targetDate: "2027-11-15", // 12 months after "today"
  savedCents: 0,
  monthlyContributionCents: 100_000, // $1,000/mo
  ...o,
});

const TODAY = "2026-11-13";

describe("goal pacing", () => {
  it("is on track when the monthly pace covers the gap in time", () => {
    const g = goalPace(goal({}), TODAY);
    expect(g.status).toBe("on_track");
    expect(g.monthsLeft).toBe(12);
    expect(g.reachDate).toBe("2027-11-01"); // 12 months of $1,000
    expect(g.monthsLate).toBe(0);
    expect(g.neededMonthlyCents).toBe(100_000);
  });

  it("is late, and says when it would land, when the pace is too slow", () => {
    const g = goalPace(goal({ monthlyContributionCents: 50_000 }), TODAY);
    expect(g.status).toBe("late");
    expect(g.reachDate).toBe("2028-11-01"); // 24 months of $500
    expect(g.monthsLate).toBe(12);
    expect(g.neededMonthlyCents).toBe(100_000);
    expect(g.projectedAtTargetCents).toBe(600_000);
  });

  it("counts savings already made", () => {
    const g = goalPace(goal({ savedCents: 600_000, monthlyContributionCents: 50_000 }), TODAY);
    expect(g.status).toBe("on_track");
    expect(g.remainingCents).toBe(600_000);
    expect(g.reachDate).toBe("2027-11-01");
  });

  it("has no reach date when nothing goes in each month", () => {
    const g = goalPace(goal({ monthlyContributionCents: 0 }), TODAY);
    expect(g.status).toBe("not_started");
    expect(g.reachDate).toBeNull();
    expect(g.neededMonthlyCents).toBe(100_000);
  });

  it("marks a goal already reached", () => {
    expect(goalPace(goal({ savedCents: 1_300_000 }), TODAY).status).toBe("reached");
  });
});

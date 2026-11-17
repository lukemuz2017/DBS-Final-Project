import { describe, expect, it } from "vitest";
import { accountGaps } from "./engine/gaps";
import { forecastWithPlan, windfallSplits } from "./engine/plan";
import { buildProfile, type OnboardingDraft } from "./onboarding";

const freelance: OnboardingDraft = {
  name: "Alex Rivera",
  occupation: "Wedding videographer",
  city: "Chicago",
  state: "IL",
  birthYear: 1995,
  profileType: "freelance",
  payTaxes: "self",
  predictability: "lumpy",
  clientsPay: "1_2_weeks_late",
  accounts: [
    { id: "a1", kind: "checking", institution: "Chase", name: "", amountCents: 600_000 },
    { id: "a2", kind: "savings", institution: "Ally", name: "Taxes", amountCents: 150_000, use: "taxes" },
    { id: "a3", kind: "credit_card", institution: "Amex", name: "", amountCents: 40_000 },
  ],
  payments: [
    { id: "p1", client: "Lakeview Studio", date: "2026-11-25", amountCents: 200_000, taxWithheld: false },
    { id: "p2", client: "Lakeview Studio", date: "2026-12-20", amountCents: 100_000, taxWithheld: false },
    { id: "p3", client: "", date: "2026-12-01", amountCents: 50_000, taxWithheld: false }, // no client: skipped
  ],
  bills: [
    { id: "b1", name: "Rent", amountCents: 160_000, dayOfMonth: 1, category: "housing" },
    { id: "b2", name: "Netflix", amountCents: 1_500, dayOfMonth: 9, category: "subscriptions" },
  ],
  loans: [],
  weeklySpendCents: 15_000,
  savingsStyle: "balanced",
  cushionWeeks: 1,
  runwayTargetWeeks: 17,
  taxPct: 30,
  minWeeklySpendCents: 10_000,
};

describe("first-time setup", () => {
  it("builds a freelancer's profile the engine can forecast", () => {
    const p = buildProfile(freelance, "2026-11-17");
    expect(p.accounts.map((a) => [a.tier, a.balanceCents])).toEqual([["operating", 600_000], ["reserve", 150_000], ["excluded", -40_000]]);
    expect(p.accounts[0].name).toBe("Checking");
    // Tax savings is the account marked "taxes"; the period and due date come from today.
    expect(p.tax).toMatchObject({ setAsidePct: 30, reserveAccountId: "a2", periodLabel: "Sep 1 – Dec 31, 2026", dueDate: "2027-01-15" });
    // One client, two payments; "lumpy" = likely, 15% spread; 1–2 weeks late = latest 10 days after.
    expect(p.incomeStreams).toHaveLength(1);
    expect(p.incomeStreams[0]).toMatchObject({ name: "Lakeview Studio", confidence: "likely", amountSpreadCents: 22_500, taxWithheld: false });
    expect(p.incomeStreams[0].payments[0]).toEqual({ expectedDate: "2026-11-25", amountCents: 200_000, latestDate: "2026-12-05" });
    expect(p.recurringBills.map((b) => [b.amountCents, b.essential])).toEqual([[-160_000, true], [-1_500, false]]);
    expect(p.rules).toMatchObject({ savingsStyle: "balanced", minWeeklySpendCents: 10_000 });

    const f = forecastWithPlan(p);
    expect(f.weeks).toHaveLength(12);
    expect(f.followsPlan).toBe(true); // tax set-asides from client payments
    expect(windfallSplits(p)[0].legs[0]).toMatchObject({ kind: "tax", amountCents: 60_000 });
    // No emergency fund or retirement account yet: the setup screen suggests them.
    expect(accountGaps(p).map((g) => g.id)).toEqual(["emergency-savings", "retirement-self", "emergency-goal"]);
  });

  it("builds a steady earner's paychecks and skips tax tracking", () => {
    const p = buildProfile(
      { ...freelance, profileType: "steady", payTaxes: "withheld", predictability: "very_steady", payments: [], paycheck: { amountCents: 210_000, cadence: "biweekly", next: "2026-11-20" } },
      "2026-11-17",
    );
    expect(p.tax).toBeUndefined();
    expect(p.rules?.clientsPay).toBe("on_time");
    expect(p.incomeStreams[0]).toMatchObject({ kind: "salary", confidence: "certain", taxWithheld: true });
    expect(p.incomeStreams[0].payments.slice(0, 3).map((x) => x.expectedDate)).toEqual(["2026-11-20", "2026-12-04", "2026-12-18"]);
  });

  it("pays a paid-in-full card on its due date, and turns a carried balance into a monthly paydown", () => {
    const inFull = buildProfile({ ...freelance, accounts: freelance.accounts.map((a) => (a.kind === "credit_card" ? { ...a, dueDay: 15 } : a)) }, "2026-11-17");
    expect(inFull.accounts[2]).toMatchObject({ type: "credit_card", balanceCents: -40_000, paymentDueDay: 15, paysInFull: true });
    // What's owed ($400) leaves checking on Dec 15.
    const pay = forecastWithPlan(inFull).events.find((e) => e.sourceId === "a3")!;
    expect(pay).toMatchObject({ date: { base: "2026-12-15" } });
    expect(pay.amount.base).toBe(-40_000);

    const carried = buildProfile({ ...freelance, accounts: freelance.accounts.map((a) => (a.kind === "credit_card" ? { ...a, dueDay: 15, paysInFull: false, paydownCents: 10_000 } : a)) }, "2026-11-17");
    expect(carried.recurringBills.find((b) => b.id === "paydown-a3")).toMatchObject({ category: "debt", dayOfMonth: 15, amountCents: -10_000 });
    expect(forecastWithPlan(carried).events.some((e) => e.sourceId === "a3")).toBe(false);
  });

  it("never creates a card-payment bill (card purchases are everyday spending)", () => {
    const p = buildProfile({ ...freelance, bills: [...freelance.bills, { id: "b3", name: "Amex", amountCents: 70_000, dayOfMonth: 20, category: "card_payment" }] }, "2026-11-17");
    expect(p.recurringBills.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("tracks estimated tax whenever some pay is untaxed, whatever the job type", () => {
    // A freelancer whose agency withholds tax: no tax tracking, no tax-savings suggestion.
    const withheld = buildProfile({ ...freelance, payTaxes: "withheld", accounts: [freelance.accounts[0]] }, "2026-11-17");
    expect(withheld.tax).toBeUndefined();
    expect(withheld.incomeStreams[0].taxWithheld).toBe(true);
    expect(accountGaps(withheld).map((g) => g.id)).not.toContain("tax-savings");
    // A salaried person with some untaxed side income: tax tracking on, tax savings suggested.
    const mixed = buildProfile({ ...freelance, profileType: "steady", payTaxes: "mixed", payments: [], accounts: [freelance.accounts[0]], paycheck: { amountCents: 200_000, cadence: "biweekly", next: "2026-11-20" } }, "2026-11-17");
    expect(mixed.tax).toMatchObject({ setAsidePct: 30, dueDate: "2027-01-15" });
    expect(mixed.incomeStreams[0].taxWithheld).toBe(true);
    expect(accountGaps(mixed)[0].id).toBe("tax-savings");
    expect(mixed.payTaxes).toBe("mixed");
  });

  it("turns each loan into a loan account and a monthly payment", () => {
    const p = buildProfile(
      {
        ...freelance,
        loans: [
          { id: "l1", kind: "student", lender: "Nelnet", balanceCents: 2_260_000, paymentCents: 29_000, dueDay: 20 },
          { id: "l2", kind: "mortgage", lender: "", balanceCents: 0, paymentCents: 180_000, dueDay: 1 },
          { id: "l3", kind: "car", lender: "Honda", balanceCents: 0, paymentCents: 0, dueDay: 1 }, // left blank: skipped
        ],
      },
      "2026-11-17",
    );
    expect(p.accounts.find((a) => a.id === "l1")).toMatchObject({ type: "loan", tier: "excluded", institution: "Nelnet", name: "Student loan", balanceCents: -2_260_000 });
    expect(p.recurringBills.filter((b) => b.id.startsWith("loanpay")).map((b) => [b.name, b.category, b.amountCents, b.dayOfMonth])).toEqual([
      ["Nelnet student loan", "debt", -29_000, 20],
      ["Mortgage", "housing", -180_000, 1],
    ]);
  });

  it("widens the range for feast-or-famine income", () => {
    expect(buildProfile({ ...freelance, predictability: "feast_famine" }, "2026-11-17").rangeConfidence).toBe(90);
  });
});

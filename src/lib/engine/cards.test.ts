import { describe, expect, it } from "vitest";
import type { Profile, Transaction } from "../types";
import { forecast, nextDueDate } from "./forecast";
import { everydaySpending } from "./spending";

function base(overrides: Partial<Profile> = {}): Profile {
  return {
    slug: "steady",
    name: "Test",
    initials: "T",
    role: "",
    city: "",
    neighborhood: "",
    blurb: "",
    profileType: "steady",
    today: "2026-11-13",
    runwayTargetWeeks: 17,
    rangeConfidence: 80,
    accounts: [
      { id: "chk", institution: "Bank", name: "Checking", mask: "", type: "checking", tier: "operating", balanceCents: 500_000, balanceAsOf: "2026-11-13T00:00:00Z" },
      { id: "card", institution: "Amex", name: "Gold", mask: "", type: "credit_card", tier: "excluded", balanceCents: -88_000, balanceAsOf: "2026-11-13T00:00:00Z", paymentDueDay: 22 },
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

describe("credit cards", () => {
  it("turns what you owe today into one payment out of checking on the due date", () => {
    const f = forecast(base());
    const pay = f.events.find((e) => e.sourceId === "card")!;
    expect(pay).toMatchObject({ kind: "planned", date: { base: "2026-11-22" } });
    expect(pay.amount.base).toBe(-88_000);
    expect(f.weeks[11].endBase).toBe(500_000 - 88_000);
  });

  it("doesn't pay off a card you carry a balance on (that's debt, paid down by a monthly bill)", () => {
    const p = base({ accounts: base().accounts.map((a) => (a.id === "card" ? { ...a, paysInFull: false } : a)) });
    expect(forecast(p).events.some((e) => e.sourceId === "card")).toBe(false);
  });

  it("skips old-style card payment bills once a card is set up, so nothing is counted twice", () => {
    const p = base({ recurringBills: [{ id: "cp", name: "Amex payment", category: "card_payment", cadence: "monthly", dayOfMonth: 22, amountCents: -75_000, amountSpreadCents: 0, essential: true }] });
    expect(forecast(p).events.filter((e) => e.sourceId === "cp")).toHaveLength(0);
    // Without a card account it's still a bill.
    expect(forecast({ ...p, accounts: [p.accounts[0]] }).events.filter((e) => e.sourceId === "cp").length).toBeGreaterThan(0);
  });

  it("finds the next due date, this month or next", () => {
    expect(nextDueDate("2026-11-13", 22)).toBe("2026-11-22");
    expect(nextDueDate("2026-11-13", 5)).toBe("2026-12-05");
    expect(nextDueDate("2026-01-30", 31)).toBe("2026-01-31");
    expect(nextDueDate("2026-02-10", 31)).toBe("2026-02-28");
    expect(nextDueDate("2026-11-13")).toBe("2026-12-04");
  });
});

describe("everyday spending from transactions", () => {
  const tx = (id: string, accountId: string, postedDate: string, amountCents: number, extra: Partial<Transaction> = {}): Transaction => ({ id, accountId, postedDate, amountCents, merchant: id, category: "", ...extra });

  it("counts card and debit purchases once, never the card payment, bills or income", () => {
    const p = base({
      transactions: [
        tx("groceries-card", "card", "2026-11-10", -6_000),
        tx("coffee-debit", "chk", "2026-11-11", -500),
        tx("card-payment", "chk", "2026-11-12", -6_000, { isInternalTransfer: true }), // pays for the groceries: not spending again
        tx("rent", "chk", "2026-11-01", -200_000, { recurringBillId: "rent" }), // forecast as a bill
        tx("paycheck", "chk", "2026-11-06", 250_000),
        tx("refund", "card", "2026-11-08", 1_500),
        tx("too-old", "card", "2026-09-01", -9_999),
      ],
    });
    // $60 + $5 = $65 in 8 weeks.
    const s = everydaySpending(p, 8);
    expect(s.counted).toBe(2);
    expect(s.weeklyMeanCents).toBe(Math.round(6_500 / 8));
  });
});

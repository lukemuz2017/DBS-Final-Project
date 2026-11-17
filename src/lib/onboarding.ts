// Turns the answers from first-time setup into a Profile the engine can forecast.
// Pure and deterministic (ids come from the caller), so it's easy to test.

import { repeatPayments, type RepeatCadence } from "./edit";
import { estimatedTaxPeriod } from "./engine/taxPeriods";
import { incomeDefaults } from "./engine/rules";
import { addDays, usd } from "./format";
import type { Account, IncomeStream, MoneyRules, Profile, RecurringBill } from "./types";

export type AccountKind = "checking" | "savings" | "retirement" | "credit_card" | "loan";
export type AccountUse = "emergency" | "goals" | "taxes" | "general";

export interface DraftAccount {
  id: string;
  kind: AccountKind;
  institution: string;
  name: string;
  /** What you have (or, for cards and loans, what you owe), as a positive number of cents. */
  amountCents: number;
  /** Savings only. */
  use?: AccountUse;
  /** Credit cards only: payment due day, whether it's paid in full, and (if not) the extra paid down each month. */
  dueDay?: number;
  paysInFull?: boolean;
  paydownCents?: number;
}

export interface DraftPayment {
  id: string;
  client: string;
  date: string;
  amountCents: number;
  taxWithheld: boolean;
}

export interface DraftBill {
  id: string;
  name: string;
  amountCents: number; // positive
  dayOfMonth: number;
  category: RecurringBill["category"];
}

export interface OnboardingDraft {
  name: string;
  occupation: string;
  city: string;
  state: string;
  birthYear?: number;
  profileType: "freelance" | "steady";
  predictability: MoneyRules["predictability"];
  clientsPay: MoneyRules["clientsPay"];
  accounts: DraftAccount[];
  /** Freelance: the next payments you expect. */
  payments: DraftPayment[];
  /** Steady: take-home pay. */
  paycheck?: { amountCents: number; cadence: RepeatCadence; next: string };
  bills: DraftBill[];
  weeklySpendCents: number;
  savingsStyle: MoneyRules["savingsStyle"];
  cushionWeeks: MoneyRules["cushionWeeks"];
  runwayTargetWeeks: number;
  taxPct: number;
  minWeeklySpendCents: number;
}

const KIND_TO_ACCOUNT: Record<AccountKind, Pick<Account, "type" | "tier">> = {
  checking: { type: "checking", tier: "operating" },
  savings: { type: "savings", tier: "reserve" },
  retirement: { type: "investment", tier: "long_term" },
  credit_card: { type: "credit_card", tier: "excluded" },
  loan: { type: "loan", tier: "excluded" },
};

export function buildProfile(d: OnboardingDraft, today: string): Profile {
  const rules: MoneyRules = {
    savingsStyle: d.savingsStyle,
    predictability: d.predictability,
    clientsPay: d.profileType === "freelance" ? d.clientsPay : "on_time",
    cushionWeeks: d.cushionWeeks,
    minWeeklySpendCents: d.minWeeklySpendCents,
    dismissedGaps: [],
  };

  const accounts: Account[] = d.accounts.map((a) => ({
    id: a.id,
    institution: a.institution.trim(),
    name: a.name.trim() || { checking: "Checking", savings: "Savings", retirement: "Retirement", credit_card: "Credit card", loan: "Loan" }[a.kind],
    mask: "",
    ...KIND_TO_ACCOUNT[a.kind],
    balanceCents: a.kind === "credit_card" || a.kind === "loan" ? -a.amountCents : a.amountCents,
    balanceAsOf: `${today}T12:00:00Z`,
    purpose: a.kind === "savings" && (a.use === "emergency" || a.use === "goals") ? a.use : undefined,
    ...(a.kind === "credit_card" ? { paymentDueDay: a.dueDay || undefined, paysInFull: a.paysInFull !== false } : {}),
  }));
  const taxAccount = d.accounts.find((a) => a.kind === "savings" && a.use === "taxes");

  // Defaults for income come from the money rules (how predictable, how late).
  const shell = { rules } as Profile;
  const { confidence, spreadPct, lateDays } = incomeDefaults(shell);

  let incomeStreams: IncomeStream[] = [];
  if (d.profileType === "freelance") {
    const byClient = new Map<string, DraftPayment[]>();
    for (const pay of d.payments.filter((x) => x.amountCents > 0 && x.client.trim())) {
      const k = pay.client.trim();
      byClient.set(k, [...(byClient.get(k) ?? []), pay]);
    }
    incomeStreams = [...byClient.entries()].map(([client, pays]) => {
      const avg = Math.round(pays.reduce((s, x) => s + x.amountCents, 0) / pays.length);
      return {
        id: `inc-${pays[0].id}`,
        name: client,
        kind: "freelance_client",
        cadence: "irregular",
        confidence,
        amountSpreadCents: Math.round((avg * spreadPct) / 100),
        taxWithheld: pays.every((x) => x.taxWithheld),
        payments: pays
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .map((x) => ({ expectedDate: x.date, amountCents: x.amountCents, latestDate: lateDays > 0 ? addDays(x.date, lateDays) : undefined })),
        summary: pays.length === 1 ? `${usd(pays[0].amountCents)} expected` : `${pays.length} payments expected`,
      };
    });
  } else if (d.paycheck && d.paycheck.amountCents > 0) {
    const pc = d.paycheck;
    incomeStreams = [
      {
        id: "inc-paycheck",
        name: "Paycheck",
        kind: "salary",
        cadence: pc.cadence,
        confidence: "certain",
        amountSpreadCents: 0,
        taxWithheld: true,
        payments: repeatPayments(pc.cadence, pc.next, pc.amountCents, 0, today),
        summary: `${usd(pc.amountCents)} ${{ weekly: "every week", biweekly: "every other week", monthly: "every month" }[pc.cadence]}, after tax`,
      },
    ];
  }

  const recurringBills: RecurringBill[] = d.bills
    .filter((b) => b.amountCents > 0 && b.name.trim() && b.category !== "card_payment")
    .map((b) => ({
      id: b.id,
      name: b.name.trim(),
      category: b.category,
      cadence: "monthly" as const,
      dayOfMonth: Math.min(31, Math.max(1, Math.round(b.dayOfMonth))),
      amountCents: -b.amountCents,
      amountSpreadCents: 0,
      essential: b.category !== "subscriptions",
    }));
  // A card carrying a balance: the extra paid down each month is a debt payment from
  // checking. (Its new purchases are already in everyday spending.)
  for (const a of d.accounts) {
    if (a.kind !== "credit_card" || a.paysInFull !== false || !a.paydownCents) continue;
    recurringBills.push({
      id: `paydown-${a.id}`,
      name: `${a.institution.trim() || "Card"} paydown`,
      category: "debt",
      cadence: "monthly",
      dayOfMonth: a.dueDay || 1,
      amountCents: -a.paydownCents,
      amountSpreadCents: 0,
      essential: true,
    });
  }

  const period = estimatedTaxPeriod(today);
  return {
    slug: "me",
    name: d.name.trim(),
    initials: d.name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "ME",
    role: d.occupation.trim(),
    city: d.city.trim(),
    neighborhood: d.state.trim(),
    blurb: "",
    profileType: d.profileType,
    today,
    runwayTargetWeeks: d.runwayTargetWeeks,
    rangeConfidence: d.predictability === "feast_famine" ? 90 : 80,
    birthYear: d.birthYear,
    rules,
    accounts,
    incomeStreams,
    recurringBills,
    plannedEvents: [],
    spending: { weeklyMeanCents: d.weeklySpendCents, weeklySdCents: Math.round(d.weeklySpendCents * 0.3) },
    tax:
      d.profileType === "freelance"
        ? {
            setAsidePct: d.taxPct,
            receivedThisPeriodCents: 0,
            periodLabel: period.periodLabel,
            periodEnd: period.periodEnd,
            dueDate: period.dueDate,
            reserveAccountId: taxAccount?.id,
            note: "Federal (and state, if your state has income tax) estimated tax for this period. The set-aside rate is a rule of thumb; your real bill depends on your full-year income.",
          }
        : undefined,
    goals: [],
    transactions: [],
  };
}

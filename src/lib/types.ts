// Shapes mirror the tables in docs/data-model.html so the demo data can move
// into Supabase later without changing the engine or the UI.
// Money is always integer cents. Positive = money in, negative = money out.
// Dates are "YYYY-MM-DD" strings in the user's time zone.

export type ProfileType = "freelance" | "student" | "steady";
export type Confidence = "certain" | "likely" | "uncertain";
export type Tier = "operating" | "reserve" | "long_term" | "excluded";

export interface Account {
  id: string;
  institution: string;
  name: string;
  mask: string;
  type: "checking" | "savings" | "credit_card" | "investment" | "loan";
  tier: Tier;
  balanceCents: number; // credit cards negative (owed)
  balanceAsOf: string; // ISO timestamp
  connectedAt?: string; // set when added through the (demo) connect flow
}

/** One expected payment from an income stream. */
export interface ExpectedPayment {
  label?: string;
  expectedDate: string;
  earliestDate?: string; // defaults to expectedDate
  latestDate?: string; // defaults to expectedDate
  amountCents: number;
  confidence?: Confidence; // overrides the stream's confidence
}

export interface IncomeStream {
  id: string;
  name: string;
  kind: "salary" | "freelance_client" | "stipend" | "loan_refund" | "bonus" | "other";
  cadence: "weekly" | "biweekly" | "semimonthly" | "monthly" | "per_term" | "irregular";
  confidence: Confidence;
  amountSpreadCents: number; // typical deviation per payment
  payDelayNote?: string; // plain-language note, e.g. "usually pays 2–4 weeks late"
  taxWithheld: boolean;
  payments: ExpectedPayment[]; // expanded schedule within the forecast horizon
  summary: string; // one line for the UI, e.g. "$2,180 every other Friday"
}

export interface RecurringBill {
  id: string;
  name: string;
  category: "housing" | "utilities" | "insurance" | "debt" | "subscriptions" | "transport" | "card_payment" | "transfer" | "health" | "business";
  cadence: "weekly" | "biweekly" | "monthly" | "bimonthly";
  amountCents: number; // negative
  amountSpreadCents: number;
  /** For monthly bills: day of month. For weekly/biweekly: first date. */
  dayOfMonth?: number;
  firstDate?: string;
  /** Internal transfer to another of the user's accounts (e.g. savings). */
  toAccountId?: string;
  essential: boolean; // counts toward "runway if income stopped"
}

export interface PlannedEvent {
  id: string;
  name: string;
  kind: "tuition" | "purchase" | "travel" | "tax_payment" | "income_one_off" | "deposit" | "gift" | "other";
  amountCents: number; // signed
  dueDate: string;
}

export interface Goal {
  id: string;
  name: string;
  kind: "emergency_fund" | "home_down_payment" | "car" | "education" | "debt_payoff" | "travel" | "other";
  targetCents: number;
  targetDate: string;
  savedCents: number;
  monthlyContributionCents: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  postedDate: string;
  amountCents: number;
  merchant: string;
  category: string;
  isInternalTransfer?: boolean;
  incomeStreamId?: string;
}

export interface TaxSetup {
  setAsidePct: number; // e.g. 30 = 30%
  /** Untaxed income already received in the current estimated-tax period. */
  receivedThisPeriodCents: number;
  periodLabel: string; // "Sep 1 – Dec 31, 2026"
  periodEnd: string; // "2026-12-31": income expected up to here also counts
  dueDate: string; // "2027-01-15"
  reserveAccountId?: string; // where the set-aside money sits
  note: string;
}

export interface Profile {
  slug: ProfileType;
  name: string;
  initials: string;
  role: string;
  city: string;
  neighborhood: string;
  blurb: string;
  profileType: ProfileType;
  today: string;
  runwayTargetWeeks: number;
  rangeConfidence: 80 | 90;
  accounts: Account[];
  incomeStreams: IncomeStream[];
  recurringBills: RecurringBill[];
  plannedEvents: PlannedEvent[];
  /** Day-to-day debit spending not captured by bills (groceries, coffee, rides). */
  spending: { weeklyMeanCents: number; weeklySdCents: number };
  tax?: TaxSetup;
  goals: Goal[];
  transactions: Transaction[];
  history?: { label: string; date: string }[];
}

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
  /** Savings only: what the account is for. Tax savings is set in the tax settings instead. */
  purpose?: "emergency" | "goals";
  /** Credit cards: day of the month the payment is due. */
  paymentDueDay?: number;
  /**
   * Credit cards: true (default) if you pay the full balance each month, so what you owe
   * today is one payment out of checking on the due date. False if you carry a balance:
   * add your extra paydown as a monthly "Loan payment" bill instead.
   */
  paysInFull?: boolean;
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
  /** Savings account the money for this goal goes to. */
  accountId?: string;
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
  /** Set when the transaction is a recurring bill (rent, phone): bills are forecast separately. */
  recurringBillId?: string;
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
  /** Demo persona slug, or "me" for a signed-in user. */
  slug: string;
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
  retirement?: RetirementSetup;
  studentLoans?: StudentLoanSetup;
  /** For the long-term retirement outlook. */
  birthYear?: number;
  /** The user's money rules (savings style, cushion, ...). Missing fields use DEFAULT_RULES. */
  rules?: Partial<MoneyRules>;
}

export type SavingsStyle = "safe" | "balanced" | "push";

/** The user's cash-flow policy, set at signup and in Account Details → Money rules. */
export interface MoneyRules {
  savingsStyle: SavingsStyle;
  predictability: "very_steady" | "mostly_steady" | "lumpy" | "feast_famine";
  clientsPay: "on_time" | "1_2_weeks_late" | "3_plus_weeks_late";
  /** Weeks of essentials to keep in checking. */
  cushionWeeks: 0.5 | 1 | 2;
  /** Pay yourself warns below this weekly amount. */
  minWeeklySpendCents: number;
  /** Account suggestions the user dismissed ("I have one" / "Not now"). */
  dismissedGaps: string[];
}

/** One deposit into a retirement account, as the plan provider reports it. */
export interface RetirementContribution {
  date: string;
  amountCents: number;
  source: "you" | "employer";
}

/** Retirement saving. Self-employed people use a SEP IRA or Solo 401(k); employees an employer plan. */
export interface RetirementSetup {
  plan: "sep_ira" | "solo_401k" | "employer_401k" | "none";
  accountId?: string;
  /** Contributed so far this calendar year. */
  ytdContributedCents: number;
  /** Recent deposits (at least the last 12 weeks), from the plan provider. */
  contributions?: RetirementContribution[];
  /** Age you plan to stop working. Defaults to 67. */
  retirementAge?: number;
  // Self-employed
  /** Estimated net self-employment profit for the year (sets the SEP limit). */
  estNetProfitCents?: number;
  /** Share of each after-tax client payment to put toward retirement, e.g. 10. */
  windfallPct?: number;
  // Employer plan
  salaryCents?: number;
  contributionPct?: number;
  /** Employer match: matchRatePct cents per dollar, on contributions up to matchUpToPct of salary. */
  matchRatePct?: number;
  matchUpToPct?: number;
}

/** Student loans: what next term's borrowing costs, and when it can still be undone. */
export interface StudentLoanSetup {
  /** When the refund after the next one is expected (start of the following term). */
  followingRefundDate: string;
  federalRatePct: number; // Direct Unsubsidized, e.g. 8.07
  privateRatePct: number;
  federalPerTermCents: number; // federal share of each term's disbursement
  /** Federal funds returned within 120 days of disbursement cost no interest or fees. */
  nextDisbursementDate: string;
}

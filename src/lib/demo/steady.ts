// Demo persona: post-production coordinator in Koreatown, Los Angeles. Spent
// about three years on gig work (delivery driving, freelance video editing) and
// went salaried in July 2026. Still picks up the odd editing job. All data is invented.

import type { Profile } from "../types";
import { buildHistory, monthly } from "./history";

const TODAY = "2026-11-13";

export const steady: Profile = {
  slug: "steady",
  name: "Sam Okafor",
  initials: "SO",
  role: "Post-production coordinator",
  city: "Los Angeles",
  neighborhood: "Koreatown",
  blurb:
    "Three years of delivery driving and freelance editing, then a full-time studio job in July. Paychecks are regular now, so the focus has shifted from surviving the month to building savings and paying off the card from the gig years.",
  profileType: "steady",
  today: TODAY,
  runwayTargetWeeks: 17,
  rangeConfidence: 80,

  accounts: [
    { id: "o-chk", institution: "Wells Fargo", name: "Everyday Checking", mask: "6403", type: "checking", tier: "operating", balanceCents: 390_000, balanceAsOf: "2026-11-13T07:45:00Z" },
    { id: "o-sav", institution: "SoFi", name: "Savings", mask: "2118", type: "savings", tier: "reserve", balanceCents: 680_000, balanceAsOf: "2026-11-13T06:10:00Z" },
    { id: "o-401k", institution: "Fidelity", name: "401(k)", mask: "9921", type: "investment", tier: "long_term", balanceCents: 290_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "o-auto", institution: "Honda Financial", name: "Auto loan", mask: "7731", type: "loan", tier: "excluded", balanceCents: -1_480_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "o-stl", institution: "Nelnet", name: "Federal student loans", mask: "0458", type: "loan", tier: "excluded", balanceCents: -2_260_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "o-card", institution: "Capital One", name: "Quicksilver", mask: "5521", type: "credit_card", tier: "excluded", balanceCents: -340_000, balanceAsOf: "2026-11-13T07:45:00Z" },
  ],

  incomeStreams: [
    {
      id: "o-pay",
      name: "Paycheck: Lumen Street Studios",
      kind: "salary",
      cadence: "biweekly",
      confidence: "certain",
      amountSpreadCents: 0,
      taxWithheld: true,
      payments: ["2026-11-20", "2026-12-04", "2026-12-18", "2026-12-31", "2027-01-15", "2027-01-29"].map((d) => ({
        expectedDate: d,
        amountCents: 235_000,
        label: d === "2026-12-31" ? "Paycheck (early, Jan 1 holiday)" : undefined,
      })),
      summary: "$2,350 every other Friday, after tax, 401(k) and health",
    },
    {
      id: "o-side",
      name: "Freelance editing",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "uncertain",
      amountSpreadCents: 20_000,
      payDelayNote: "Occasional jobs from old gig clients. Not counted until confirmed.",
      taxWithheld: false,
      payments: [{ label: "Editing job: music video (pitched)", expectedDate: "2026-12-15", earliestDate: "2026-12-10", latestDate: "2026-12-30", amountCents: 60_000 }],
      summary: "Occasional editing jobs, $400–800 each",
    },
  ],

  recurringBills: [
    { id: "o-rent", name: "Rent: 1BR, Koreatown", category: "housing", cadence: "monthly", dayOfMonth: 1, amountCents: -205_000, amountSpreadCents: 0, essential: true },
    { id: "o-ins", name: "Progressive car insurance", category: "insurance", cadence: "monthly", dayOfMonth: 3, amountCents: -21_500, amountSpreadCents: 0, essential: true },
    { id: "o-socal", name: "SoCalGas", category: "utilities", cadence: "monthly", dayOfMonth: 6, amountCents: -3_500, amountSpreadCents: 1_000, essential: true },
    { id: "o-gym", name: "Crunch Fitness", category: "subscriptions", cadence: "monthly", dayOfMonth: 7, amountCents: -3_000, amountSpreadCents: 0, essential: false },
    { id: "o-car", name: "Honda Financial (car loan)", category: "debt", cadence: "monthly", dayOfMonth: 12, amountCents: -38_500, amountSpreadCents: 0, essential: true },
    { id: "o-spectrum", name: "Spectrum internet", category: "utilities", cadence: "monthly", dayOfMonth: 12, amountCents: -6_500, amountSpreadCents: 0, essential: true },
    { id: "o-tmobile", name: "T-Mobile", category: "utilities", cadence: "monthly", dayOfMonth: 17, amountCents: -5_500, amountSpreadCents: 0, essential: true },
    { id: "o-nelnet", name: "Nelnet student loan", category: "debt", cadence: "monthly", dayOfMonth: 20, amountCents: -29_000, amountSpreadCents: 0, essential: true },
    { id: "o-ladwp", name: "LADWP (water + power)", category: "utilities", cadence: "bimonthly", firstDate: "2026-11-24", dayOfMonth: 24, amountCents: -11_000, amountSpreadCents: 2_500, essential: true },
    { id: "o-cardpay", name: "Capital One payment", category: "card_payment", cadence: "monthly", dayOfMonth: 26, amountCents: -65_000, amountSpreadCents: 15_000, essential: true },
    { id: "o-save", name: "Auto-transfer to SoFi Savings", category: "transfer", cadence: "biweekly", firstDate: "2026-11-20", amountCents: -20_000, amountSpreadCents: 0, toAccountId: "o-sav", essential: false },
  ],

  plannedEvents: [
    { id: "o-gifts", name: "Holiday gifts", kind: "gift", amountCents: -35_000, dueDate: "2026-12-13" },
    { id: "o-flight", name: "Flight home to Houston", kind: "travel", amountCents: -52_000, dueDate: "2026-12-21" },
    { id: "o-dmv", name: "Car registration renewal (DMV)", kind: "other", amountCents: -42_500, dueDate: "2027-01-22" },
  ],

  spending: { weeklyMeanCents: 12_000, weeklySdCents: 5_000 },

  goals: [
    { id: "o-g1", name: "Emergency fund: 4 months of costs", kind: "emergency_fund", targetCents: 1_800_000, targetDate: "2027-09-30", savedCents: 680_000, monthlyContributionCents: 43_300 },
    { id: "o-g2", name: "Pay off the Capital One card", kind: "debt_payoff", targetCents: 520_000, targetDate: "2027-05-31", savedCents: 180_000, monthlyContributionCents: 25_000 },
    { id: "o-g3", name: "Condo down payment", kind: "home_down_payment", targetCents: 4_000_000, targetDate: "2030-12-31", savedCents: 0, monthlyContributionCents: 0 },
  ],

  retirement: {
    plan: "employer_401k",
    accountId: "o-401k",
    ytdContributedCents: 105_000, // 3% since starting in July
    salaryCents: 7_800_000,
    contributionPct: 3,
    matchRatePct: 50,
    matchUpToPct: 6,
  },

  history: [
    { label: "Gig work: delivery driving + freelance editing", date: "2023-06-01" },
    { label: "Started full-time at Lumen Street Studios", date: "2026-07-13" },
    { label: "Switched Runway to the steady view", date: "2026-10-09" },
  ],

  transactions: buildHistory({
    seed: 37,
    today: TODAY,
    days: 60,
    fixed: [
      ...["2026-09-25", "2026-10-09", "2026-10-23", "2026-11-06"].map((d) => ({ accountId: "o-chk", postedDate: d, amountCents: 235_000, merchant: "Lumen Street Studios payroll", category: "Paycheck", incomeStreamId: "o-pay" })),
      ...["2026-09-25", "2026-10-09", "2026-10-23", "2026-11-06"].map((d) => ({ accountId: "o-chk", postedDate: d, amountCents: -20_000, merchant: "Transfer to SoFi Savings", category: "Transfer", isInternalTransfer: true })),
      { accountId: "o-chk", postedDate: "2026-10-14", amountCents: 45_000, merchant: "Venmo: R. Castillo (edit)", category: "Side income", incomeStreamId: "o-side" },
      ...monthly({ accountId: "o-chk", amountCents: -205_000, merchant: "Rent: Wilshire Park Apartments", category: "Rent" }, 1, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "o-chk", amountCents: -21_500, merchant: "Progressive", category: "Car insurance" }, 3, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "o-chk", amountCents: -38_500, merchant: "Honda Financial Services", category: "Car loan" }, 12, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "o-chk", amountCents: -29_000, merchant: "Nelnet", category: "Student loan" }, 20, ["2026-09", "2026-10"]),
      ...monthly({ accountId: "o-chk", amountCents: -5_500, merchant: "T-Mobile", category: "Phone" }, 17, ["2026-09", "2026-10"]),
      { accountId: "o-chk", postedDate: "2026-09-24", amountCents: -10_400, merchant: "LADWP", category: "Utilities" },
      { accountId: "o-chk", postedDate: "2026-09-26", amountCents: -62_000, merchant: "Capital One payment", category: "Card payment", isInternalTransfer: true },
      { accountId: "o-chk", postedDate: "2026-10-26", amountCents: -70_000, merchant: "Capital One payment", category: "Card payment", isInternalTransfer: true },
    ],
    spend: [
      { merchant: "H Mart", category: "Groceries", accountId: "o-chk", minCents: 2_200, maxCents: 6_800, perWeek: 1.1 },
      { merchant: "Chevron", category: "Gas", accountId: "o-chk", minCents: 4_200, maxCents: 6_900, perWeek: 0.9 },
      { merchant: "Tacos Leo", category: "Food", accountId: "o-chk", minCents: 900, maxCents: 2_100, perWeek: 1.2 },
      { merchant: "Alfred Coffee", category: "Coffee", accountId: "o-chk", minCents: 550, maxCents: 900, perWeek: 1.5 },
    ],
  }),
};

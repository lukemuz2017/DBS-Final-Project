// Demo persona: first-year full-time MBA student at Chicago Booth, living in the
// South Loop. Lives on quarterly loan refunds (what's left after tuition), a small
// course-assistant paycheck, and pre-MBA savings. All data is invented.

import type { Profile } from "../types";
import { buildHistory, monthly } from "./history";

const TODAY = "2026-11-13";
const months = ["2026-09", "2026-10", "2026-11"];

export const student: Profile = {
  slug: "student",
  name: "Priya Shah",
  initials: "PS",
  role: "First-year MBA, Chicago Booth",
  city: "Chicago",
  neighborhood: "South Loop",
  blurb:
    "Left a consulting job to start at Booth in September. Tuition is paid straight from loans each quarter; what's left over lands in checking and has to last until the next quarter.",
  profileType: "student",
  today: TODAY,
  runwayTargetWeeks: 17,
  rangeConfidence: 80,

  accounts: [
    { id: "s-chk", institution: "Chase", name: "Total Checking", mask: "4821", type: "checking", tier: "operating", balanceCents: 690_000, balanceAsOf: "2026-11-13T07:12:00Z" },
    { id: "s-sav", institution: "Ally", name: "Online Savings", mask: "0937", type: "savings", tier: "reserve", balanceCents: 1_150_000, balanceAsOf: "2026-11-13T06:40:00Z" },
    { id: "s-roth", institution: "Fidelity", name: "Roth IRA", mask: "3306", type: "investment", tier: "long_term", balanceCents: 3_120_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "s-fed", institution: "MOHELA", name: "Federal Direct Unsubsidized loan", mask: "2210", type: "loan", tier: "excluded", balanceCents: -683_300, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "s-priv", institution: "Sallie Mae", name: "Private graduate loan", mask: "8846", type: "loan", tier: "excluded", balanceCents: -3_526_700, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "s-card", institution: "Chase", name: "Sapphire Preferred", mask: "7710", type: "credit_card", tier: "excluded", balanceCents: -124_000, balanceAsOf: "2026-11-13T07:12:00Z", paymentDueDay: 24, paysInFull: true },
  ],

  incomeStreams: [
    {
      id: "s-refund",
      name: "Winter-quarter loan refund",
      kind: "loan_refund",
      cadence: "per_term",
      confidence: "certain",
      amountSpreadCents: 0,
      payDelayNote: "Disbursed to Booth before the quarter starts; the leftover after tuition usually reaches checking 3–8 days later.",
      taxWithheld: true,
      payments: [{ label: "Winter-quarter loan refund", expectedDate: "2027-01-07", earliestDate: "2027-01-06", latestDate: "2027-01-12", amountCents: 1_420_000 }],
      summary: "≈ $14,200 per quarter, after tuition (federal Direct Unsubsidized + private loans)",
    },
    {
      id: "s-ca",
      name: "Course assistant pay",
      kind: "other",
      cadence: "biweekly",
      confidence: "likely",
      amountSpreadCents: 4_000,
      taxWithheld: true,
      payments: [
        { expectedDate: "2026-11-20", amountCents: 41_000 },
        { expectedDate: "2026-12-04", amountCents: 41_000 },
        { expectedDate: "2026-12-18", amountCents: 41_000, label: "Course assistant pay (last of Autumn)" },
        { expectedDate: "2027-01-15", amountCents: 41_000, confidence: "uncertain", label: "Course assistant pay (Winter role not confirmed)" },
        { expectedDate: "2027-01-29", amountCents: 41_000, confidence: "uncertain", label: "Course assistant pay (Winter role not confirmed)" },
      ],
      summary: "$410 every other Friday while the Autumn course runs",
    },
  ],

  recurringBills: [
    { id: "s-rent", name: "Rent: 1BR, South Loop", category: "housing", cadence: "monthly", dayOfMonth: 1, amountCents: -235_000, amountSpreadCents: 0, essential: true },
    { id: "s-ventra", name: "Ventra 30-day pass", category: "transport", cadence: "monthly", dayOfMonth: 1, amountCents: -7_500, amountSpreadCents: 0, essential: true },
    { id: "s-lemonade", name: "Lemonade renters insurance", category: "insurance", cadence: "monthly", dayOfMonth: 5, amountCents: -1_200, amountSpreadCents: 0, essential: true },
    { id: "s-xfinity", name: "Xfinity internet", category: "phone", cadence: "monthly", dayOfMonth: 9, amountCents: -6_000, amountSpreadCents: 0, essential: true },
    { id: "s-spotify", name: "Spotify", category: "subscriptions", cadence: "monthly", dayOfMonth: 11, amountCents: -1_200, amountSpreadCents: 0, essential: false },
    { id: "s-verizon", name: "Verizon", category: "phone", cadence: "monthly", dayOfMonth: 14, amountCents: -6_500, amountSpreadCents: 0, essential: true },
    { id: "s-comed", name: "ComEd electric", category: "utilities", cadence: "monthly", dayOfMonth: 18, amountCents: -6_500, amountSpreadCents: 1_500, essential: true },
    { id: "s-gas", name: "Peoples Gas", category: "utilities", cadence: "monthly", dayOfMonth: 22, amountCents: -8_500, amountSpreadCents: 3_000, essential: true },
  ],

  plannedEvents: [
    { id: "s-gifts", name: "Holiday gifts", kind: "gift", amountCents: -30_000, dueDate: "2026-12-12" },
    { id: "s-flight", name: "Flight home to San Francisco", kind: "travel", amountCents: -48_000, dueDate: "2026-12-17" },
    { id: "s-trek", name: "Japan Trek deposit", kind: "deposit", amountCents: -120_000, dueDate: "2027-01-05" },
    { id: "s-books", name: "Winter-quarter case packs", kind: "purchase", amountCents: -18_000, dueDate: "2027-01-06" },
  ],

  // Everything she buys, debit or Sapphire (about $950/month goes on the card).
  spending: { weeklyMeanCents: 34_000, weeklySdCents: 9_000 },

  goals: [
    { id: "s-g1", name: "Cushion for the summer internship gap", kind: "emergency_fund", targetCents: 400_000, targetDate: "2027-06-15", savedCents: 0, monthlyContributionCents: 60_000 },
    { id: "s-g2", name: "Japan Trek (spring break)", kind: "travel", targetCents: 380_000, targetDate: "2027-03-15", savedCents: 120_000, monthlyContributionCents: 90_000 },
  ],

  studentLoans: {
    followingRefundDate: "2027-03-30", // spring quarter refund
    federalRatePct: 8.07, // 2026-27 graduate Direct Unsubsidized
    privateRatePct: 9.25, // illustrative fixed private rate
    federalPerTermCents: 683_300, // $20,500 a year over three quarters
    nextDisbursementDate: "2027-01-07",
  },

  history: [
    { label: "Left consulting job", date: "2026-08-14" },
    { label: "Started at Booth (Autumn quarter)", date: "2026-09-28" },
  ],

  transactions: buildHistory({
    seed: 11,
    today: TODAY,
    days: 60,
    fixed: [
      { accountId: "s-chk", postedDate: "2026-09-25", amountCents: 1_420_000, merchant: "UChicago Student Account refund", category: "Loan refund", incomeStreamId: "s-refund" },
      { accountId: "s-chk", postedDate: "2026-10-09", amountCents: 41_000, merchant: "University of Chicago payroll", category: "Paycheck", incomeStreamId: "s-ca" },
      { accountId: "s-chk", postedDate: "2026-10-23", amountCents: 41_000, merchant: "University of Chicago payroll", category: "Paycheck", incomeStreamId: "s-ca" },
      { accountId: "s-chk", postedDate: "2026-11-06", amountCents: 41_000, merchant: "University of Chicago payroll", category: "Paycheck", incomeStreamId: "s-ca" },
      ...monthly({ accountId: "s-chk", amountCents: -235_000, merchant: "Rent: Southbank Apartments", category: "Rent" }, 1, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "s-chk", amountCents: -7_500, merchant: "Ventra", category: "Transit" }, 1, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "s-chk", amountCents: -6_000, merchant: "Xfinity", category: "Internet" }, 9, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "s-chk", amountCents: -6_500, merchant: "Verizon", category: "Phone" }, 14, months.slice(0, 2)),
      ...monthly({ accountId: "s-chk", amountCents: -5_800, merchant: "ComEd", category: "Utilities" }, 18, months.slice(0, 2)),
      ...monthly({ accountId: "s-chk", amountCents: -4_200, merchant: "Peoples Gas", category: "Utilities" }, 22, months.slice(0, 2)),
      { accountId: "s-chk", postedDate: "2026-09-24", amountCents: -61_200, merchant: "Chase Sapphire payment", category: "Card payment", isInternalTransfer: true },
      { accountId: "s-chk", postedDate: "2026-10-24", amountCents: -88_400, merchant: "Chase Sapphire payment", category: "Card payment", isInternalTransfer: true },
      { accountId: "s-chk", postedDate: "2026-10-02", amountCents: -60_000, merchant: "Booth Halloween party & Kilts tickets", category: "Social" },
      { accountId: "s-chk", postedDate: "2026-11-04", amountCents: -21_900, merchant: "Suitsupply", category: "Recruiting" },
    ],
    spend: [
      { merchant: "Mariano's", category: "Groceries", accountId: "s-chk", minCents: 2_400, maxCents: 7_800, perWeek: 1.2 },
      { merchant: "Starbucks, Harper Center", category: "Coffee", accountId: "s-chk", minCents: 550, maxCents: 950, perWeek: 2.5 },
      { merchant: "Uber", category: "Rides", accountId: "s-chk", minCents: 1_400, maxCents: 3_600, perWeek: 0.8 },
      { merchant: "Jewel-Osco", category: "Groceries", accountId: "s-chk", minCents: 1_800, maxCents: 4_500, perWeek: 0.6 },
    ],
  }),
};

// Demo persona: freelance photographer in Crown Heights, Brooklyn. Weddings
// carry May–October; winter is holiday mini-sessions, brand and editorial work,
// slow-paying invoices, and the January estimated-tax bill. All data is invented.

import type { Profile } from "../types";
import { buildHistory, monthly } from "./history";

const TODAY = "2026-11-13";

export const freelance: Profile = {
  slug: "freelance",
  name: "Jordan Ellis",
  initials: "JE",
  role: "Freelance photographer",
  city: "New York",
  neighborhood: "Crown Heights, Brooklyn",
  blurb:
    "Weddings from May to October, brand and editorial shoots year-round. Wedding season just ended, so the winter runs on smaller jobs and invoices that pay when they pay.",
  profileType: "freelance",
  today: TODAY,
  runwayTargetWeeks: 17,
  rangeConfidence: 80,

  accounts: [
    { id: "f-chk", institution: "Chase", name: "Total Checking", mask: "2290", type: "checking", tier: "operating", balanceCents: 760_000, balanceAsOf: "2026-11-13T08:02:00Z" },
    { id: "f-tax", institution: "Marcus", name: "Tax savings", mask: "5512", type: "savings", tier: "reserve", balanceCents: 480_000, balanceAsOf: "2026-11-13T05:30:00Z" },
    { id: "f-emg", institution: "Ally", name: "Emergency fund", mask: "8834", type: "savings", tier: "reserve", balanceCents: 320_000, balanceAsOf: "2026-11-09T05:30:00Z" },
    { id: "f-sep", institution: "Fidelity", name: "SEP IRA", mask: "7140", type: "investment", tier: "long_term", balanceCents: 1_460_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "f-bh", institution: "B&H Payboo", name: "Gear financing", mask: "6620", type: "loan", tier: "excluded", balanceCents: -189_000, balanceAsOf: "2026-11-12T22:00:00Z" },
    { id: "f-card", institution: "Amex", name: "Blue Business Cash", mask: "1007", type: "credit_card", tier: "excluded", balanceCents: -88_000, balanceAsOf: "2026-11-13T08:02:00Z" },
  ],

  incomeStreams: [
    {
      id: "f-minis",
      name: "Holiday mini-sessions",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "certain",
      amountSpreadCents: 15_000,
      taxWithheld: false,
      payments: [
        { label: "Mini-sessions, Prospect Park (Nov 22)", expectedDate: "2026-11-23", amountCents: 90_000 },
        { label: "Mini-sessions, Fort Greene (Nov 29)", expectedDate: "2026-11-30", amountCents: 75_000 },
        { label: "Mini-sessions, studio (Dec 6)", expectedDate: "2026-12-07", amountCents: 75_000 },
      ],
      summary: "Family portrait mini-sessions, paid at booking: three weekends",
    },
    {
      id: "f-corner",
      name: "Corner & Co.",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "likely",
      amountSpreadCents: 0,
      payDelayNote: "Net-45 invoice sent Nov 10 for the holiday campaign. Usually pays 1–3 weeks late.",
      taxWithheld: false,
      payments: [{ label: "Corner & Co. holiday campaign", expectedDate: "2027-01-06", earliestDate: "2026-12-29", latestDate: "2027-01-23", amountCents: 450_000 }],
      summary: "$4,500 brand campaign, invoiced net-45",
    },
    {
      id: "f-halden",
      name: "Halden Magazine",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "likely",
      amountSpreadCents: 15_000,
      payDelayNote: "Pays net-30, often a week or two late.",
      taxWithheld: false,
      payments: [
        { label: "Halden Magazine (October feature)", expectedDate: "2026-12-02", earliestDate: "2026-11-30", latestDate: "2026-12-16", amountCents: 180_000 },
        { label: "Halden Magazine (January issue)", expectedDate: "2027-01-20", earliestDate: "2027-01-15", latestDate: "2027-02-05", amountCents: 140_000 },
      ],
      summary: "Editorial assignments, $1,400–1,800 each",
    },
    {
      id: "f-lindell",
      name: "Lindell Coffee",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "likely",
      amountSpreadCents: 0,
      payDelayNote: "Spring lookbook shoot booked for Jan 14; 50% deposit, balance on delivery.",
      taxWithheld: false,
      payments: [
        { label: "Lindell Coffee lookbook (deposit)", expectedDate: "2027-01-08", earliestDate: "2027-01-06", latestDate: "2027-01-15", amountCents: 140_000 },
        { label: "Lindell Coffee lookbook (balance)", expectedDate: "2027-01-29", earliestDate: "2027-01-26", latestDate: "2027-02-12", amountCents: 140_000 },
      ],
      summary: "$2,800 spring lookbook, half up front",
    },
    {
      id: "f-brightline",
      name: "Wedding retainers",
      kind: "freelance_client",
      cadence: "irregular",
      confidence: "likely",
      amountSpreadCents: 30_000,
      payDelayNote: "Couples who got engaged over the holidays book in January. One signed contract so far; a second is a maybe.",
      taxWithheld: false,
      payments: [
        { label: "2027 wedding retainer (Nguyen–Brooks)", expectedDate: "2027-01-12", earliestDate: "2027-01-08", latestDate: "2027-01-20", amountCents: 150_000 },
        { label: "2027 wedding retainer (inquiry)", expectedDate: "2027-01-26", earliestDate: "2027-01-19", latestDate: "2027-02-16", amountCents: 150_000, confidence: "uncertain" },
      ],
      summary: "2027 wedding retainers, $1,200–1,800 each",
    },
    {
      id: "f-stock",
      name: "Stocksy licensing",
      kind: "freelance_client",
      cadence: "monthly",
      confidence: "likely",
      amountSpreadCents: 6_000,
      taxWithheld: false,
      payments: [
        { expectedDate: "2026-12-15", amountCents: 14_000 },
        { expectedDate: "2027-01-15", amountCents: 14_000 },
      ],
      summary: "Stock licensing royalties, about $140 a month",
    },
  ],

  recurringBills: [
    { id: "f-rent", name: "Rent: 1BR, Crown Heights", category: "housing", cadence: "monthly", dayOfMonth: 1, amountCents: -285_000, amountSpreadCents: 0, essential: true },
    { id: "f-health", name: "NY State of Health (Silver plan)", category: "health", cadence: "monthly", dayOfMonth: 1, amountCents: -68_000, amountSpreadCents: 0, essential: true },
    { id: "f-omny", name: "OMNY transit", category: "transport", cadence: "monthly", dayOfMonth: 1, amountCents: -13_200, amountSpreadCents: 0, essential: true },
    { id: "f-gearins", name: "Gear insurance (Hill & Usher)", category: "business", cadence: "monthly", dayOfMonth: 3, amountCents: -4_500, amountSpreadCents: 0, essential: true },
    { id: "f-studio", name: "Studio share, Gowanus", category: "business", cadence: "monthly", dayOfMonth: 5, amountCents: -40_000, amountSpreadCents: 0, essential: true },
    { id: "f-spectrum", name: "Spectrum internet", category: "utilities", cadence: "monthly", dayOfMonth: 8, amountCents: -7_000, amountSpreadCents: 0, essential: true },
    { id: "f-adobe", name: "Adobe Creative Cloud", category: "business", cadence: "monthly", dayOfMonth: 10, amountCents: -7_000, amountSpreadCents: 0, essential: true },
    { id: "f-bh", name: "B&H gear financing", category: "debt", cadence: "monthly", dayOfMonth: 12, amountCents: -21_000, amountSpreadCents: 0, essential: true },
    { id: "f-coned", name: "Con Edison", category: "utilities", cadence: "monthly", dayOfMonth: 16, amountCents: -9_500, amountSpreadCents: 2_000, essential: true },
    { id: "f-pixieset", name: "Pixieset + website", category: "business", cadence: "monthly", dayOfMonth: 18, amountCents: -2_600, amountSpreadCents: 0, essential: false },
    { id: "f-visible", name: "Visible phone", category: "utilities", cadence: "monthly", dayOfMonth: 20, amountCents: -4_500, amountSpreadCents: 0, essential: true },
    { id: "f-amex", name: "Amex payment", category: "card_payment", cadence: "monthly", dayOfMonth: 22, amountCents: -75_000, amountSpreadCents: 15_000, essential: true },
  ],

  plannedEvents: [
    { id: "f-gear", name: "Batteries, cards & backup drive", kind: "purchase", amountCents: -26_000, dueDate: "2026-12-03" },
    { id: "f-flight", name: "Flights home to Phoenix", kind: "travel", amountCents: -42_000, dueDate: "2026-12-20" },
  ],

  spending: { weeklyMeanCents: 15_000, weeklySdCents: 7_000 },

  tax: {
    setAsidePct: 30,
    receivedThisPeriodCents: 1_442_000,
    periodLabel: "Sep 1 – Dec 31, 2026",
    periodEnd: "2026-12-31",
    dueDate: "2027-01-15",
    reserveAccountId: "f-tax",
    note: "Federal, New York State and NYC estimated tax for Q4 2026 (IRS Form 1040-ES and NY IT-2105), all due Jan 15. 30% of untaxed income is a common rule of thumb for NYC freelancers; your actual bill depends on your full-year income.",
  },

  goals: [
    { id: "f-g1", name: "Emergency fund: 4 months of costs", kind: "emergency_fund", targetCents: 1_800_000, targetDate: "2027-10-31", savedCents: 320_000, monthlyContributionCents: 80_000 },
    { id: "f-g2", name: "Replace the Z6 II body", kind: "other", targetCents: 250_000, targetDate: "2027-04-30", savedCents: 0, monthlyContributionCents: 0 },
  ],

  retirement: {
    plan: "sep_ira",
    accountId: "f-sep",
    ytdContributedCents: 300_000,
    estNetProfitCents: 6_800_000, // about $68k net profit for 2026
    windfallPct: 10,
  },

  history: [
    { label: "Went full-time freelance", date: "2023-03-01" },
    { label: "Wedding season ended", date: "2026-10-24" },
  ],

  transactions: buildHistory({
    seed: 23,
    today: TODAY,
    days: 60,
    fixed: [
      { accountId: "f-chk", postedDate: "2026-09-21", amountCents: 310_000, merchant: "Stripe: Okoye–Lin wedding (final)", category: "Client payment", incomeStreamId: "f-brightline" },
      { accountId: "f-chk", postedDate: "2026-10-06", amountCents: 280_000, merchant: "Stripe: Ramos wedding (final)", category: "Client payment", incomeStreamId: "f-brightline" },
      { accountId: "f-chk", postedDate: "2026-10-19", amountCents: 180_000, merchant: "Halden Media LLC", category: "Client payment", incomeStreamId: "f-halden" },
      { accountId: "f-chk", postedDate: "2026-10-27", amountCents: 260_000, merchant: "Stripe: Park–Adeyemi wedding (final)", category: "Client payment", incomeStreamId: "f-brightline" },
      { accountId: "f-chk", postedDate: "2026-11-09", amountCents: 60_000, merchant: "Pixieset: mini-session deposits", category: "Client payment", incomeStreamId: "f-minis" },
      ...monthly({ accountId: "f-chk", amountCents: 13_800, merchant: "Stocksy United", category: "Royalties", incomeStreamId: "f-stock" }, 15, ["2026-09", "2026-10"]),
      { accountId: "f-chk", postedDate: "2026-09-22", amountCents: -93_000, merchant: "Transfer to Marcus Tax savings", category: "Transfer", isInternalTransfer: true },
      { accountId: "f-chk", postedDate: "2026-10-07", amountCents: -84_000, merchant: "Transfer to Marcus Tax savings", category: "Transfer", isInternalTransfer: true },
      { accountId: "f-chk", postedDate: "2026-10-28", amountCents: -78_000, merchant: "Transfer to Marcus Tax savings", category: "Transfer", isInternalTransfer: true },
      { accountId: "f-chk", postedDate: "2026-09-15", amountCents: -310_000, merchant: "IRS + NY DTF: Q3 estimated tax", category: "Taxes" },
      ...monthly({ accountId: "f-chk", amountCents: -285_000, merchant: "Rent: Bedford Ave LLC", category: "Rent" }, 1, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "f-chk", amountCents: -68_000, merchant: "NY State of Health: Fidelis Care", category: "Health insurance" }, 1, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "f-chk", amountCents: -40_000, merchant: "Gowanus Light Studio share", category: "Studio" }, 5, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "f-chk", amountCents: -7_000, merchant: "Adobe", category: "Software" }, 10, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "f-chk", amountCents: -21_000, merchant: "B&H Payboo financing", category: "Gear" }, 12, ["2026-10", "2026-11"]),
      ...monthly({ accountId: "f-chk", amountCents: -8_100, merchant: "Con Edison", category: "Utilities" }, 16, ["2026-09", "2026-10"]),
      { accountId: "f-chk", postedDate: "2026-10-22", amountCents: -112_000, merchant: "Amex payment", category: "Card payment", isInternalTransfer: true },
      { accountId: "f-chk", postedDate: "2026-09-22", amountCents: -96_000, merchant: "Amex payment", category: "Card payment", isInternalTransfer: true },
    ],
    spend: [
      { merchant: "Key Food", category: "Groceries", accountId: "f-chk", minCents: 1_800, maxCents: 6_500, perWeek: 1.4 },
      { merchant: "Breukelen Coffee House", category: "Coffee", accountId: "f-chk", minCents: 500, maxCents: 1_100, perWeek: 2.8 },
      { merchant: "Lyft", category: "Rides", accountId: "f-chk", minCents: 1_600, maxCents: 4_200, perWeek: 0.7 },
      { merchant: "Bodega", category: "Food", accountId: "f-chk", minCents: 600, maxCents: 1_800, perWeek: 2 },
    ],
  }),
};

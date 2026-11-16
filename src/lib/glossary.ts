// Plain-language explanations shown in hover pop-ups. One place, so the
// wording stays consistent and is easy to edit.

export const GLOSSARY = {
  cashToday: {
    title: "Cash today",
    body: "Checking plus any savings marked as a buffer. Investments, retirement accounts and credit cards aren't counted, because you can't (or shouldn't) spend them this week.",
  },
  runway: {
    title: "Cash Runway",
    body: "How many weeks your cash would last if no more money came in. It divides cash today by your weekly burn: essential bills plus typical everyday spending. The target comes from your profile; the usual advice is 3–6 months.",
  },
  burn: {
    title: "Weekly burn",
    body: "Essential bills averaged per week, plus your usual everyday spending. Things marked non-essential (like a gym membership) and transfers to your own savings aren't included.",
  },
  nextIn: {
    title: "Next money in",
    body: "The next payment Runway expects in the likely case. Income you've marked “not counted yet” is skipped until it's confirmed.",
  },
  nextBill: {
    title: "Next big bill",
    body: "The next bill or planned expense over $500. Moving money to your own savings doesn't count as a bill.",
  },
  lowestAhead: {
    title: "Lowest checking balance ahead",
    body: "The lowest your checking account gets in the next 12 weeks if everything arrives on time at the expected amount. Savings isn't included, because bills come out of checking.",
  },
  likely: {
    title: "Likely case",
    body: "Everything arrives on its expected date at its expected amount. Income marked “not counted yet” is left out.",
  },
  cautious: {
    title: "Cautious case",
    body: "A careful “if things go a bit wrong” view, not the worst case: income comes at its latest likely date and at the low end, maybe-income isn't counted, bills run high, and spending runs above average.",
  },
  good: {
    title: "Good case",
    body: "Things go a bit right: income comes early and at the high end, maybe-income is counted, and bills and spending run low.",
  },
  range: {
    title: "The range",
    body: "From the cautious case to the good case. It widens the further out you look, and it's wider when your income is less predictable.",
  },
  otherExpenses: {
    title: "Other expenses (est.)",
    body: "Everything that isn't a scheduled bill or plan: groceries, coffee, rides, and other day-to-day spending. It's this week's total, estimated from your recent spending, and runs higher in the cautious case.",
  },
  forecastHelp: {
    title: "Reading the Cash Forecast",
    body: "Each tile is one week: T+1W is next week, T+12W is twelve weeks out. The number is the lowest your balance gets that week, in the likely case. A dot means the week needs attention; hover it for what to do, or click it for the full breakdown. In the chart, the line is the likely case and the shaded band runs from a cautious case (income late, bills high) to a good case.",
  },
  goalsHelp: {
    title: "Reading Goals",
    body: "For each goal: will you reach it by your date at the monthly amount you're putting in now? If not, it shows when you would, and how much per month would get you there on time.",
  },
  whyPinches: {
    title: "Why it pinches",
    body: "Loans pay tuition first, and only the leftover reaches you, once a quarter. The weeks before each refund are the tightest of the term, especially over winter break.",
  },
  scopeChecking: {
    title: "Checking only",
    body: "Bills and everyday spending come out of checking, so this view shows when you'd need to move money. A dip that savings can cover is flagged “Move money”.",
  },
  scopeCash: {
    title: "Checking + savings",
    body: "Your whole cash cushion: checking and savings counted together, so moving money between them doesn't change it. Investments and retirement accounts are left out, because selling takes time, values drop, and early withdrawals can cost taxes and penalties.",
  },
  window: {
    title: "Two-week window",
    body: "The lowest checking balance during these two weeks. Big number: likely case. Small numbers: cautious case to good case. The bar shows where the likely case sits, and the thin line marks $0.",
  },
  ok: { title: "On track", body: "Checking stays above about a week of spending, even in the cautious case." },
  tight: { title: "Tight", body: "Checking stays positive, but with less than about a week of spending to spare in the cautious case." },
  short: { title: "Move money", body: "Checking could dip below $0 in the cautious case, but your savings can cover it. Move money over a few days before, and you're fine." },
  shortfall: { title: "Short", body: "Even moving all your savings wouldn't cover the cautious case. Time to shift a planned expense, chase an invoice, or find extra income." },
  certain: { title: "Certain", body: "Counted in every case. Use it for paychecks and refunds that always arrive." },
  likelyIncome: { title: "Likely", body: "Counted in the likely and good cases, and in the cautious case at its latest date and lowest amount." },
  uncertain: { title: "Not counted yet", body: "Only shows up in the good case. A maybe never props up your forecast until you mark it confirmed." },
  noTax: { title: "No tax withheld", body: "Nobody takes tax out of this income, so part of it is owed later. Runway counts it toward your quarterly estimated tax." },
  estimatedTax: {
    title: "Quarterly estimated tax",
    body: "If no employer withholds your tax, the IRS (and most states) expect payments four times a year: Apr 15, Jun 15, Sep 15 and Jan 15. Runway estimates the amount from your set-aside rate.",
  },
  spending: { title: "Spending money", body: "The account bills and day-to-day spending come out of. This is what the 12-week forecast tracks." },
  buffer: { title: "Buffer", body: "Savings you'd move into checking to cover a dip. It's counted in your cash and runway, but not in the checking forecast." },
  longTerm: { title: "Long-term", body: "Investments and retirement accounts. Not counted as cash: selling takes time, the value can drop, and early withdrawals can cost taxes and penalties." },
  notCounted: { title: "Not counted", body: "Credit cards and loans. Card spending shows up in the forecast as your monthly card payment instead." },
  suggestedMove: {
    title: "Suggested move",
    body: "A transfer between your own accounts that keeps checking above $0 in the cautious case. Runway never moves money itself; you make the transfer.",
  },
  onPace: { title: "On pace", body: "Saved so far plus your monthly amount reaches the target by the date you set." },
  behindPace: { title: "Behind pace", body: "At your current monthly amount you'd miss the date. The note shows what it would take per month." },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

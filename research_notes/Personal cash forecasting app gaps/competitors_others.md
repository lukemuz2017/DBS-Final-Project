# Competitors other than Monarch/Copilot: raw notes (researched 2026-11-13)

Legend: Y = has it, P = partial, N = no, ? = unverified. "Vendor" = claim from the company's own marketing.

## PocketSmith
- Pricing (my.pocketsmith.com/plans, fetched 2026-11-13): Free (2 accounts, 6-month forecast); Foundation $14.95/mo or $9.99/mo annual (6 bank connections, 1 country, 10-yr forecast); Flourish $24.95 / $16.66 (18 connections, 30 yr); Fortune $39.95 / $26.66 (unlimited, 60 yr). No AI features on pricing page.
- Forecast = daily projected closing balance per account, built from scheduled "budgets" (https://learn.pocketsmith.com/article/1248-everything-you-need-to-know-about-scenarios-in-pocketsmith). Primary scenario per account; secondary scenarios are additive what-ifs you toggle on/off.
- What-if workflow: add a separate budget per change and compare on forecast graph (https://www.pocketsmith.com/plan-ahead/what-if-scenarios/).
- Minimum balance alerts fire when balance is "predicted to reach, or go below" a minimum; only first alert per month shown; legacy dashboard article (https://learn.pocketsmith.com/article/209-setting-minimum-balance-alerts-for-my-accounts). Newer accounts: Balance alert widget.
- Help category includes "forecast correction events" (adjust forecast to actual), not accuracy tracking.
- Income: deterministic scheduled amounts; no ranges/confidence. No reddit 2025-26 complaints found specifically.
- Target: planners/spreadsheet people, international (NZ company).

## Quicken Simplifi
- Price: $3.99/mo promo vs $6.99/mo list, billed annually (quicken.com, offer to 2026-11-29).
- Projected Cash Flow (https://support.simplifi.quicken.com/en/articles/3357429-using-projected-cash-flow): includes recurring income/bill/subscription reminders, future-dated txns, expected refunds. EXCLUDES Planned Spend items and Savings Goals. Multi-account view under Bills & Income > Cash Flow tab. Marketing: up to 1 year (https://www.quicken.com/features/projected-cashflow).
- Projected low-balance email notifications exist (community thread re incorrect "projected low balance under $500" email: https://community.simplifimoney.com/discussion/15943/incorrect-projected-low-balance-under-500-email-notification-edited).
- Quicken Assist (AI) "keeps an eye on" projected cash flow and flags changes (https://www.quicken.com/products/simplifi-ai-assist/) — no clear affordability Q&A claim.
- Complaints (Simplifi community): variable income not modeled (Airbnb host), users ask for averaging last 3 txns, users create fake weekly recurring txns for groceries etc. ("Cash Flow is DANGEROUS withOUT ALL Planned Spending" https://community.simplifimoney.com/discussion/comment/17618), sync errors break projection (https://community.simplifimoney.com/discussion/12439/...), no projected cash flow report.

## Origin
- Price: $12.99/mo or $99/yr, 7-day trial, no free tier (Rob Berger review updated 2026-11-02, https://robberger.com/origin-review/). Official pricing page 404'd; support pages 403'd to fetcher.
- Forecasting tool = long-horizon net worth projection to life expectancy, life events (retire, house, kids, windfall, equity comp), Monte Carlo success probability (Origin blog 2025-07-05 https://www.useorigin.com/resources/blog/planning-your-future-with-origin-a-guide-to-our-forecasting-tool). Cash flow shown as annual income/expenses. No short-term cash-balance forecast per Berger.
- Sidekick AI advisor answers questions grounded in account data; "SEC-regulated" (vendor). Vendor blog claims forecast + AI for "pressure-testing" and freelancer income projection "based on client patterns" (2026-03-03 blog) — unverified.
- Reddit consensus (secondhand via Gerald, a cash-advance competitor, Aug 2026): good for financially stable users, less useful for tight month-to-month cash flow.

## YNAB
- Backward-looking / zero-based "give every dollar a job". No balance forecast; only scheduled transactions. Old YNAB4 had forecasting; new does not (MSE forum). YNAB itself argues forecasting variable income is the wrong impulse (https://www.ynab.com/slaying-the-variable-income-dragon). ~$109/yr or $14.99/mo (third-party; not verified on ynab.com today).

## Indie / freelancer-specific
- **Cashcast** (https://cashcast.money/) — closest to Runway. Beta ("50+ freelancers"). Free: 90-day forecast, P10/P50/P90 bands from 500 Monte Carlo sims, low balance alerts, "Can I Afford It?" tester. Pro $7.99/mo (365 days, unlimited "Ask Cashcast" AI, SMS cash crunch alerts 14 days ahead). Lifetime $249. Per-client payment pattern detection, AI payment-risk scoring, invoice-to-forecast sync. Bank sync "coming soon" (manual now). No stress tests, transfer suggestions or accuracy tracking mentioned. All vendor claims.
- **SenticMoney** (https://senticmoney.com/blog/budget-app-for-self-employed, 2026-05-27) — feature literally named "Runway": daily safe-to-spend number until next payment. $39/yr, local-only, no bank linking. Name collision risk.
- **SteadyCash** (https://steadycash.app/) — $70 one-time, local/manual, calendar, date balance goes negative, "runway" months indicator, toggle future txns.
- **Cash Flow Calendar** (https://www.cashflowcalendar.app/) — Plaid, calendar of paychecks/bills/future balance.
- **Tiller** — community templates: Cash Flow Forecast (multi-year, annual) and manual Projected Balances sheet (https://community.tiller.com/t/docs-projected-balances-sheet/373).
- **Cleo** — chat "Can I afford X?" based on current balance + bills; Penny Hoarder reviewer: didn't account for quarterly tax set-aside. ~$5.99–14.99/mo (sources conflict).
- **Rocket Money** — no forward balance projection found (only competitor Quicken's claim; unverified).
- **Lili / Found / Hurdlr / Collective** — business banking / bookkeeping / tax buckets; backward-looking P&L and cash flow statements; no personal forward forecast found (searches thin; unverified).
- Small-business tools (Float, Pulse, Cushion, Cash Flow Frog) have what-if scenarios but target businesses/accounting software.

## Not found anywhere
- Cross-bank "move $X from A to B" with target tiers.
- Forecast-vs-actual accuracy tracking shown to user.
- Stale-sync detection surfaced as a forecast-trust signal (Simplifi users complain about exactly this failure).
- Stress tests expressed as "weeks of runway".

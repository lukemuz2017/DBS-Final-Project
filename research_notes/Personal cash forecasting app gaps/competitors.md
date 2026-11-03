# Competitor landscape: personal cash forecasting (as of Nov 2026)

Caveat: 10 quick searches. Many sources are vendor or affiliate content (Quicken, Origin, Gerald). Items marked [unverified] are prior knowledge, not confirmed this session.

## 1. Cash-flow forecasting today
- **PocketSmith**: the strongest forecaster. Calendar-based projections from 6 months up to 30-60 years depending on tier, plus what-if scenarios. It is manual-heavy: the forecast is only as good as the budget events you enter. https://getfinny.app/blog/best-cash-flow-tracking-app-2026 , https://www.quicken.com/blog/?p=9209
- **Simplifi (Quicken)**: "Projected Cash Flow" goes up to 1 year ahead, built from recurring income, bills and reminders. The forums are full of accuracy complaints: wrong bank-reported balances corrupt the projection, planned spending and savings goals are left out, card autopays are missed, and stale updates have led to overdrafts. https://www.quicken.com/features/projected-cashflow , https://community.simplifimoney.com/discussion/12439/incorrect-bank-balance-transaction-sync-completely-screws-up-projected-cash-flow-edited , https://community.simplifimoney.com/discussion/comment/63723
- **Monarch**: a forward balance projection plus a forecasting feature (around April 2026). Users say it does not track projected vs actual well. https://www.thepennyhoarder.com/budgeting/monarch-money-review/ , https://reddit.sentinel-team.org/subreddits/MonarchMoney/snapshots/2026-04-21T16%3A40%3A59.04893Z
- **Origin**: the "Forecasting Tool" and AI Advisor model life events and long-term scenarios. It is an SEC-registered RIA and read-only, so it does not move money. https://support.useorigin.com/hc/en-us/articles/36002288809101-What-is-Origin-s-forecasting-tool-and-how-can-it-help-me , https://robberger.com/origin-review/
- **Copilot, YNAB, Rocket Money, Cleo**: no evidence of a true multi-account balance forecast. YNAB is backward-looking by design (zero-based budgeting, targets) [unverified]. Rocket Money centres on subscription cancellation. Cleo is chat-first and monetised through cash advances. https://getfinny.app/blog/ai-budget-management-tools-2026 , https://dupple.com/learn/best-ai-personal-finance-tools

## 2. Money-movement and sweep recommendations
- **Wealthfront Autopilot ("Self-Driving Money")**: you set a checking ceiling, and any excess (at least $100) moves to cash or investments. It originally monitored only one account. https://thinkadvisor.com/2020/09/02/wealthfronts-new-autopilot-service-more-competitive-with-banks-than-advisors
- **Betterment Two-Way Sweep**: moves money between checking and Cash Reserve in both directions (up to $5k per sweep), but only into cash, not investments. https://www.financial-planning.com/news/building-clients-wealth-by-putting-excess-cash-on-autopilot
- **Neobanks (Chime, Revolut, Monzo)**: rule-based round-ups, percentage-of-paycheck transfers and pots. These are static rules, not forecast-driven. https://www.crediful.com/neobanks
- **Mercury Personal**: no documentation found [unverified].
- Every sweep found is threshold-based within a single provider. None decides from a forecast across banks.

## 3. Scenario and stress testing
- **Retirement planners (ProjectionLab, Boldin)**: Monte Carlo simulation, historical backtests and custom return distributions. They are long-horizon and investment-focused, not month-by-month cash. https://projectionlab.com/monte-carlo , https://www.boldin.com/retirement/understanding-boldins-monte-carlo-simulation-what-it-is-why-it-matters-and-whats-new/
- **Job-loss and runway tools (Risk Runway, QuitSim, FT Income Shock Simulator, StockTrak)**: standalone calculators with manual inputs and no linked accounts. https://www.producthunt.com/products/risk-runway/reviews , https://fintools-site.pages.dev/en/tools/income-shock-survival-simulator , https://learn.stocktrak.com/?p=43869
- **Origin**: offers AI scenario forecasts. Otherwise, no mainstream budget app has a built-in "job loss + market drop" runway test using live linked data.

## 4. Top user complaints
- **Sync breakage**: Plaid drops accounts at some banks, MFA breaks connections (e.g. Venmo), and credit unions disconnect within 48h. https://forums.goodbudget.com/t/trouble-with-plaid/3291 , https://envelopebudgeting.com/articles/budgeting-app-syncing-problems , https://reddit.sentinel-team.org/subreddits/MonarchMoney/snapshots/2026-03-17T15%3A33%3A34.216863Z
- **Bad balances poison forecasts** (see the Simplifi threads above).
- **Miscategorisation**: transfers and card payments show up as income, and users end up recategorising by hand. https://unstar.app/blog/ynab-rocket-money-monarch-everydollar-copilot-budget-apps-ranked-2026
- **Irregular income**: biweekly, semi-monthly and gig pay are handled poorly, and the workaround is to budget the lowest expected month. https://envelopebudgeting.com/articles/budgeting-app-syncing-problems
- **Retention and price**: subscriptions of about $99-150/yr with no free tier (Monarch), and users abandon apps when the manual cleanup piles up. https://www.thepennyhoarder.com/budgeting/monarch-money-review/

## 5. Gaps (opportunities)
- Forecasts are deterministic (built from recurring rules) and come with no **confidence bands**, nothing for variable or irregular income, and no projected-vs-actual feedback loop.
- No forecast checks itself against **sync failures**: there is no stale-data detection or reconciliation before projecting.
- Money-movement advice is single-provider and threshold-based. No app recommends **cross-bank** moves (to avoid overdraft at A or earn yield at B) based on the forecast.
- Stress testing is split in two: retirement Monte Carlo tools, or manual runway calculators. No app combines **linked cash + investments** into a short-horizon "job loss / -30% market / big expense" runway test.
- Explainability: apps rarely say *why* they predict a shortfall.
- Student and irregular-income users are underserved: most tools assume salaried, biweekly pay.

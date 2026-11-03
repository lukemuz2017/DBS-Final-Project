# Bring treasury tools to personal budgets

**Bottom line.** The gap is real and buildable. Budget apps still look mostly backward. Where they forecast, they project recurring bills forward as one fixed line, and that line breaks when bank sync data is stale. No mainstream app combines four things:

1. A forecast that gives a **range** instead of a single line.
2. **Learning from how far past forecasts were off.**
3. **Recommendations to move money between banks**, driven by the forecast.
4. A **short-term stress test** ("lose a client plus a $1,000 repair") run on linked accounts.

All four map directly to corporate treasury practice. Each can be built on free tiers: Plaid sandbox or Teller dev, plus FRED. Each also stays legally safe if the app *recommends* cash moves and the user carries them out, instead of moving money or giving advice about specific securities.

## 1. What today's apps do and don't do

| Capability | Best existing option | Weakness = opportunity |
|---|---|---|
| Cash-flow forecast | **PocketSmith** (6 months to 60 years, what-if scenarios); **Simplifi** projected cash flow (1 year); **Monarch** (forecasting added around April 2026) | Relies on budget events the user enters by hand, or on recurring rules only. No confidence range. No learning from forecast vs. actual. Simplifi users report stale balances breaking projections and leading to overdrafts ([Simplifi forum](https://community.simplifimoney.com/discussion/12439/incorrect-bank-balance-transaction-sync-completely-screws-up-projected-cash-flow-edited)) |
| Advice on where to move money | **Wealthfront Autopilot**, **Betterment Two-Way Sweep** | Fixed threshold rules *inside one provider*. Nothing forecast-driven that works across banks ([ThinkAdvisor](https://thinkadvisor.com/2020/09/02/wealthfronts-new-autopilot-service-more-competitive-with-banks-than-advisors)) |
| Scenario and stress tests | **ProjectionLab**, **Boldin** (Monte Carlo); **Origin** AI scenarios | Retirement over decades, not cash month by month. Runway calculators take numbers typed by hand, not linked accounts ([ProjectionLab](https://projectionlab.com/monte-carlo)) |
| Irregular income | Workarounds ("budget from your lowest month") | Most apps assume a salary paid every two weeks |
| Trust in the data | None | No app flags stale balances or reconciles them before forecasting |

**Top user complaints:**

- **Sync breaks:** accounts drop, two-factor login disconnects them, and credit unions disconnect within 48 hours.
- **Miscategorization:** transfers and card payments get counted as income, and users fix categories by hand.
- **Price and retention:** about $99–150 a year, and people quit once the manual cleanup piles up ([The Penny Hoarder](https://www.thepennyhoarder.com/budgeting/monarch-money-review/)).
- **No explanation:** apps rarely say *why* they predict a shortfall.

## 2. Who needs it

- **37% of US adults** would not cover a $400 emergency with cash, and **59%** had a major unexpected expense last year ([Fed SHED 2025](https://www.federalreserve.gov/newsevents/pressreleases/other20260513a.htm)).
- **Household income and spending each swing about 30% month to month.** 84% of people see income change by more than 5% from one month to the next ([JPMorgan Chase Institute](https://www.jpmorganchase.com/institute/all-topics/household-financial-health/report-weathering-volatility)).
- **20% of adults did gig work in the prior month**, and about a fifth of them as their main job ([Fed SHED](https://www.federalreserve.gov/consumerscommunities/shed.htm)).
- **Sharpest fit:** freelancers, gig and commission workers, and grad students with stipends or TA pay. Their income is lumpy, so "will I be short on the 14th?" is a real weekly question.

## 3. Treasury tools, translated

| Treasury practice | Personal version | Build difficulty |
|---|---|---|
| **Rolling 13-week cash forecast** (weekly receipts minus disbursements) | "Your combined balance, week by week, for the next 3 months" | Medium |
| **Forecast vs. actual variance** | "You've underspent groceries 3 weeks running; forecast adjusted." Show forecast accuracy as a trust score | Medium |
| **Liquidity tiering** | Checking for bills, a high-yield savings reserve, investments for the long term, each with a target | Low |
| **Cash positioning and sweeps** | "Move $1,200 from checking to savings: nothing large is due for 3 weeks." Or "move $300 to checking before rent" | Low to medium |
| **Stress testing** (base, downside and stress cases) | "Lose your biggest client" / "$1,000 car repair" / "rent +10%" / "market −30%" → runway in weeks | Medium |
| **Counterparty risk** | Flag balances above FDIC limits, or exposure to fintech partner banks (the 2024 Synapse collapse) | Low |

JPMorgan Chase Institute already frames household saving as a "[monthly stress test](https://www.jpmorganchase.com/institute/research/household-income-spending/report-weathering-volatility-2-a-monthly-stress-test-to-guide-saving)," so the framing has research support.

## 4. How to build it

**Bank data**

| Option | Free path | Notes |
|---|---|---|
| **Plaid Sandbox** | Free, all features, fake banks (`user_good` / `pass_good`), includes `/transactions/recurring/get` | Best for demos. The new Trial plan gives only **10 free real connections**; Limited Production closed April 2026 ([Plaid](https://support.plaid.com/hc/en-us/articles/39994173227159-What-is-the-Plaid-Trial-plan)) |
| **Teller (development)** | **100 real bank logins, never billed** | Best free route to *real* US accounts. Production requires business verification ([Teller](https://teller.io/docs/guides/environments)) |
| **SimpleFIN Bridge** | $15/year | Users paste a token. Updates once a day. No recurring-detection endpoint, so you build your own |
| **CSV import** | Free | A fallback when sync fails, which users complain about most |

**Open banking:** the CFPB's Section 1033 rule is **blocked by a court and being rewritten** ([Open Banking Tracker](https://openbankingtracker.com/regulation/usa-1033)). There's no free government-mandated bank API, so plan on an aggregator. Put the providers behind one shared interface so you can swap them later.

**Forecasting approach**

- **Recurring streams:** group transactions by merchant, by amount within a tolerance, and by cadence. Plaid treats fewer than 3 occurrences as immature ([Plaid](https://plaid.com/blog/recurring-transactions/)).
- **Leftover spending:** a simple seasonal model (payday and day-of-week effects), shown as a **range**, not a single line.
- **Variance loop:** compare each week's forecast to what actually happened and adjust.
- **Where AI fits:** LLMs alone are mediocre at categorizing transactions. Vendor tests show general LLMs at about 66–73%, and blended rule-plus-ML approaches doing better ([Digits](https://digits.com/downloads/beyond-the-hype-evaluating-llms-vs-digits-agl.pdf)). Use AI for **explanations** ("why will I be short?") and for turning plain-English what-ifs into scenario settings, not for the math itself.

**Data for stress tests:** FRED (free, about 120 requests a minute) for interest rates and inflation. Alpha Vantage (25 requests a day) or Financial Modeling Prep (250 a day, end-of-day prices only) for market prices. Cache prices nightly.

**Stack, all on free tiers:**

- Static frontend, or Next.js, on **Vercel**.
- **Supabase** for authentication and Postgres, and to store transactions and forecasts.
- Server routes that hold Plaid and Teller secrets.
- **Claude API** for explanations.
- **MCP servers:** Plaid's MCP server (it has a sandbox version) and the Supabase MCP server (in read-only mode). **CLI:** the Vercel CLI.

## 5. Legal lines to stay behind

| Safe for a student MVP | Avoid |
|---|---|
| Read-only aggregation; forecasts; *cash-only* suggestions the user carries out ("move $300 to savings") | **Moving money**: that's money transmission, needing state licenses and FinCEN registration, or a partner bank. Synapse shows the risk ([Banking Dive](https://www.bankingdive.com/news/5-lessons-learned-from-synapses-collapse/731543/)) |
| Generic market scenarios ("if stocks drop 30%, your runway is…") | **Personalized advice on specific securities or allocations**: that can make you an investment adviser who must register with the SEC. Origin is registered for exactly this reason |
| An "educational, not financial advice" disclaimer | Automatic sweeps without legal counsel |

## 6. Options to pick from

| Option | What it is | Fits course focus | Risk |
|---|---|---|---|
| **A. "Will I be short?" forecaster** | Link accounts and see a 13-week balance range, with a red flag on shortfall weeks and the reason | **Systems** (sync, recurring detection, background re-forecasting) | Low. Core value; demos well |
| **B. Cash positioning advisor** | Target balances by tier, with "move $X from A to B by date" suggestions across banks | Systems or Design | Low if suggestions only |
| **C. Runway stress tests** | Preset and custom shocks (job loss, repair, market drop) giving weeks of runway | **Design** (clear visualization) or Data viz | Low to medium |
| **D. AI money copilot** | Ask "can I afford a $2k trip in March?" The model calls forecast and scenario tools, and **evals** check its answers against the math | **AI** | Medium. Must keep the numbers out of the model's hands |
| **E. Forecast accuracy score** | A weekly forecast-vs-actual score that shows the forecast getting better | Systems | Low. A unique trust feature |

**A suggested plan for the course timeline:**

- **v1 (Nov 17):** A plus E on Plaid Sandbox, with sign-up, linking multiple fake banks, a 13-week chart and a shortfall flag.
- **v2 (Dec 1):** B plus C, and optionally D, with Teller dev so real users can link real accounts.
- **Leave out:** moving money, security-specific advice, mobile apps and bill pay.

## 7. Questions for your user interviews

The assignment requires at least three. Ask them without describing your app:

1. "Tell me about the last time your bank balance surprised you. What happened, and what did you do?"
2. "How do you decide how much to keep in checking versus savings or investments?"
3. "Walk me through how you know whether you can afford something big a month or two out."
4. "How many accounts or apps do you check to see where you stand? How often?"
5. "If your income dropped next month, how would you figure out how long you'd be okay?"

Listen for: surprise shortfalls, idle cash, juggling several accounts, irregular income, and "I just keep it all in my head."

*Research caveats: this was a 10-minute pass with about 30 web searches. Several sources are vendor or affiliate material. The Fed and JPMorgan figures come from summaries rather than the original PDFs. The legal points are research, not legal advice.*

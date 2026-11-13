# Monarch Money and Copilot Money: raw notes (researched 2026-11-13)

Sources are marked: [P] = primary (company blog, help center, pricing page), [3P] = third party, [AFF] = affiliate review, [COMP] = written by a competitor.

## Monarch Money

### Forecasting (Plus only)
- [P] Launched 2026-04-13. https://www.monarch.com/blog/forecasting
  - "Forecasts in Monarch are modeled projections of your finances across decades." By default the plan runs to age 90.
  - Inputs: take-home income and living expenses, averaged from the last 12 complete months; accounts from net worth; growth and inflation assumptions; life events (child, home, career break, retirement, Social Security, generic income or expense, and a windfall added in June).
  - At launch Monarch said it "doesn't currently provide statistical probabilities."
- [P] Help article "Forecasting in Monarch", updated 2026-11-10, read through the Zendesk API (the HTML page returns 403): https://help.monarch.com/hc/en-us/articles/48344305092244
  - Projects net worth and cash flow **by calendar year**. Built for "directional accuracy, not false precision."
  - Income sources have an owner and can be edited or added to. There is no confidence setting.
  - A shortfall draws money from accounts in a set order. A negative net worth is treated as a "planning signal."
  - Scenarios can be compared side by side.
  - **"Chance of success" (Monte Carlo) is rolling out gradually**, per the 2026-11-10 update. It was announced as planned on 2026-11-02.
  - Web only. No iOS or Android, and no data export.
- [P] 2026-06-16 update added multiple scenarios, custom intervals, windfall events and cash-flow-table drill-ins: https://www.monarch.com/blog/june-product-update
- [P] 2026-07-29 update added side-by-side scenario comparison (web, Plus): https://www.monarch.com/blog/july-product-update
- [P] 2026-08-28 update added early retirement forecasting (listed on /whats-new).
- [P] The Plus launch post (2026-04-20) gives the price as $199/yr, with a 7-day trial. Plus also includes business tracking (P&L by entity and a Schedule C export for freelancers and sole proprietors): https://www.monarch.com/blog/monarch-plus

### Short-term cash flow
- [P] Help article "Cash Flow", updated 2026-11-06, is a **historical** view of income and spending: https://help.monarch.com/hc/en-us/articles/20504904768020-Cash-Flow
- [P] Help article "Tracking Recurring Expenses and Bills", updated 2026-11-11: auto-detects recurring items and shows a monthly list or calendar that you can page through by month. It can track paychecks. One recurring item per merchant. **No balance projection is mentioned.** https://help.monarch.com/hc/en-us/articles/4890751141908
- [P] 2026-11-02: Monarch is rebuilding Recurring "from the ground up" so it detects annual renewals and bills that vary month to month. A beta is coming soon. https://www.monarch.com/blog/october-product-update
- [AFF] Penny Hoarder (updated 2026-06-03) says "In the Core plan, Cash Flow Projection looks a few months ahead based on your recurring bills." **No primary source confirms this. The help center describes Cash Flow as historical.**
- [COMP] Centinel (2026-04-26) says Monarch "does not project your checking account balance day by day." https://www.centinelmoney.com/resources/centinel-vs-monarch-money
- [3P/COMP] Quicken's comparison page says Monarch has "No cash flow projection, just past cash flow tracking."

### AI
- [P] AI Assistant launched in the 2025-12-18 Winter Release. Its examples look backward (why net worth changed, overspending, comparing groceries with last year). "Can you afford a career change?" was given as an example for *Forecasting*, not the assistant. https://www.monarch.com/blog/winter-release
- [P] Help article on AI features, updated 2026-11-04. Example questions are about past and current data, plus debt-versus-house advice. Nothing about forecasts. A "proactive" AI is in early access beta for paid US members. https://help.monarch.com/hc/en-us/articles/16116906962452
- [P] 2026-11-02: proactive "Savings Found" (beta) flags duplicate subscriptions, "savings that could earn more" and mortgage rates.
- [P] 2026-10-21: Monarch MCP connects Monarch data to Claude, ChatGPT and Gemini, with read or read/write access. Plus members get more usage.
- [COMP] Finny (2026-08-19): the assistant "will answer confidently from incomplete data"; bank feeds lag 1 to 3 days. https://getfinny.app/blog/monarch-money-ai-assistant-2026

### Sync
- [P] 2026-06-16: a refresh progress pop-up, plus per-account sync status with failure reasons.

### Pricing
- [P] Core is $14.99/mo or $99.99/yr (pricing page, 2026-11-13). The trial is "first week on us" (7 days). No free tier. A WELCOME code takes 30% off annual Core.
- Plus is $199/yr with no monthly option (primary launch post plus the Penny Hoarder review). One SEO site said $299. Ignore it.
- [P] Company news 2026-10-01: Monarch reached $100M ARR and acqui-hired the HMBradley team (HMBradley was a high-yield savings neobank). This is a possible future move into cash management. That reading is speculation.

### Prior claim to check: "users say it doesn't track projected vs actual well"
- I could not verify this from Reddit, because reddit.com and its mirrors were blocked from this environment.
- The primary docs show that **no projected-vs-actual feature exists at all** in Forecasting. Treat the user-sentiment part of the claim as unverified.

## Copilot Money

- [P] Help article "Cash Flow tab", updated 2026-02-20: "Cash Flow only looks at what happened up until today" and "doesn't take into account any unpaid Recurrings or future transactions." https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview
- [P] Help article "Recurrings tab", dated 2026-09-01: shows paid and still-to-pay recurrings for the current month, plus less frequent future recurrings. https://help.copilot.money/en/articles/9778259-recurrings-tab-overview
- [P] Help article "Dashboard", updated 2026-04-14: a "Free to Spend" view of budget left this month, an Upcoming list of recurrings, and a spending pace line. No balance projection. https://intercom.help/copilotmoney/en/articles/6045480-dashboard-tab-overview
- [P] Savings Goals launched 2025-05-28. AI suggests goals and estimates the time to reach them. Nothing ties goals to a forecast. https://www.copilot.money/dispatch/savings-goals
- [P] Money Assistant beta started 2026-04-16 and went GA on 2026-10-27, **iOS only for now**. It is an agent that cleans up transactions and makes suggestions. Chat examples: credit card optimization and "on track to retire." It asks before acting. https://www.copilot.money/dispatch/meet-your-money-assistant
- [P] MCP shipped 2026-05-15, and a "Copilot Money Connector" shipped 2026-11-03.
- [P] Pricing page (2026-11-13): $9/mo or $109/yr ("instead of $119", limited-time offer). "No tiers, no add-ons, no AI credits." Runs on iPhone, iPad, Mac and Web (web since 2025-12-15). No Android. Low-balance and large-expense alerts. Households are "coming this fall." https://www.copilot.money/pricing
  - [3P] Several 2026 SEO and pricing sites list $13/mo or $95/yr, which looks outdated. They also report a 1-month trial, which I did not verify on the official page.
- [P/3P] A feature-request board reply says forecasting future spending and income "is on our radar." The reply is undated, and the board returned 404 or a DNS error when fetched.

## Other competitor surfaced
- Centinel (centinelmoney.com): day-by-day checking balance forecast over 2 months, with shortfall alerts against a user-set "Floor." Free manual tier; Premium is $69.99/yr. Private beta (2026-11). No ranges or AI mentioned. This overlaps Runway items 1 and 5 at the short horizon.

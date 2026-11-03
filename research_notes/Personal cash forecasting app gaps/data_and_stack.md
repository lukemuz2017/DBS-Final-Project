# Data & stack notes (researched 2026-11-03, quick pass)

## 1. Plaid
- Sandbox is free on every plan and has all features: fake institutions (log in with `user_good`/`pass_good`), transactions, balances, and `/transactions/recurring/get`. Sandbox Items move to ITEM_LOGIN_REQUIRED after 30 days. https://plaid.com/docs/sandbox , https://plaid.com/docs/account/billing
- **Limited Production is closed to new US/CA teams since 2026-04-15.** The "Trial plan" replaced it: 10 free Production Items, then you must pay. Transactions, including Recurring Transactions, is in the Trial plan. https://support.plaid.com/hc/en-us/articles/39994173227159-What-is-the-Plaid-Trial-plan , https://support.plaid.com/hc/en-us/articles/16194695660311-Can-I-use-Plaid-for-free
- Setup is easy (about 1 day): Link SDK, then a server-side public_token -> access_token exchange, then `/transactions/sync`. In production, Recurring Transactions has a subscription price.

## 2. Alternatives
- **Teller**: Its development environment uses **real bank data for free, up to 100 enrollments**. An enrollment is one login and can cover several accounts. Development enrollments do not move to production, and production needs KYB. Best free option for real US accounts. https://teller.io/docs/guides/environments
- **SimpleFIN Bridge**: $1.50/mo or $15/yr for up to 25 institutions and 25 apps. The user pastes a setup token, so your app needs no aggregator contract. Data refreshes about once every 24h. Good for personal use; no recurring-detection endpoint, so you build that yourself. https://bridge.simplefin.org , https://beta-bridge.simplefin.org/
- **MX**: Has a sandbox with test institutions. A third-party report says it allows a very small number of real connections. Not verified in MX's own docs. https://www.quiltt.dev/integrations/account-aggregation/finicity
- **Finicity / Mastercard Open Finance**: Self-serve sandbox ("Test Drive", FinBank test profiles). Production needs a Mastercard contract. https://developer.mastercard.com/open-finance-us/documentation/quick-start-guide/index.md
- **Akoya**: You must request a Data Recipient Hub account. The sandbox only has a mock bank ("Mikomo"). No free real-data path. https://docs.akoya.com/guides/sandbox-overview
- **GoCardless Bank Account Data (Nordigen, EU)**: Reports say **new signups are disabled** and the free tier wound down in 2025, though old docs still say "free". Not verified on GoCardless's own site, and the reporting author sells a competing product. https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d , https://docs.firefly-iii.org/how-to/data-importer/import/gocardless/
- **Recommendation for v1:** Use Plaid Sandbox (or Teller dev) for the demo, and SimpleFIN or Teller dev for the developer's own real accounts. Put them behind a provider interface. Also keep a CSV import fallback.

## 3. CFPB Section 1033 (open banking)
- Finalized Oct 2024. The CFPB reopened it (ANPR Aug 2025, which also asks whether banks may charge fees). A federal court **preliminary injunction** blocks enforcement during reconsideration. The 2026-04-01 compliance date passed without being enforced.
- The CFPB reportedly sent a proposed rule to OIRA and plans full notice-and-comment. **I could not confirm a final new rule as of Nov 2026.** Practical effect: no free mandated bank API, so you still depend on aggregators, and banks (e.g., JPMorgan) are pushing data-access fees.
- https://openbankingtracker.com/regulation/usa-1033 , https://www.americanbanker.com/news/cfpb-revamps-1033-open-banking-rule-with-new-focus-on-fees , https://www.icba.org/w/cfpb-working-on-new-1033-rule , https://www.jdsupra.com/legalnews/reports-suggest-cfpb-plans-full-notice-3592697/

## 4. Market / macro data for stress tests
- **Alpha Vantage** free: 25 req/day, about 5/min. Fine for a few tickers, so cache the results. https://www.macroption.com/alpha-vantage-api-limits/
- **Financial Modeling Prep** free: 250 calls/day, end-of-day data only, non-commercial use, 500MB per 30 days. https://multiples.vc/compare/alpha-vantage-api-alternatives
- **FRED** (rates, CPI): free key, about 120 req/min, returns HTTP 429 when over. Best source for inflation and rate scenarios. https://readme.hex.pm/fred_api_client/0.1.2 , https://fred.stlouisfed.org/docs/api/fred/
- **Yahoo Finance (yfinance)**: Unofficial scraping with no SLA. Rate-limit errors (429) are common; I did not verify the 2026 status. Use only for offline seeding.
- Tip: Pre-fetch nightly into Supabase and run scenarios on the cached series.

## 5. MCP servers / CLIs
- **Plaid**: Plaid launched an MCP server for Claude in 2025 (dashboard/dev tools, OAuth). There is also a local sandbox server, `uvx mcp-server-plaid`, which takes API keys. Community servers exist (ymcrcat, argotdev), but they are unofficial. https://thepaypers.com/payments-general/plaids-mcp-server-integrates-anthropics-ai-assistant-claude--1273446 , https://www.developersdigest.tech/mcp-servers/plaid-sandbox
- **Supabase MCP**: Official `@supabase/mcp-server-supabase`, hosted at mcp.supabase.com with OAuth. Use `read_only=true` against real financial data. https://awesome.ecosyste.ms/projects/github.com%2Fsupabase-community%2Fsupabase-mcp
- **Vercel CLI** (`vercel`, `vercel env pull`): The Hobby tier is free for non-commercial use. Keep Plaid/Teller secrets in env vars, and use server routes only.

Caveats: Many limits come from third-party pages, so check the official pricing pages before relying on them.

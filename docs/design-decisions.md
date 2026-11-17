# Runway design decisions

Settled decisions from UI iteration with the user. Read this before changing the dashboard or Account Details. Don't undo a decision here without asking; when the user settles something new, add it here.

## How the user likes to work

- Clean, self-explanatory UI with **minimal text**. No subtitles or explanatory sub-lines under card titles ("Starts at $X in checking", "No employer plan, so you're the employer…"). Explanations go in hover info (`InfoTip` + `src/lib/glossary.ts`), not on the page.
- The user iterates fast with screenshots. Make the change, check it in the browser, report briefly.
- Candid feedback is welcome; give one recommendation rather than a menu.
- Commit and push only when the user says so.

## Vocabulary

- Forecast cases are **Low · Expected · High** everywhere (tiles, table, chart, hovers, engine sentences). Never "cautious / likely / good" for cases. Internally the fields stay `low` / `base` / `high`.
- **"Likely"** is only the income-certainty label (Certain / Likely / Not counted yet). Different concept; keep it.
- "Cash Forecast" and "Goals" are the dashboard tabs. "Account Details" is the setup page (not "Setup", no subtitle).
- "Cash Runway" (not "Runway if income stopped"). "Other expenses (est.)" (not "everyday spend"). "Weekly Transactions" in week details. "Payday Plan" is the freelance payment-split card.
- Week tiles are labeled T+1W … T+12W; hover cards and the chart tooltip show dates only, not T+nW or status words ("Tight", "Below $0").

## Money logic the user decided

- **Tax savings is earmarked.** The account in `tax.reserveAccountId` pays estimated tax first (only the shortfall hits checking), is never offered as a move source for other dips, and is **not counted in Cash Runway**. Cash today shows it as "$X for taxes".
- Suggestions move money from the largest non-tax savings first, into checking.
- Payday Plan order: tax first → buffer (if runway below target) → retirement (if safe in the expected case) → spending (if safe in the low case) → keep.
- Retirement: freelance = SEP / Solo 401(k); steady = employer match; **students get no retirement**.
- Default forecast view is **Checking**; "Checking + savings" is a toggle.

## Layout

- **Header:** hero with the persona's name, "Edit profile", and two stat cards on the right: Cash today and Cash Runway (X of target weeks + meter). No "next bill" / "next income" cards.
- **Cash Forecast tab:** week tiles (hover card after 500 ms, hidden once clicked) → Checking / Checking + savings toggle + Chart / Table toggle → chart. Clicking a week swaps the chart for week details (Back to chart). Suggestions sit behind a "N suggestions" button, not big callouts. Below: freelance → Payday Plan (full width), then Tax + Pay yourself; student → Refund plan + Quarter at a glance; steady → side card.
- **Goals tab:** only goal tracking. Two headed sections: **Retirement** (full-width two-column card) and **Your goals**. No Payday/Tax/Pay-yourself/Refund cards there.
- **Week details:** three neutral tiles (same background; Expected gets a green ring and a larger number; red only for values below $0).
- **Chart:** red-shaded danger zone below $0 with an accented $0 line, date labels every 2 weeks, small dot per week, red markers on flagged weeks, tooltip beside the crosshair and reachable with the mouse.
- **Account Details:** fixed left menu with no sub-lines (Profile & settings, Bank accounts, Income sources, Recurring bills, One-off plans, Upcoming, Recent activity, Your journey). Accounts grouped by type. Recurring-bill categories collapsed by default. Activity groups collapsible by week (month toggle only for Upcoming), net amount only.

## Open items

- Education "moments" (#6): user is torn, discuss before building.
- Seasonality and invoice lateness (#5): deferred; needs an industry field at setup.
- Goals pace doesn't yet check affordability against the 12-week forecast.

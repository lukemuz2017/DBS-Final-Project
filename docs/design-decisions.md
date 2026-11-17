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

- **Tax savings is earmarked.** The account in `tax.reserveAccountId` pays estimated tax first (only the shortfall hits checking), is never offered as a move source for other dips, and is **not counted in Cash Runway or the "Checking + savings" view**. Cash today shows it as "$X for taxes".
- **The dashboard assumes the Payday Plan is followed** (`forecastWithPlan`). Every untaxed payment moves its tax share to tax savings the day it lands, so the tax card shows "$X saved + $Y from upcoming payments"; the plan's buffer, retirement and goal moves are forecast events too. Wherever that matters there's a note: "Assumes you follow the Payday Plan" under the chart and table, a "Payday Plan" tag on those rows in week details, "Payday Plan move, if you follow it" in Upcoming, and a line under the Payday Plan card.
- **One footing for every card: checking.** The Payday Plan judges each step against checking (the account the money leaves), and Pay yourself is the most weekly spending that keeps *checking* above the cushion in the low case; savings is for dips and goals, never for paying yourself. Both look as far as the last client payment the plan splits, and at least four weeks: past the last known payment the forecast only has money going out, which would otherwise block saving for every freelancer.
- **Savings accounts have a purpose:** emergency fund, goals, or general (`accounts.purpose`, set in the account editor). Suggestions draw on the emergency fund first, then general savings, goal savings last, tax savings never. Cash Runway counts all of them except tax savings.
- **Goals are fed by real money.** A goal linked to a savings account (`goal.accountId`) shows that account's balance as saved and, as its monthly amount, what actually flows in (Payday Plan moves averaged over the 12 weeks, plus recurring transfers). Unlinked goals use the amounts typed in, labeled "as you entered".
- Suggestions move money from the largest non-tax savings first, into checking.
- Payday Plan order: tax first → buffer (if runway below target, and checking can spare it in the low case) → retirement (if checking stays above the cushion in the expected case) → **goals** (if checking can spare it in the low case) → spending (if safe in the low case, decided only after every payment's saving steps) → keep. It shows every untaxed payment of $500+ in the 12 weeks, up to five. The goals step funds non-emergency goals up to each month's pace (what's left ÷ months to the target date), once per month, into the goal's `accountId` savings account; the tile is labeled with the goal's name.
- Retirement: freelance = SEP / Solo 401(k); steady = employer match; **students get no retirement**.
- **Students are parked** (`FEATURES.students` in `src/lib/features.ts`, Nov 17, 2026). v1 is for freelance/gig workers and people who move on to a steady paycheck. Priya, the refund plan and "Student" in Edit profile are hidden; the code and its tests stay (tests use `ALL_DEMO_PROFILES`). Flip the flag to bring them back.
- Default forecast view is **Checking**; "Checking + savings" is a toggle.

## Layout

- **Header:** hero with the persona's name, "Edit profile", and two stat cards on the right: Cash today and Cash Runway (X of target weeks + meter). No "next bill" / "next income" cards.
- **Cash Forecast tab:** week tiles (hover card after 500 ms, hidden once clicked) → Checking / Checking + savings toggle + Chart / Table toggle → chart. Clicking a week swaps the chart for week details (Back to chart). Suggestions sit behind a "N suggestions" button, not big callouts. Below: freelance → Payday Plan (full width), then Tax + Pay yourself; student → Refund plan + Quarter at a glance; steady → side card.
- **Goals tab:** only goal tracking. Two headed sections: **Retirement** and **Your goals**. No Payday/Tax/Pay-yourself/Refund cards there. Retirement stays in Goals (no separate tab: students would have an empty one).
- **Retirement card:** one view at a time. Default is the **Long-term outlook** (full-width Low/Expected/High band to age 75 vs a dashed "Need" line, "X% of what you'll need at 67", "Ready around N" chip, "Saving 15%" pill). A "Recent contributions →" link swaps to **this year by quarter** (bars, you + match stacked, current quarter faded as "so far", dashed 15% pace line, average per quarter) beside **To keep pace** suggestions. No limits meter or "room left" tiles; limits, tax savings and deadlines live in hover tips on the plan name and suggestions. Rules of thumb live in `OUTLOOK_RULES` (plan.ts) and the InfoTip: 80% income replacement, Social Security ≈ 40% from 67, 4% withdrawal, 3/5/7% real returns, today's dollars. Long-range dollars round to $1,000.
- **Week details:** three neutral tiles (same background; Expected gets a green ring and a larger number; red only for values below $0).
- **Chart:** red-shaded danger zone below $0 with an accented $0 line, date labels every 2 weeks, small dot per week, red markers on flagged weeks, tooltip beside the crosshair and reachable with the mouse.
- **Account Details:** fixed left menu with no sub-lines (Profile & settings, Bank accounts, Income sources, Recurring bills, One-off plans, Upcoming, Recent activity, Your journey). Accounts grouped by type. Recurring-bill categories collapsed by default. Activity groups collapsible by week (month toggle only for Upcoming), net amount only.

## Open items

- Education "moments" (#6): user is torn, discuss before building.
- Seasonality and invoice lateness (#5): deferred; needs an industry field at setup.
- Goals pace checks affordability only for goals linked to a savings account (through the Payday Plan); unlinked goals still use typed amounts that the forecast doesn't subtract.
- Jordan's checking is $14,600 (after a full wedding season) so the demo shows every Payday Plan step; at $7,600 the honest answer was "keep everything in checking" all winter.

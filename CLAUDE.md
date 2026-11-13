# Runway

A 12-week cash forecast for people with lumpy income (freelancers and students first, steady earners too). It shows a low/base/high range, explains why you'll come up short, puts estimated taxes and tuition on the calendar, and grows into a 1–2 year goal planner. Class project for MPCS 51238 (Design, Build, Ship). v1 ships Nov 17, 2026; v2 at the project fair Dec 1.

- Product: `proposal/v2.html` (the current plan; `proposal/index.html` is the original, leave it alone).
- Data model: `docs/data-model.html`. Read it before touching the schema.
- Research: `research_notes/` and `reports/`. Background only; don't load unless asked.

## Stack

Next.js (App Router, TypeScript) on Vercel · Supabase (Postgres, Auth, row-level security) · Chart.js · Claude API only for the stretch-goal assistant. Bank data sits behind one provider interface: Plaid Sandbox, Teller dev and CSV import come later.

**Current phase: dummy data only.** No bank connections yet; don't add Plaid or Teller code unless the user asks. Seed realistic fake users (a freelancer, a student, a steady earner) through a `fixture` provider that writes into the same `connections` / `accounts` / `transactions` tables a real provider would, so the UI and engine don't change when real banks arrive. Focus is UI/UX and the forecast engine.

## Commands

The app is not scaffolded yet. When it is, list the real commands here (dev, test, lint, typecheck, migrations) and keep this section accurate.

## Rules that keep the numbers right

- **Money is integer cents** (`bigint` in Postgres, `number` holding whole cents in TS). Never floats, never dollars with decimals.
- **Sign convention: positive = money in, negative = money out.** Providers differ (Plaid reports outflows as positive), so normalize inside the provider adapter and nowhere else.
- **The forecast engine is plain, deterministic TypeScript** in its own module with no I/O. Same inputs, same output. The AI never does arithmetic; it calls engine functions and explains their results.
- **Dates:** transaction and forecast dates are `date` in the user's time zone (from `profiles.timezone`); event times are `timestamptz`.
- **Transfers between a user's own accounts and credit-card payments are not income or spending.** Mark them `is_internal_transfer` and exclude them from forecasts.
- Every engine change comes with a test using fixed transaction fixtures and known expected output.

## Rules that keep data safe

- Every table holding user data has `user_id` and RLS policies limiting access to `auth.uid() = user_id`. A new table without RLS is a bug.
- Bank access tokens live only in `connection_secrets`, encrypted, readable only by server code using the service role. Never send them to the browser, log them, or return them from an API route.
- Secrets live in `.env.local` (never committed). Add new variable names, with blank values, to `.env.example`.
- Never log transaction descriptions, amounts or balances. Log IDs and counts.
- Work against the **dev** Supabase project and sandbox data only. Never point tools or scripts at prod.
- Runway never moves money, never recommends specific securities, and gives no tax advice beyond estimated-payment reminders.

## How we work

- One branch per feature; `main` deploys to Vercel, so merge only when tests pass.
- Use plan mode for schema changes and engine design; the user approves before code.
- Before saying something works, run the relevant tests, and for UI changes, check it in the browser.
- Schema changes are Supabase migrations (`supabase migration new`), never ad-hoc SQL against a remote database.

## Lessons (add a line whenever the same mistake happens twice)

- _None yet._

# Runway

A 12-week cash forecast for people with lumpy income (freelancers and students first, steady earners too). It shows a low/base/high range, explains why you'll come up short, puts estimated taxes and tuition on the calendar, and grows into a 1–2 year goal planner. Class project for MPCS 51238 (Design, Build, Ship). v1 ships Nov 17, 2026; v2 at the project fair Dec 1.

- Product: `public/proposal/v2.html` (the current plan; `public/proposal/index.html` is the original, leave it alone).
- Data model: `docs/data-model.html`. Read it before touching the schema.
- **UI decisions:** settled naming, layout and money logic from iteration with the user, plus open items. Imported below so every session has it. Update `docs/design-decisions.md` when the user settles something new.
- Research: `research_notes/` and `reports/`. Background only; don't load unless asked.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4) on Vercel · Supabase (Postgres, Auth, row-level security) · charts are hand-built SVG (`src/components/ForecastChart.tsx`), not Chart.js · Claude API only for the stretch-goal assistant. Bank data sits behind one provider interface: Plaid Sandbox, Teller dev and CSV import come later.

@AGENTS.md

@docs/design-decisions.md

**Current phase: dummy data only.** No bank connections yet; don't add Plaid or Teller code unless the user asks. Demo personas live in code at `src/lib/demo/`: Jordan (freelance photographer, Brooklyn) and Sam (gig worker turned salaried, LA). Priya (Booth MBA student, Chicago) is parked behind `FEATURES.students` in `src/lib/features.ts`: hidden in the app, still covered by tests via `ALL_DEMO_PROFILES`. Their shapes in `src/lib/types.ts` mirror the data model, so a `fixture` provider can later seed them into Supabase without changing the engine or UI. Keep their numbers realistic for their city and situation. Focus is UI/UX and the forecast engine.

**Look and feel:** the proposal page's palette is the baseline (warm paper background, faded green accent, yellow "sun" glow; Fraunces headings, Nunito Sans body). Tokens are in `src/app/globals.css`.

## Commands

- `npm run dev`: dev server on **port 3210** (3000 and 3100 are used by the user's other projects). App is at `/dashboard/<persona>`.
- `npm test` (Vitest): engine tests in `src/lib/engine/*.test.ts`.
- `npm run typecheck` / `npm run lint`.
- `npm run peek`: prints each persona's forecast in the terminal.
- `npx tsx scripts/peek-plan.ts`: prints pay-yourself, payment splits, retirement and refund plans per persona.
- After moving or deleting route files, run `npx next typegen` before `tsc`. Next 16 generates route types into `.next/`.

Layout: `src/lib/engine/forecast.ts` (pure engine) · `src/lib/engine/plan.ts` (pay yourself, payment splits, retirement, refund plan) · `src/lib/engine/goals.ts` · `src/lib/demo/` (personas) · `src/components/` (UI; `forecastPanels.tsx` week tiles/details/goals, `freelanceSection.tsx` Payday Plan/Tax/Pay yourself, `planCards.tsx` retirement/refund plan, `suggestions.tsx` move flows and hover cards) · `src/app/dashboard/[persona]/page.tsx` (dashboard) · `src/lib/supabase/` (clients; not used by the demo yet) · `src/app/api/health` (dev-only Supabase key check).

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

- **To give the user a dev server that stays up, open it in its own window:** `powershell.exe -NoProfile -Command "Start-Process powershell -ArgumentList '-NoExit','-Command','Set-Location C:\users\muzik\projects\final-project; npm.cmd run dev'"`. Use `npm.cmd`, not `npm` (a fresh PowerShell window blocks `npm.ps1` by execution policy). Claude Code's own background servers get stopped when the machine runs low on memory.
- **Start the dev server from PowerShell, not Git Bash.** Launched from a Git Bash background job, Turbopack's CSS worker dies with `0xc0000142` and every page returns 500. Stopping an npm background task can also leave the Next server running on the port: find it by port and stop that PID (only if its command line is this project).
- **Next 16 here has `cacheComponents` and `partialPrefetching` on.** Read `params`/`searchParams` inside `<Suspense>`, list known params with `generateStaticParams`, never export `dynamicParams` (the build fails), and don't call `redirect()` in a page that gets prerendered. Use `redirects()` in `next.config.ts`. Check `node_modules/next/dist/docs/` before guessing.
- **Headless Edge/Chrome won't lay out narrower than about 504px**, even with `--window-size=390`. Test "phone" screenshots at 504px, or the page will look cut off when it isn't.
- **If a style change doesn't show up, restart the dev server.** Turbopack can miss a `globals.css` edit while Vitest is writing its cache, and keep serving the old CSS. Check the served CSS (curl the chunk) before debugging the code.
- **Demo edits live in the browser** (`src/lib/demo/useDemoProfile.ts`, localStorage key `runway-demo-v1:<persona>`). If you change the demo data shape, bump the version so old saved edits are ignored.
- **Don't touch `/` routing for Vercel.** `vercel.json` serves the proposal at `/`, so the app must keep working under `/dashboard`.

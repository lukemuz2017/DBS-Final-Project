"use client";

import { useMemo, useState } from "react";
import { GoalsPanel, WeekDetail, WeekStrip } from "@/components/forecastPanels";
import { RefundPlanCard, RetirementCard } from "@/components/planCards";
import { FreelanceSection } from "@/components/freelanceSection";
import { flaggedRuns, runForWeek, SuggestionsButton, WeekTip } from "@/components/suggestions";
import { ForecastChart } from "@/components/ForecastChart";
import { AppHeader } from "@/components/AppHeader";
import { InfoTip } from "@/components/InfoTip";
import { DemoBanner, useEditor } from "@/components/edit/Editor";
import { PencilIcon } from "@/components/edit/fields";
import {
  HeroStats,
  TaxCard,
  TaxSetupCard,
  TermCard,
} from "@/components/sections";
import { StatusBadge } from "@/components/ui";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import { forecast, type Forecast } from "@/lib/engine/forecast";
import { fmtRange, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { hasStaleAccount } from "@/lib/format";




export function DashboardView({ base, profiles }: { base: Profile; profiles: Profile[] }) {
  const { profile: p, update, reset, edited } = useDemoProfile(base);
  const f = useMemo(() => forecast(p), [p]);
  // Same forecast with savings counted in; transfers between the two cancel out.
  const fCash = useMemo(() => forecast(p, { scope: "cash" }), [p]);
  const { edit, drawerNode } = useEditor(p, update);
  const [view, setView] = useState<"forecast" | "goals">("forecast");
  const [week, setWeek] = useState<number | null>(null);
  const [display, setDisplay] = useState<"chart" | "table">("chart");
  const [scope, setScope] = useState<"checking" | "cash">("checking");
  const fv = scope === "cash" ? fCash : f; // what the Cash Forecast panel shows
  // Suggestions: hover a flagged week for its advice; the header button lists them all.
  const runs = flaggedRuns(fv);

  // The one time-sensitive card for this kind of earner, if any.
  const sideCard =
    p.profileType === "freelance" ? (
      p.tax ? <TaxCard p={p} f={f} onEdit={() => edit({ kind: "profile" })} /> : <TaxSetupCard onEdit={() => edit({ kind: "profile" })} />
    ) : p.tax ? (
      <TaxCard p={p} f={f} onEdit={() => edit({ kind: "profile" })} />
    ) : p.profileType === "student" && p.slug === "student" ? (
      <TermCard f={f} />
    ) : null;
  const first = p.name.split(" ")[0];

  const chartWeeksFor = (fc: Forecast) => fc.weeks.map((w) => ({ index: w.index, label: fmtRange(w.start, w.end), low: w.low, base: w.base, high: w.high, status: w.status }));
  const switcherProfiles = profiles.map((x) => (x.slug === p.slug ? p : x));


  return (
    <>
      <AppHeader profiles={switcherProfiles} active={p.slug} setupAlert={hasStaleAccount(p)} />

      <DemoBanner name={first} edited={edited} onReset={reset} />

      <div className="hero-glow border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6">
          <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,440px)] md:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">{p.role} · {p.neighborhood}, {p.city}</p>
                <button type="button" onClick={() => edit({ kind: "profile" })} className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-0.5 text-xs font-bold text-accent-strong ring-1 ring-line hover:bg-white">
                  <PencilIcon /> Edit profile
                </button>
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{first}&apos;s next 12 weeks</h1>
            </div>
            <HeroStats f={f} />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6 sm:px-6">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Dashboard view" className="inline-flex gap-1 rounded-xl bg-[#f1ece4] p-1">
              {([["forecast", "Cash Forecast"], ["goals", "Goals"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  id={`tab-${k}`}
                  aria-selected={view === k}
                  aria-controls={`panel-${k}`}
                  onClick={() => setView(k)}
                  className={`rounded-lg px-4 py-1.5 font-display text-lg font-bold transition-colors ${view === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>
              <InfoTip term={view === "forecast" ? "forecastHelp" : "goalsHelp"} underline={false}>
                <span aria-label={view === "forecast" ? "How to read the Cash Forecast" : "How to read Goals"} className="grid size-6 place-items-center rounded-full text-muted ring-1 ring-line hover:bg-accent-soft hover:text-accent-strong">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 6.2v3.6M7 4.1v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </span>
              </InfoTip>
            </div>
            {view === "forecast" && <SuggestionsButton f={fv} p={p} />}
          </div>

          {view === "forecast" ? (
            <div role="tabpanel" id="panel-forecast" aria-labelledby="tab-forecast">
              <WeekStrip f={fv} selected={week} onSelect={setWeek} tipFor={(i) => <WeekTip week={fv.weeks[i - 1]} r={runForWeek(runs, i)} onOpen={() => setWeek(i)} />} />
              {/* Chart and table show the same numbers; the toggle swaps one for the other. */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div role="group" aria-label="Which balance to forecast" className="inline-flex gap-0.5 rounded-lg bg-[#f1ece4] p-0.5 text-xs font-bold">
                    {([["checking", "Checking"], ["cash", "Checking + savings"]] as const).map(([k, label]) => (
                      <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={`rounded-md px-3 py-1 transition-colors ${scope === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Show forecast as" className="inline-flex gap-0.5 rounded-lg bg-[#f1ece4] p-0.5 text-xs font-bold">
                  {([["chart", "Chart"], ["table", "Table"]] as const).map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={week === null && display === k} onClick={() => { setDisplay(k); setWeek(null); }} className={`rounded-md px-3 py-1 transition-colors ${week === null && display === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {week !== null ? (
                <WeekDetail f={fv} week={fv.weeks[week - 1]} onClose={() => setWeek(null)} backLabel={display === "chart" ? "Back to chart" : "Back to table"} />
              ) : display === "chart" ? (
                <>
                  {/* On phones the chart keeps a readable size and scrolls sideways inside its card. */}
                  <div className="-mx-1 mt-1 overflow-x-auto px-1">
                    <div className="min-w-[560px]">
                      <ForecastChart weeks={chartWeeksFor(fv)} selected={week} onSelect={setWeek} title={`${first}'s lowest ${scope === "cash" ? "checking + savings" : "checking"} balance each week, ${fmtRange(f.weeks[0].start, f.weeks[11].end)}: expected case with a cautious-to-good range`} />
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-accent" /> <InfoTip term="likely">Expected case</InfoTip></span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm bg-accent/15" /> <InfoTip term="range">Low to high range</InfoTip></span>
                    {fv.weeks.some((w) => w.status === "short") && <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-warn" /> Week that needs a move</span>}
                    {fv.weeks.some((w) => w.status === "shortfall") && <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-warn" /> Week that&apos;s short even with savings</span>}
                  </div>
                </>
              ) : (
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm text-ink">
                    <thead className="text-xs text-muted">
                      <tr><th className="py-2 pr-3">Week</th><th className="pr-3">Dates</th><th className="pr-3 text-right"><InfoTip term="cautious">Low</InfoTip></th><th className="pr-3 text-right"><InfoTip term="likely">Expected</InfoTip></th><th className="pr-3 text-right"><InfoTip term="good">High</InfoTip></th><th className="pr-3 text-right">Ends week at</th><th>Status</th></tr>
                    </thead>
                    <tbody className="tabular">
                      {fv.weeks.map((w) => (
                        <tr key={w.index} onClick={() => setWeek(week === w.index ? null : w.index)} className={`cursor-pointer border-t border-line hover:bg-accent-soft/60 ${week === w.index ? "bg-sun-soft" : ""}`}>
                          <td className="py-2 pr-3 font-bold">T+{w.index}W</td>
                          <td className="pr-3">{fmtRange(w.start, w.end)}</td>
                          <td className={`pr-3 text-right ${w.low < 0 ? "text-warn" : ""}`}>{usd(w.low)}</td>
                          <td className={`pr-3 text-right font-bold ${w.base < 0 ? "text-warn" : ""}`}>{usd(w.base)}</td>
                          <td className="pr-3 text-right">{usd(w.high)}</td>
                          <td className="pr-3 text-right">{usd(w.endBase)}</td>
                          <td><StatusBadge status={w.status} tip={false} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted">Balances are the lowest point in each week, except &ldquo;Ends week at&rdquo;. Click a row for that week&apos;s details.</p>
                </div>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="panel-goals" aria-labelledby="tab-goals">
              <div className="space-y-8">
                {p.profileType !== "student" && p.retirement && (
                  <section>
                    <h3 className="mb-3 font-display text-xl font-bold text-accent-strong">
                      <InfoTip term={p.profileType === "freelance" ? "retirementSelf" : "retirementEmployer"}>Retirement</InfoTip>
                    </h3>
                    <RetirementCard p={p} />
                  </section>
                )}
                <section className={p.profileType !== "student" && p.retirement ? "border-t border-line pt-6" : ""}>
                  <h3 className="mb-3 font-display text-xl font-bold text-accent-strong">Your goals</h3>
                  <GoalsPanel p={p} onEdit={(id) => edit({ kind: "goal", id })} />
                </section>
              </div>
            </div>
          )}
        </section>


        {/* Dashboard = forecast and what to do about it. Accounts, income sources and the
            full bill list live on the Setup page. */}
        {view === "forecast" && p.profileType === "freelance" && (
          <FreelanceSection p={p} f={f} onEditTax={() => edit({ kind: "profile" })} taxFallback={<TaxSetupCard onEdit={() => edit({ kind: "profile" })} />} />
        )}
        {view === "forecast" && p.profileType === "student" && (
          <div className="grid items-start gap-5 md:grid-cols-2">
            <RefundPlanCard p={p} />
            {sideCard}
          </div>
        )}
        {view === "forecast" && p.profileType === "steady" && sideCard && <div className="grid items-start gap-5 md:grid-cols-2">{sideCard}</div>}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">
        Runway · Demo data: these people, accounts and numbers are invented. Edits stay in this browser. Educational project, not financial advice.
      </footer>

      {drawerNode}
    </>
  );
}

"use client";

import { useMemo } from "react";
import { ForecastChart } from "@/components/ForecastChart";
import { AppHeader } from "@/components/AppHeader";
import { InfoTip } from "@/components/InfoTip";
import { DemoBanner, useEditor } from "@/components/edit/Editor";
import { PencilIcon } from "@/components/edit/fields";
import {
  GoalsCard,
  SetupSummaryCard,
  StatTiles,
  TaxCard,
  TaxSetupCard,
  TermCard,
  TransactionsCard,
  UpcomingCard,
  WhyPanels,
  WindowStrip,
} from "@/components/sections";
import { Card, StatusBadge } from "@/components/ui";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import { forecast, type CashEvent, type Forecast, type Status } from "@/lib/engine/forecast";
import { fmtDate, fmtRange, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";

const RANK: Status[] = ["ok", "tight", "short", "shortfall"];

function headline(f: Forecast): string {
  const worst = f.windows.reduce<Status>((s, w) => (RANK.indexOf(w.status) > RANK.indexOf(s) ? w.status : s), "ok");
  const firstFlag = f.windows.find((w) => w.status === worst);
  if (worst === "ok")
    return `On track. Checking stays above ${usd(f.cushion)} for all 12 weeks; the low point is about ${usd(f.lowest.base)} around ${fmtDate(f.lowest.baseDate)}.`;
  if (worst === "tight") return `Positive the whole way, but thin around ${fmtDate(firstFlag!.lowMinDate)}, with less than a week of spending to spare.`;
  const dip = f.windows.find((w) => w.low < 0)!;
  if (worst === "short") return `Checking could dip below $0 around ${fmtDate(dip.lowMinDate)}. Your savings can cover it with one planned transfer.`;
  const lead = f.windows.find((w) => w.reasons && !w.continuesFrom && (w.status === "shortfall" || f.windows.some((x) => x.continuesFrom === w.index && x.status === "shortfall")));
  const waiting = lead?.reasons?.waitingFor?.label;
  return `${waiting ? `If ${waiting} pays late, ` : "In the cautious case, "}checking and savings together could come up short around ${fmtDate(f.windows.find((w) => w.status === "shortfall")!.lowMinDate)}.`;
}


export function DashboardView({ base, profiles }: { base: Profile; profiles: Profile[] }) {
  const { profile: p, update, reset, edited } = useDemoProfile(base);
  const f = useMemo(() => forecast(p), [p]);
  const { edit, drawerNode } = useEditor(p, update);
  const first = p.name.split(" ")[0];

  const chartWeeks = f.weeks.map((w) => ({ index: w.index, label: fmtRange(w.start, w.end), low: w.low, base: w.base, high: w.high, status: w.status }));
  const switcherProfiles = profiles.map((x) => (x.slug === p.slug ? p : x));

  // Clicking an item in "Coming up" opens whatever produced it.
  const editItem = (e: CashEvent) => {
    if (e.kind === "income") edit({ kind: "income", id: e.sourceId });
    else if (e.kind === "bill" || e.kind === "transfer") edit({ kind: "bill", id: e.sourceId });
    else if (e.sourceId === "tax") edit({ kind: "profile" });
    else edit({ kind: "event", id: e.sourceId });
  };

  return (
    <>
      <AppHeader profiles={switcherProfiles} active={p.slug} />

      <DemoBanner name={first} edited={edited} onReset={reset} />

      <div className="hero-glow border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:px-6">
          <div className="grid gap-5 md:grid-cols-[1.6fr_1fr] md:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">{p.role} · {p.neighborhood}, {p.city}</p>
                <button type="button" onClick={() => edit({ kind: "profile" })} className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-0.5 text-xs font-bold text-accent-strong ring-1 ring-line hover:bg-white">
                  <PencilIcon /> Edit profile
                </button>
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{first}&apos;s next 12 weeks</h1>
              <p className="mt-2 max-w-2xl text-lg leading-snug">{headline(f)}</p>
              <p className="mt-2 max-w-2xl text-sm text-muted">{p.blurb}</p>
            </div>
            <div className="card bg-surface/90 p-4">
              <div className="text-xs font-bold text-muted"><InfoTip term="lowestAhead">Lowest checking balance ahead</InfoTip> (<InfoTip term="likely">likely</InfoTip>)</div>
              <div className={`mt-1 text-5xl font-extrabold tracking-tight ${f.lowest.base < 0 ? "text-warn" : ""}`}>{usd(f.lowest.base)}</div>
              <div className="mt-1 text-sm text-muted">around {fmtDate(f.lowest.baseDate)}</div>
              <div className="mt-2 border-t border-line pt-2 text-sm">
                <InfoTip term="cautious">Cautious case</InfoTip>: <strong className="tabular">{usd(f.lowest.low)}</strong> around {fmtDate(f.lowest.lowDate)}
              </div>
            </div>
          </div>
          {/* Key numbers live in the hero so the top of the page answers the main questions. */}
          <div className="mt-5">
            <StatTiles f={f} />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6 sm:px-6">
        <Card title="Next 12 weeks" subtitle={<>Lowest checking balance in each <InfoTip term="window">two-week window</InfoTip>. <InfoTip term="range">The range</InfoTip> runs from a <InfoTip term="cautious">cautious case</InfoTip> to a <InfoTip term="good">good case</InfoTip>.</>}>
          <WindowStrip f={f} />
          {/* On phones the chart keeps a readable size and scrolls sideways inside its card. */}
          <div className="-mx-1 mt-4 overflow-x-auto px-1">
            <div className="min-w-[560px]">
              <ForecastChart weeks={chartWeeks} title={`${first}'s lowest checking balance each week, ${fmtRange(f.weeks[0].start, f.weeks[11].end)}: likely case with a cautious-to-good range`} />
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-accent" /> <InfoTip term="likely">Likely case</InfoTip></span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm bg-accent/15" /> <InfoTip term="range">Cautious to good range</InfoTip></span>
            {f.weeks.some((w) => w.status === "short") && <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-[var(--tight)]" /> Week that needs a move</span>}
            {f.weeks.some((w) => w.status === "shortfall") && <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-warn" /> Week that&apos;s short even with savings</span>}
            <details className="ml-auto open:ml-0 open:basis-full">
              <summary className="cursor-pointer text-right font-bold text-accent-strong">Show as a table</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm text-ink">
                  <thead className="text-xs text-muted">
                    <tr><th className="py-1.5 pr-3">Week</th><th className="pr-3">Dates</th><th className="pr-3 text-right">Cautious</th><th className="pr-3 text-right">Likely</th><th className="pr-3 text-right">Good</th><th>Status</th></tr>
                  </thead>
                  <tbody className="tabular">
                    {f.weeks.map((w) => (
                      <tr key={w.index} className="border-t border-line">
                        <td className="py-1.5 pr-3">{w.index}</td>
                        <td className="pr-3">{fmtRange(w.start, w.end)}</td>
                        <td className="pr-3 text-right">{usd(w.low)}</td>
                        <td className="pr-3 text-right font-bold">{usd(w.base)}</td>
                        <td className="pr-3 text-right">{usd(w.high)}</td>
                        <td><StatusBadge status={w.status} tip={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </Card>

        <WhyPanels f={f} />

        {/* Dashboard = forecast and what to do about it. Accounts, income sources and the
            full bill list live on the Setup page. */}
        <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-5">
            <UpcomingCard p={p} f={f} onEditItem={editItem} onAdd={(k) => edit({ kind: k })} />
            <TransactionsCard p={p} />
          </div>
          <div className="space-y-5">
            {p.profileType === "freelance" && (p.tax ? <TaxCard p={p} f={f} onEdit={() => edit({ kind: "profile" })} /> : <TaxSetupCard onEdit={() => edit({ kind: "profile" })} />)}
            {p.profileType !== "freelance" && p.tax && <TaxCard p={p} f={f} onEdit={() => edit({ kind: "profile" })} />}
            {p.profileType === "student" && p.slug === "student" && <TermCard f={f} />}
            <GoalsCard p={p} onEdit={(id) => edit({ kind: "goal", id })} />
          </div>
          <div className="space-y-5">
            <SetupSummaryCard p={p} />
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">
        Runway · Demo data: these people, accounts and numbers are invented. Edits stay in this browser. Educational project, not financial advice.
      </footer>

      {drawerNode}
    </>
  );
}

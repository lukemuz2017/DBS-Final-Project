"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Check, Segmented } from "@/components/edit/fields";
import { InfoTip } from "@/components/InfoTip";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import { forecast, HORIZON_WEEKS, upcoming } from "@/lib/engine/forecast";
import { addDays, fmtDate, fmtDay, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";

type Grouping = "week" | "month";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function groupKey(date: string, by: Grouping): { key: string; label: string } {
  const d = toDate(date);
  if (by === "month") return { key: date.slice(0, 7), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` };
  const monday = addDays(date, -((d.getUTCDay() + 6) % 7));
  return { key: monday, label: `Week of ${fmtDate(monday)}` };
}

interface Row { id: string; date: string; label: string; amount: number; note?: string; muted?: boolean }

function groupRows(rows: Row[], by: Grouping) {
  const groups: { key: string; label: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const g = groupKey(r.date, by);
    const last = groups[groups.length - 1];
    if (last && last.key === g.key) last.rows.push(r);
    else groups.push({ ...g, rows: [r] });
  }
  return groups;
}

export function ActivityView({ base, profiles, mode }: { base: Profile; profiles: Profile[]; mode: "transactions" | "upcoming" }) {
  const { profile: p } = useDemoProfile(base);
  const [by, setBy] = useState<Grouping>("week");
  const [hideTransfers, setHideTransfers] = useState(false);
  const first = p.name.split(" ")[0];
  const switcherProfiles = profiles.map((x) => (x.slug === p.slug ? p : x));

  const rows: Row[] = useMemo(() => {
    if (mode === "transactions") {
      const accounts = new Map(p.accounts.map((a) => [a.id, `${a.institution} ${a.name}`]));
      return p.transactions
        .filter((t) => !(hideTransfers && t.isInternalTransfer))
        .map((t) => ({
          id: t.id,
          date: t.postedDate,
          label: t.merchant,
          amount: t.amountCents,
          note: `${t.category}${t.isInternalTransfer ? " · transfer between your accounts" : ""} · ${accounts.get(t.accountId) ?? "Account"}`,
          muted: t.isInternalTransfer,
        }));
    }
    const f = forecast(p);
    return upcoming(f, HORIZON_WEEKS * 7)
      .filter((e) => !(hideTransfers && e.kind === "transfer"))
      .map((e) => ({
        id: e.id,
        date: e.date.base,
        label: e.label,
        amount: e.amount.base,
        note:
          e.kind === "income" && e.date.low !== e.date.base
            ? `Income · could slip to ${fmtDate(e.date.low)} in the cautious case`
            : e.kind === "transfer"
              ? "Transfer to your savings"
              : e.kind === "tax"
                ? "Estimated tax"
                : e.kind === "planned"
                  ? "One-off plan"
                  : e.kind === "income"
                    ? "Income"
                    : "Regular bill",
        muted: e.kind === "transfer",
      }));
  }, [p, mode, hideTransfers]);

  const groups = groupRows(rows, by);
  const title = mode === "transactions" ? "All transactions" : "The next 12 weeks, item by item";

  return (
    <>
      <AppHeader profiles={switcherProfiles} active={p.slug} section={mode} />
      <div className="hero-glow border-b border-line">
        <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
          <Link href={`/dashboard/${p.slug}`} className="text-sm font-bold text-accent-strong hover:underline">← {first}&apos;s dashboard</Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "transactions"
              ? "Last 60 days of demo transactions, newest first. Transfers between your own accounts aren't spending, so they're left out of the totals."
              : <>Everything the forecast expects, in the <InfoTip term="likely">likely case</InfoTip>, soonest first. Everyday spending (about {usd(p.spending.weeklyMeanCents)}/week) is spread across the forecast and not listed.</>}
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented label="Group by" value={by} onChange={setBy} options={[{ value: "week", label: "By week" }, { value: "month", label: "By month" }]} />
          <Check checked={hideTransfers} onChange={setHideTransfers}>Hide transfers between my accounts</Check>
        </div>

        {groups.length === 0 && <p className="card p-5 text-sm text-muted">Nothing to show.</p>}
        <div className="space-y-4">
          {groups.map((g) => {
            const counted = g.rows.filter((r) => !r.muted);
            const inflow = counted.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
            const outflow = counted.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
            return (
              <section key={g.key} className="card overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-[#faf6ef] px-5 py-2.5">
                  <h2 className="font-display text-base font-bold">{g.label}</h2>
                  <span className="tabular text-xs text-muted">
                    <span className="font-bold text-accent-strong">{usd(inflow, { sign: true })}</span> in · <span className="font-bold text-ink">{usd(outflow)}</span> out · net <span className="font-bold text-ink">{usd(inflow + outflow, { sign: true })}</span>
                  </span>
                </div>
                <ul className="divide-y divide-line px-5 text-sm">
                  {g.rows.map((r) => (
                    <li key={r.id} className="flex items-baseline justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="inline-block w-24 text-muted">{fmtDay(r.date)}</span>
                        <span className={r.muted ? "text-muted" : "font-bold"}>{r.label}</span>
                        {r.note && <span className="block pl-24 text-xs text-muted">{r.note}</span>}
                      </span>
                      <span className={`tabular shrink-0 ${r.amount > 0 ? "font-bold text-accent-strong" : r.muted ? "text-muted" : "font-bold"}`}>{usd(r.amount, { sign: true })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
      <footer className="mx-auto w-full max-w-4xl px-4 pb-10 text-xs text-muted sm:px-6">Runway · Demo data. Educational project, not financial advice.</footer>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, PlusIcon, Segmented, SmallButton } from "@/components/edit/fields";
import { InfoTip } from "@/components/InfoTip";
import { HORIZON_WEEKS, upcoming, type CashEvent } from "@/lib/engine/forecast";
import { forecastWithPlan } from "@/lib/engine/plan";
import { addDays, fmtDate, fmtDay, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Card } from "./ui";

// Upcoming items (next 12 weeks) or past transactions, grouped by week or month.
// Lives in Account Details; upcoming rows open their editor when clicked.

type Grouping = "week" | "month";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function groupKey(date: string, by: Grouping): { key: string; label: string } {
  const d = toDate(date);
  if (by === "month") return { key: date.slice(0, 7), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` };
  const monday = addDays(date, -((d.getUTCDay() + 6) % 7));
  return { key: monday, label: `Week of ${fmtDate(monday)}` };
}

interface Row { id: string; date: string; label: string; amount: number; note?: string; muted?: boolean; event?: CashEvent }

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

const NOTE: Record<CashEvent["kind"], string> = { income: "Income", bill: "Regular bill", transfer: "Transfer to your savings", planned: "One-off plan", tax: "Estimated tax" };

export function ActivityList({ p, mode, onEditItem, onAdd }: {
  p: Profile;
  mode: "transactions" | "upcoming";
  onEditItem?: (e: CashEvent) => void;
  onAdd?: (what: "event" | "bill" | "income") => void;
}) {
  const [by, setBy] = useState<Grouping>("week");
  const [hideTransfers, setHideTransfers] = useState(false);
  const [adding, setAdding] = useState(false);
  // Groups are collapsible. The first starts open, the rest closed; "toggled" flips that default.
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const flip = (key: string) =>
    setToggled((t) => {
      const n = new Set(t);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

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
    return upcoming(forecastWithPlan(p), HORIZON_WEEKS * 7)
      .filter((e) => !(hideTransfers && e.kind === "transfer"))
      .map((e) => ({
        id: e.id,
        date: e.date.base,
        label: e.label,
        amount: e.amount.base,
        note: e.kind === "income" && e.date.low !== e.date.base ? `Income · could slip to ${fmtDate(e.date.low)} in the low case` : e.fromPlan ? "Payday Plan move, if you follow it" : NOTE[e.kind],
        muted: e.kind === "transfer",
        event: e,
      }));
  }, [p, mode, hideTransfers]);

  const isUpcoming = mode === "upcoming";
  // Recent activity is only ~60 days, so it always groups by week; Upcoming can switch.
  const groups = groupRows(rows, isUpcoming ? by : "week");

  return (
    <Card
      title={isUpcoming ? "Upcoming" : "Recent activity"}
      subtitle={
        isUpcoming ? (
          <>The next 12 weeks in the <InfoTip term="likely">expected case</InfoTip>. Click an item to edit it. Everyday spending (about {usd(p.spending.weeklyMeanCents)}/week) isn&apos;t listed.</>
        ) : (
          "Last 60 days, newest first. Transfers between your own accounts aren't spending, so they're left out of the totals."
        )
      }
      action={
        isUpcoming && onAdd ? (
          <span className="relative">
            <SmallButton onClick={() => setAdding(!adding)} label="Add something upcoming"><PlusIcon /> Add</SmallButton>
            {adding && (
              <span className="absolute right-0 top-full z-30 mt-1 flex w-48 flex-col rounded-xl border border-line bg-surface p-1 shadow-lg">
                {([["event", "One-off plan"], ["bill", "Recurring bill"], ["income", "Income source"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { setAdding(false); onAdd(k); }} className="rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-accent-soft">{label}</button>
                ))}
              </span>
            )}
          </span>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {isUpcoming ? <Segmented label="Group by" value={by} onChange={(v) => { setBy(v); setToggled(new Set()); }} options={[{ value: "week", label: "By week" }, { value: "month", label: "By month" }]} /> : <span />}
        <Check checked={hideTransfers} onChange={setHideTransfers}>Hide transfers between my accounts</Check>
      </div>

      {groups.length === 0 && <p className="text-sm text-muted">Nothing to show.</p>}
      <div className="space-y-3">
        {groups.map((g, gi) => {
          const net = g.rows.filter((r) => !r.muted).reduce((s, r) => s + r.amount, 0);
          const open = (gi === 0) !== toggled.has(g.key);
          return (
            <section key={g.key} className="overflow-hidden rounded-xl ring-1 ring-line">
              <h3>
                <button type="button" onClick={() => flip(g.key)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 bg-[#faf6ef] px-4 py-2 text-left hover:bg-[#f3ede3]">
                  <span className="flex items-center gap-2 font-display text-sm font-bold text-accent-strong">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`transition-transform ${open ? "rotate-90" : ""}`}><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {g.label}
                  </span>
                  <span className={`tabular text-sm font-bold ${net > 0 ? "text-accent-strong" : "text-ink"}`}>{usd(net, { sign: true })}</span>
                </button>
              </h3>
              {open && <ul className="divide-y divide-line text-sm">
                {g.rows.map((r) => {
                  const body = (
                    <>
                      <span className="min-w-0">
                        <span className="inline-block w-24 text-muted">{fmtDay(r.date)}</span>
                        <span className={r.muted ? "text-muted" : "font-bold"}>{r.label}</span>
                        {r.note && <span className="block pl-24 text-xs text-muted">{r.note}</span>}
                      </span>
                      <span className={`tabular shrink-0 ${r.amount > 0 ? "font-bold text-accent-strong" : r.muted ? "text-muted" : "font-bold"}`}>{usd(r.amount, { sign: true })}</span>
                    </>
                  );
                  return (
                    <li key={r.id}>
                      {r.event && onEditItem ? (
                        <button type="button" onClick={() => onEditItem(r.event!)} aria-label={`Edit ${r.label}`} className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent-soft">
                          {body}
                        </button>
                      ) : (
                        <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

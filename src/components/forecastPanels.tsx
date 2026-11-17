"use client";

import type { Forecast, Status, WeekResult } from "@/lib/engine/forecast";
import { goalPace, type GoalPace } from "@/lib/engine/goals";
import { fundedGoals, goalFunding, type GoalFunding } from "@/lib/engine/plan";
import { daysBetween, fmtDate, fmtDay, fmtRange, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { PencilIcon, PlusIcon, SmallButton } from "./edit/fields";
import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";
import { HoverCard, MoveSummary, ReasonItems } from "./suggestions";
import { Chip, Meter, StatusBadge } from "./ui";

// ---------------------------------------------------------------------------
// T+1W … T+12W: one cell per week, click to open that week's details.

const CELL: Record<Status, string> = {
  ok: "border-line bg-surface hover:border-accent/50",
  tight: "border-sun bg-sun-soft/60 hover:border-[var(--tight)]/60",
  short: "border-[var(--tight)]/50 bg-tight-soft/70 hover:border-[var(--tight)]",
  shortfall: "border-warn bg-warn-soft/70 hover:border-warn",
};
const DOT: Record<Status, string> = { ok: "bg-accent", tight: "bg-sun", short: "bg-warn", shortfall: "bg-warn" };

export function WeekStrip({ f, selected, onSelect, tipFor }: { f: Forecast; selected: number | null; onSelect: (i: number | null) => void; tipFor?: (week: number) => ReactNode }) {
  return (
    <div>
      <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12" aria-label="Projected balance by week">
        {f.weeks.map((w) => {
          const on = selected === w.index;
          return (
            <li key={w.index}>
              <HoverCard content={tipFor?.(w.index) ?? null}>
              <button
                type="button"
                onClick={() => onSelect(on ? null : w.index)}
                aria-expanded={on}
                aria-controls="week-detail"
                className={`flex w-full flex-col items-start rounded-xl border px-2 py-2 text-left transition-colors ${CELL[w.status]} ${on ? "ring-2 ring-accent" : ""}`}
              >
                <span className="flex w-full items-center justify-between text-[11px] font-extrabold text-muted">
                  T+{w.index}W
                  {w.status !== "ok" && <span className={`size-2 rounded-full ${DOT[w.status]}`} aria-hidden="true" />}
                </span>
                <span className={`tabular mt-0.5 text-[15px] font-extrabold leading-tight ${w.base < 0 ? "text-warn" : ""}`}>{compact(w.base)}</span>
                <span className="text-[10px] text-muted">{fmtDate(w.end)}</span>
              </button>
              </HoverCard>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** "$6,491" → "$6.5k" only when it would not fit; keeps small numbers exact. */
function compact(cents: number) {
  const d = Math.round(cents / 100);
  const a = Math.abs(d);
  const sign = d < 0 ? "−" : "";
  if (a >= 100_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 10_000) return `${sign}$${(a / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}$${a.toLocaleString("en-US")}`;
}

const KIND_TAG = { income: "Income", bill: "Bill", transfer: "To savings", planned: "Plan", tax: "Tax" } as const;

export function WeekDetail({ f, week, onClose, backLabel = "Close" }: { f: Forecast; week: WeekResult; onClose: () => void; backLabel?: string }) {
  const items = f.events
    .filter((e) => e.included.base && e.date.base >= week.start && e.date.base <= week.end)
    // Checking + savings: moves between counted accounts cancel out (tax savings isn't counted, so set-asides stay).
    .filter((e) => !(f.scope === "cash" && e.toReserve && e.sourceId !== "tax"))
    .sort((a, b) => (a.date.base < b.date.base ? -1 : 1));
  // Income that could land this week only in the low case (it slipped in from earlier).
  const slipping = f.events.filter((e) => e.kind === "income" && e.included.low && e.date.base < week.start && e.date.low >= week.start && e.date.low <= week.end);
  const win = f.windows[Math.ceil(week.index / 2) - 1];
  const lead = win.continuesFrom ? f.windows[win.continuesFrom - 1] : win;
  const startBal = week.index === 1 ? f.startBalance : f.weeks[week.index - 2].endBase;
  const hit = (e: (typeof items)[number]) => e.amount.base + (e.earmarkedCents ?? 0);
  const inflow = items.filter((e) => hit(e) > 0).reduce((s, e) => s + hit(e), 0);
  const outflow = items.filter((e) => hit(e) < 0).reduce((s, e) => s + hit(e), 0);

  return (
    <section id="week-detail" className="mt-1 rounded-2xl border border-line bg-[#fffdf9] p-4 sm:p-5" aria-label={`Week ${week.index} details`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-bold">T+{week.index}W</h3>
          <span className="text-sm text-muted">{fmtRange(week.start, week.end)}</span>
          <StatusBadge status={week.status} />
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-accent-strong hover:bg-accent-soft">← {backLabel}</button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {([["cautious", "Low", week.low], ["likely", "Expected", week.base], ["good", "High", week.high]] as const).map(([term, label, v]) => (
              <div key={label} className={`rounded-xl bg-[#f8f4ee] p-2.5 ${label === "Expected" ? "ring-2 ring-accent/45" : "ring-1 ring-line"}`}>
                <dt className="text-[11px] font-bold text-accent-strong"><InfoTip term={term}>{label}</InfoTip></dt>
                <dd className={`tabular mt-0.5 font-extrabold ${label === "Expected" ? "text-xl" : ""} ${v < 0 ? "text-warn" : ""}`}>{usd(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">Lowest {f.scope === "cash" ? "checking + savings" : "checking"} balance during the week. The low case bottoms out around {fmtDate(week.lowMinDate)}.</p>
          <dl className="divide-y divide-line rounded-xl bg-surface px-3 text-sm ring-1 ring-line">
            <div className="flex justify-between py-1.5"><dt className="text-muted">Starts the week at</dt><dd className="tabular font-bold">{usd(startBal)}</dd></div>
            <div className="flex justify-between py-1.5"><dt className="text-muted">Money in</dt><dd className="tabular font-bold text-accent-strong">{usd(inflow, { sign: true })}</dd></div>
            <div className="flex justify-between py-1.5"><dt className="text-muted">Bills, plans and transfers</dt><dd className="tabular font-bold">{usd(outflow)}</dd></div>
            {/* Whatever isn't explained by scheduled items is the engine's everyday-spending estimate. */}
            <div className="flex justify-between py-1.5"><dt className="text-muted"><InfoTip term="otherExpenses">Other expenses</InfoTip> (est.)</dt><dd className="tabular font-bold">{usd(week.endBase - (startBal + inflow + outflow))}</dd></div>
            <div className="flex justify-between py-1.5"><dt className="font-bold">Ends the week at</dt><dd className={`tabular font-extrabold ${week.endBase < 0 ? "text-warn" : ""}`}>{usd(week.endBase)}</dd></div>
          </dl>
        </div>

        <div>
          <h4 className="cat-head">Weekly Transactions</h4>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing scheduled, just everyday spending.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line text-sm">
              {items.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className="inline-block w-24 text-muted">{fmtDay(e.date.base)}</span>
                    <span className={e.kind === "transfer" ? "text-muted" : "font-bold"}>{e.label}</span>
                    {e.fromPlan ? (
                      <span className="ml-1.5 text-[11px]"><InfoTip term="paydayAssumed">Payday Plan</InfoTip></span>
                    ) : (
                      <span className="ml-1.5 text-[11px] text-muted">{KIND_TAG[e.kind]}</span>
                    )}
                    {e.earmarkedCents ? <span className="block pl-24 text-[11px] text-muted">{usd(e.earmarkedCents)} from tax savings · {usd(-hit(e))} from checking</span> : null}
                  </span>
                  <span className={`tabular shrink-0 font-bold ${e.amount.base > 0 ? "text-accent-strong" : e.kind === "transfer" ? "text-muted" : ""}`}>{usd(e.amount.base, { sign: true })}</span>
                </li>
              ))}
            </ul>
          )}
          {slipping.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              In the low case, {slipping.map((e) => `${e.label} (${usd(e.amount.base)})`).join(" and ")} could slip into this week.
            </p>
          )}
          {week.status !== "ok" && lead.reasons && (
            <div className="mt-3 space-y-2.5 rounded-xl bg-[#faf6ef] p-3 ring-1 ring-line">
              {lead.fix && <MoveSummary fix={lead.fix} />}
              <ReasonItems reasons={lead.reasons} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Goals tab: will you reach each goal by its date, and if not, when?

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonth(iso: string) {
  const d = toDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function plural(n: number, w: string) {
  return `${n} ${w}${n === 1 ? "" : "s"}`;
}
function duration(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && plural(y, "year"), m && plural(m, "month")].filter(Boolean).join(" ") || "under a month";
}

const VERDICT: Record<GoalPace["status"], { label: string; tone: "accent" | "tight" | "muted" }> = {
  reached: { label: "Reached", tone: "accent" },
  on_track: { label: "On track", tone: "accent" },
  late: { label: "Behind pace", tone: "tight" },
  not_started: { label: "Not started", tone: "muted" },
};

export function GoalsPanel({ p, onEdit }: { p: Profile; onEdit?: (id?: string) => void }) {
  // Linked goals take their saved and monthly amounts from the money that actually feeds them.
  const goals = fundedGoals(p);
  const funding = goalFunding(p);
  const paces = goals.map((g) => goalPace(g, p.today)).sort((a, b) => (a.goal.targetDate < b.goal.targetDate ? -1 : 1));
  const onTrack = paces.filter((x) => x.status === "on_track" || x.status === "reached").length;
  const monthly = goals.reduce((s, g) => s + g.monthlyContributionCents, 0);
  const extraNeeded = paces.reduce((s, x) => s + (x.status === "late" || x.status === "not_started" ? Math.max(0, x.neededMonthlyCents - x.goal.monthlyContributionCents) : 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-2 text-sm">
          <div className="rounded-xl bg-accent-soft px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">On track</dt><dd className="font-extrabold">{onTrack} of {paces.length} goals</dd></div>
          <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Going to goals now</dt><dd className="tabular font-extrabold">{usd(monthly)}/mo</dd></div>
          {extraNeeded > 0 && <div className="rounded-xl bg-tight-soft px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">To get every goal on time</dt><dd className="tabular font-extrabold">+{usd(extraNeeded)}/mo</dd></div>}
        </dl>
        {onEdit && <SmallButton onClick={() => onEdit()}><PlusIcon /> Add goal</SmallButton>}
      </div>

      {paces.length === 0 && <p className="text-sm text-muted">No goals yet. Add one, like a down payment or an emergency fund, to see when you&apos;ll get there at your current pace.</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {paces.map((x) => (
          <GoalRow key={x.goal.id} x={x} today={p.today} onEdit={onEdit} source={funding.get(x.goal.id)!.source} account={p.accounts.find((a) => a.id === x.goal.accountId)} />
        ))}
      </ul>
      <p className="text-xs text-muted">Goals linked to a savings account use its balance and what actually flows in: Payday Plan moves or a recurring transfer. Other goals use the amounts you entered.</p>
    </div>
  );
}

const SOURCE: Record<GoalFunding["source"], string> = { payday: "from your Payday Plan", transfer: "by recurring transfer", you: "as you entered", none: "" };

function GoalRow({ x, today, onEdit, source, account }: { x: GoalPace; today: string; onEdit?: (id?: string) => void; source: GoalFunding["source"]; account?: Profile["accounts"][number] }) {
  const g = x.goal;
  const v = VERDICT[x.status];
  const verdict =
    x.status === "reached"
      ? "Done. You've saved the full amount."
      : x.status === "not_started"
        ? source === "none" && account
          ? `Nothing going in yet: the Payday Plan funds it once checking can spare the money. ${usd(x.neededMonthlyCents)}/mo would get you there by ${fmtMonth(g.targetDate)}.`
          : `Nothing going in yet. ${usd(x.neededMonthlyCents)}/mo would get you there by ${fmtMonth(g.targetDate)}.`
        : x.status === "on_track"
          ? `At ${usd(g.monthlyContributionCents)}/mo ${SOURCE[source]} you'll get there around ${fmtMonth(x.reachDate!)}${x.monthsLate! < 0 ? `, ${duration(-x.monthsLate!)} early` : ""}.`
          : `At ${usd(g.monthlyContributionCents)}/mo ${SOURCE[source]} you'd get there around ${fmtMonth(x.reachDate!)}, ${duration(x.monthsLate!)} late. ${usd(x.neededMonthlyCents)}/mo would make ${fmtMonth(g.targetDate)}.`;

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{g.name}</div>
          <div className="tabular text-xs text-muted">{usd(g.savedCents)} of {usd(g.targetCents)} · target {fmtMonth(g.targetDate)}{account ? ` · ${account.institution} ${account.name}` : ""}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <InfoTip term={x.status === "late" ? "behindPace" : "onPace"} underline={false}><Chip tone={v.tone}>{v.label}</Chip></InfoTip>
          {onEdit && <SmallButton onClick={() => onEdit(g.id)} label={`Edit ${g.name}`}><PencilIcon /></SmallButton>}
        </span>
      </div>
      <div className="mt-3"><Meter value={g.savedCents} max={g.targetCents} tone={x.status === "late" ? "tight" : "accent"} label={`${g.name}: saved so far`} /></div>
      <PaceTimeline x={x} today={today} />
      <p className="mt-2 text-sm">{verdict}</p>
    </li>
  );
}

/** Today → target date, with a marker where the current pace actually lands. */
function PaceTimeline({ x, today }: { x: GoalPace; today: string }) {
  const target = x.goal.targetDate;
  const reach = x.reachDate;
  const end = reach && reach > target ? reach : target;
  const span = Math.max(1, daysBetween(today, end));
  const pos = (d: string) => `${Math.min(100, Math.max(0, (daysBetween(today, d) / span) * 100))}%`;
  if (x.status === "reached") return null;
  return (
    <div className="mt-8 pb-6" aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-[#efe8dc]">
        <span className="absolute inset-y-0 left-0 rounded-full bg-band" style={{ width: pos(target) }} />
        <Marker left={pos(target)} label={`Target ${fmtMonth(target)}`} tone="ink" below />
        {reach && <Marker left={pos(reach)} label={`At this pace ${fmtMonth(reach)}`} tone={x.status === "late" ? "tight" : "accent"} />}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>Today</span>{end !== target && <span>{fmtMonth(end)}</span>}</div>
    </div>
  );
}

function Marker({ left, label, tone, below }: { left: string; label: string; tone: "ink" | "accent" | "tight"; below?: boolean }) {
  const dot = { ink: "bg-ink", accent: "bg-accent", tight: "bg-[var(--tight)]" }[tone];
  return (
    <span className="absolute top-1/2" style={{ left }}>
      <span className={`absolute -left-1.5 -top-1.5 size-3 rounded-full ring-2 ring-white ${dot}`} />
      <span className={`absolute whitespace-nowrap text-[10px] font-bold text-muted ${below ? "top-2.5" : "-top-6"} ${left === "100%" ? "right-0" : "-translate-x-1/2"}`}>{label}</span>
    </span>
  );
}

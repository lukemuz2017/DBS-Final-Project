"use client";

import { upcoming, type CashEvent, type Forecast, type WindowResult } from "@/lib/engine/forecast";
import { daysBetween, fmtDate, fmtDay, fmtRange, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import type { GlossaryKey } from "@/lib/glossary";
import { PencilIcon, PlusIcon, SmallButton } from "./edit/fields";
import { InfoTip } from "./InfoTip";
import { Card, Chip, Meter, StatusBadge } from "./ui";

// ---------------------------------------------------------------------------
// The six two-week windows (the proposal's headline view)

export function WindowStrip({ f }: { f: Forecast }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {f.windows.map((w) => (
        <li key={w.index} className={`flex flex-col rounded-xl border p-3 ${w.status === "shortfall" ? "border-warn bg-warn-soft/60" : w.status === "short" ? "border-[var(--tight)]/50 bg-tight-soft/60" : "border-line bg-surface"}`}>
          <span className="text-[11px] font-bold text-muted"><InfoTip term="window">Weeks {w.index * 2 - 1}–{w.index * 2}</InfoTip></span>
          <span className="text-[11px] text-muted">{fmtRange(w.start, w.end)}</span>
          <div className="mt-1.5 text-xl font-extrabold">{usd(w.base)}</div>
          <div className="tabular text-[11px] text-muted">{usd(w.low)} to {usd(w.high)}</div>
          <RangeTick w={w} />
          <div className="mt-2.5 min-h-5">{w.status !== "ok" && <StatusBadge status={w.status} />}</div>
        </li>
      ))}
    </ol>
  );
}

function RangeTick({ w }: { w: WindowResult }) {
  const span = w.high - w.low || 1;
  const mid = ((w.base - w.low) / span) * 100;
  const zero = w.low < 0 && w.high > 0 ? (-w.low / span) * 100 : null;
  return (
    <div className="relative mt-2 h-1.5 rounded-full bg-band" aria-hidden="true">
      {zero !== null && <span className="absolute -top-1 h-3.5 w-px bg-[#b9ad99]" style={{ left: `${zero}%` }} />}
      <span className={`absolute -top-0.5 h-2.5 w-1 rounded-sm ${w.status === "shortfall" ? "bg-warn" : w.status === "short" ? "bg-[var(--tight)]" : "bg-accent"}`} style={{ left: `calc(${Math.max(0, Math.min(100, mid))}% - 2px)` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Why" panels for flagged windows

export function WhyPanels({ f }: { f: Forecast }) {
  const flagged = f.windows.filter((w) => w.reasons && !w.continuesFrom);
  if (flagged.length === 0) return null;
  return (
    <div className={`grid gap-3 ${flagged.length > 1 ? "lg:grid-cols-2" : ""}`}>
      {flagged.map((w) => {
        const run = f.windows.filter((x) => x.index === w.index || x.continuesFrom === w.index);
        const last = run[run.length - 1];
        const weeksLabel = `Weeks ${w.index * 2 - 1}–${last.index * 2}`;
        const headline =
          w.fix?.kind === "shortfall" || run.some((x) => x.status === "shortfall")
            ? "Short, even with savings"
            : run.some((x) => x.status === "short")
              ? "Checking dips below $0"
              : "Tight but positive";
        return (
          <article key={w.index} className={`card overflow-hidden ${run.some((x) => x.status === "shortfall") ? "ring-1 ring-warn/40" : ""}`}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              <StatusBadge status={run.reduce((s, x) => (["ok", "tight", "short", "shortfall"].indexOf(x.status) > ["ok", "tight", "short", "shortfall"].indexOf(s) ? x.status : s), w.status)} />
              <h3 className="font-display text-base font-bold">{headline}</h3>
              <span className="text-sm text-muted">· {weeksLabel}, {fmtRange(w.start, last.end)}</span>
            </div>
            <div className={`grid gap-4 px-5 py-4 ${flagged.length > 1 ? "" : "md:grid-cols-[1.4fr_1fr]"}`}>
              <div>
                <p className="text-[15px] leading-relaxed">{w.reasons!.sentence}</p>
                {w.reasons!.outflows.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {w.reasons!.outflows.map((o) => (
                      <li key={o.label + o.date} className="flex justify-between gap-3 border-b border-dashed border-line pb-1.5 last:border-0">
                        <span><span className="text-muted">{fmtDate(o.date)}</span> · {o.label}</span>
                        <span className="tabular font-bold">{usd(o.amount)}</span>
                      </li>
                    ))}
                    {w.reasons!.waitingFor && (
                      <li className="flex justify-between gap-3 pt-0.5 text-accent-strong">
                        <span><span className="opacity-80">{fmtDate(w.reasons!.waitingFor.earliest)}–{fmtDate(w.reasons!.waitingFor.latest)}</span> · {w.reasons!.waitingFor.label} (waiting)</span>
                        <span className="tabular font-bold">{usd(w.reasons!.waitingFor.amount, { sign: true })}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {w.fix && (
                <div className="rounded-xl bg-sun-soft p-4 ring-1 ring-sun">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-tight"><InfoTip term="suggestedMove">Suggested move</InfoTip></div>
                  <p className="mt-1 text-[15px] font-semibold leading-snug">{w.fix.sentence}</p>
                  <p className="mt-2 text-xs text-muted">{w.fix.rule}</p>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tiles

export function StatTiles({ f }: { f: Forecast }) {
  const next = upcoming(f, 84).find((e) => e.kind === "income");
  const bill = upcoming(f, 84).find((e) => e.kind !== "income" && e.kind !== "transfer" && e.amount.base <= -50_000);
  const runwayWeeks = Math.floor(f.runway.weeks);
  const onTarget = f.runway.weeks >= f.runway.target;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile term="cashToday" label="Cash today" value={usd(f.operatingToday + f.reserveToday)} sub={`${usd(f.operatingToday)} checking · ${usd(f.reserveToday)} savings`} />
      <div className="card p-4">
        <div className="text-xs font-bold text-muted"><InfoTip term="runway">Runway if income stopped</InfoTip></div>
        <div className="mt-1 text-2xl font-extrabold">{runwayWeeks} weeks</div>
        <div className="mt-2">
          <Meter value={f.runway.weeks} max={f.runway.target} tone={onTarget ? "accent" : f.runway.weeks >= f.runway.target * 0.6 ? "tight" : "warn"} label="Runway against target" />
        </div>
        <div className="mt-1.5 text-xs text-muted">Target {f.runway.target} weeks (about {Math.round(f.runway.target / 4.33)} months) · <InfoTip term="burn">burn {usd(f.runway.weeklyBurn)}/wk</InfoTip></div>
      </div>
      <Tile term="nextIn" label="Next money in" value={next ? usd(next.amount.base) : "None expected"} sub={next ? `${fmtDay(next.date.base)} · ${next.sourceName ?? next.label}` : "in the next 12 weeks"} />
      <Tile term="nextBill" label="Next big bill" value={bill ? usd(-bill.amount.base) : "Nothing over $500"} sub={bill ? `${fmtDay(bill.date.base)} · ${bill.label}` : "in the next 12 weeks"} />
    </div>
  );
}

function Tile({ term, label, value, sub }: { term: GlossaryKey; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-bold text-muted"><InfoTip term={term}>{label}</InfoTip></div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Income streams

const CONF = { certain: { t: "Certain", tone: "accent", term: "certain" }, likely: { t: "Likely", tone: "muted", term: "likelyIncome" }, uncertain: { t: "Not counted yet", tone: "tight", term: "uncertain" } } as const;

export function IncomeCard({ p, onEdit, limit = true }: { p: Profile; onEdit?: (id?: string) => void; limit?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded || !limit ? p.incomeStreams : p.incomeStreams.slice(0, PREVIEW);
  return (
    <Card
      title="Where money comes from"
      subtitle="Each with its own timing and certainty"
      action={onEdit && <SmallButton onClick={() => onEdit()}><PlusIcon /> Add income</SmallButton>}
    >
      {p.incomeStreams.length === 0 && <p className="text-sm text-muted">No income added yet.</p>}
      <ul className="divide-y divide-line">
        {shown.map((s) => (
          <li key={s.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{s.name}</span>
              <InfoTip term={CONF[s.confidence].term} underline={false}><Chip tone={CONF[s.confidence].tone}>{CONF[s.confidence].t}</Chip></InfoTip>
              {!s.taxWithheld && <InfoTip term="noTax" underline={false}><Chip tone="muted">No tax withheld</Chip></InfoTip>}
              {onEdit && <span className="ml-auto"><SmallButton onClick={() => onEdit(s.id)} label={`Edit ${s.name}`}><PencilIcon /></SmallButton></span>}
            </div>
            <div className="mt-0.5 text-sm text-muted">{s.summary}</div>
            {s.payDelayNote && <div className="mt-1 text-xs text-muted">{s.payDelayNote}</div>}
          </li>
        ))}
      </ul>
      {limit && <ExpandToggle total={p.incomeStreams.length} expanded={expanded} setExpanded={setExpanded} noun="source" />}
    </Card>
  );
}

/** "Show 3 more" / "Show less" for lists that start with a short preview. */
function ExpandToggle({ total, expanded, setExpanded, noun, preview = 3 }: { total: number; expanded: boolean; setExpanded: (v: boolean) => void; noun: string; preview?: number }) {
  if (total <= preview) return null;
  const more = total - preview;
  return (
    <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="mt-2 rounded-lg px-2 py-1 text-sm font-bold text-accent-strong hover:bg-accent-soft">
      {expanded ? "Show less" : `Show ${more} more ${noun}${more === 1 ? "" : "s"}`}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Coming up (next 30 days)

const PREVIEW = 3;
const EXPANDED = 15;

function ListFooter({ total, expanded, setExpanded, href, allLabel }: { total: number; expanded: boolean; setExpanded: (v: boolean) => void; href: string; allLabel: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      {total > PREVIEW ? (
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="rounded-lg px-2 py-1 font-bold text-accent-strong hover:bg-accent-soft">
          {expanded ? "Show less" : `Show ${Math.min(total, EXPANDED) - PREVIEW} more`}
        </button>
      ) : <span />}
      <Link href={href} className="rounded-lg px-2 py-1 font-bold text-accent-strong hover:bg-accent-soft">{allLabel} →</Link>
    </div>
  );
}

const KIND_TAG: Record<CashEvent["kind"], string> = { income: "Income", bill: "Bill", transfer: "To savings", planned: "Plan", tax: "Tax" };

/**
 * Coming up: one timeline of money in and out (income, bills, one-off plans,
 * estimated tax). Each row opens the editor for whatever produced it; "Add"
 * creates a new bill, plan or income source.
 */
export function UpcomingCard({ p, f, onEditItem, onAdd }: {
  p: Profile;
  f: Forecast;
  onEditItem?: (e: CashEvent) => void;
  onAdd?: (what: "bill" | "event" | "income") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const all = upcoming(f, 84);
  const items = all.slice(0, expanded ? EXPANDED : PREVIEW);
  return (
    <Card
      title="Coming up"
      subtitle={<>Money in and out, <InfoTip term="likely">likely case</InfoTip></>}
      action={
        onAdd && (
          <span className="relative">
            <SmallButton onClick={() => setAdding(!adding)} label="Add something coming up"><PlusIcon /> Add</SmallButton>
            {adding && (
              <span className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col rounded-xl border border-line bg-surface p-1 shadow-lg">
                {([["bill", "Regular bill"], ["event", "One-off plan"], ["income", "Income source"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { setAdding(false); onAdd(k); }} className="rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-accent-soft">{label}</button>
                ))}
              </span>
            )}
          </span>
        )
      }
    >
      <ul className="space-y-1 text-sm">
        {items.map((e) => {
          const conf = e.kind === "income" && e.confidence ? CONF[e.confidence] : null;
          const row = (
            <>
              <span className="min-w-0">
                <span className="inline-block w-14 text-muted">{fmtDate(e.date.base)}</span>
                <span className={e.kind === "tax" ? "font-bold" : ""}>{e.label}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1 pl-14 text-[11px] text-muted">
                  {KIND_TAG[e.kind]}
                  {conf && conf.t !== "Certain" && <Chip tone={conf.tone}>{conf.t}</Chip>}
                  {e.kind === "income" && e.date.low !== e.date.base && <span>· could slip to {fmtDate(e.date.low)}</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className={`tabular font-bold ${e.amount.base > 0 ? "text-accent-strong" : ""}`}>{usd(e.amount.base, { sign: true })}</span>
                {onEditItem && <span className="text-accent-strong opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><PencilIcon /></span>}
              </span>
            </>
          );
          return (
            <li key={e.id}>
              {onEditItem ? (
                <button type="button" onClick={() => onEditItem(e)} aria-label={`Edit ${e.label}`} className="group flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-accent-soft">
                  {row}
                </button>
              ) : (
                <div className="flex items-start justify-between gap-3 px-2 py-1.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
      <ListFooter total={all.length} expanded={expanded} setExpanded={setExpanded} href={`/dashboard/${p.slug}/upcoming`} allLabel="See all 12 weeks" />
      <p className="mt-2 text-xs text-muted">Plus about {usd(p.spending.weeklyMeanCents)} a week of everyday spending, spread across the forecast. Click any item to edit it.</p>
    </Card>
  );
}

/** Dashboard summary of the setup page, including data that's gone stale. */
export function SetupSummaryCard({ p }: { p: Profile }) {
  const stale = p.accounts.filter((a) => daysBetween(a.balanceAsOf.slice(0, 10), p.today) >= 3);
  const cash = p.accounts.filter((a) => a.tier === "operating" || a.tier === "reserve").length;
  const rows: [string, string][] = [
    ["Bank accounts", `${p.accounts.length} connected · ${cash} counted as cash`],
    ["Income sources", (() => { const n = p.incomeStreams.filter((s) => s.confidence === "uncertain").length; return `${p.incomeStreams.length}${n ? ` · ${n} not counted yet` : ""}`; })()],
    ["Regular bills", `${p.recurringBills.length}`],
    ["One-off plans", `${p.plannedEvents.filter((e) => e.dueDate > p.today).length} upcoming`],
  ];
  return (
    <Card title="Your setup" subtitle="What the forecast is built from">
      {stale.length > 0 && (
        <p className="mb-3 rounded-lg bg-tight-soft px-3 py-2 text-xs text-tight ring-1 ring-sun">
          <strong>{stale.map((a) => `${a.institution} ${a.name}`).join(", ")}</strong> last synced {daysBetween(stale[0].balanceAsOf.slice(0, 10), p.today)} days ago. The forecast may be off until it reconnects.
        </p>
      )}
      <dl className="divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/dashboard/${p.slug}/setup`} className="mt-3 inline-flex rounded-lg px-2 py-1 text-sm font-bold text-accent-strong hover:bg-accent-soft">Manage accounts, income & bills →</Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bills & plans (editable list of recurring bills and one-off planned items)

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function billSchedule(b: Profile["recurringBills"][number]) {
  if (b.cadence === "monthly") return `Monthly on the ${ordinal(b.dayOfMonth ?? 1)}`;
  if (b.cadence === "bimonthly") return `Every 2 months, next ${fmtDate(b.firstDate!)}`;
  return `${b.cadence === "weekly" ? "Weekly" : "Every other week"}, next ${fmtDate(b.firstDate!)}`;
}

export function BillsCard({ p, onEditBill, onEditEvent, limit = true }: { p: Profile; onEditBill: (id?: string) => void; onEditEvent: (id?: string) => void; limit?: boolean }) {
  const [allBills, setAllBills] = useState(!limit);
  const [allPlans, setAllPlans] = useState(!limit);
  // Largest bills first (by size), soonest plans first.
  const bills = [...p.recurringBills].sort((a, b) => a.amountCents - b.amountCents);
  const planned = [...p.plannedEvents].filter((e) => e.dueDate > p.today).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return (
    <Card title="Bills & plans" subtitle="Edit anything and the forecast updates">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Regular bills{bills.length > PREVIEW && !allBills ? " · largest 3" : ""}</h3>
        <SmallButton onClick={() => onEditBill()}><PlusIcon /> Add bill</SmallButton>
      </div>
      <ul className="mt-1 divide-y divide-line text-sm">
        {(allBills ? bills : bills.slice(0, PREVIEW)).map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block truncate font-bold">{b.name}</span>
              <span className="block text-xs text-muted">{billSchedule(b)}{b.amountSpreadCents > 0 ? ` · varies ±${usd(b.amountSpreadCents)}` : ""}{b.toAccountId ? " · to savings" : ""}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="tabular font-bold">{usd(b.amountCents)}</span>
              <SmallButton onClick={() => onEditBill(b.id)} label={`Edit ${b.name}`}><PencilIcon /></SmallButton>
            </span>
          </li>
        ))}
      </ul>
      {limit && <ExpandToggle total={bills.length} expanded={allBills} setExpanded={setAllBills} noun="bill" />}
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">One-off plans{planned.length > PREVIEW && !allPlans ? " · next 3" : ""}</h3>
        <SmallButton onClick={() => onEditEvent()}><PlusIcon /> Add a plan</SmallButton>
      </div>
      {planned.length === 0 && <p className="py-2 text-sm text-muted">Nothing planned. Add a trip, a deposit or a big purchase.</p>}
      <ul className="mt-1 divide-y divide-line text-sm">
        {(allPlans ? planned : planned.slice(0, PREVIEW)).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="inline-block w-14 text-muted">{fmtDate(e.dueDate)}</span><span className="font-bold">{e.name}</span></span>
            <span className="flex shrink-0 items-center gap-1">
              <span className={`tabular font-bold ${e.amountCents > 0 ? "text-accent-strong" : ""}`}>{usd(e.amountCents, { sign: true })}</span>
              <SmallButton onClick={() => onEditEvent(e.id)} label={`Edit ${e.name}`}><PencilIcon /></SmallButton>
            </span>
          </li>
        ))}
      </ul>
      {limit && <ExpandToggle total={planned.length} expanded={allPlans} setExpanded={setAllPlans} noun="plan" />}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Accounts

const TIER = { operating: "Spending money", reserve: "Buffer", long_term: "Long-term, not counted", excluded: "Not counted" } as const;
const TIER_TERM = { operating: "spending", reserve: "buffer", long_term: "longTerm", excluded: "notCounted" } as const;

export function AccountsCard({ p, onEdit, onConnect }: { p: Profile; onEdit?: (id: string) => void; onConnect?: () => void }) {
  return (
    <Card
      title="Accounts"
      subtitle="Investments and cards aren't counted as cash"
      action={onConnect && <SmallButton onClick={onConnect}><PlusIcon /> Connect a bank</SmallButton>}
    >
      {p.accounts.length === 0 && <p className="text-sm text-muted">No accounts connected.</p>}
      <ul className="divide-y divide-line text-sm">
        {p.accounts.map((a) => {
          const ageDays = daysBetween(a.balanceAsOf.slice(0, 10), p.today);
          return (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="font-bold">{a.institution} {a.name} <span className="font-normal text-muted">••{a.mask}</span></div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <InfoTip term={TIER_TERM[a.tier]}>{TIER[a.tier]}</InfoTip>
                  {ageDays >= 3 ? <Chip tone="tight">Last synced {ageDays} days ago</Chip> : a.connectedAt ? <Chip tone="accent">Just connected</Chip> : null}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <span className={`tabular font-bold ${a.tier === "long_term" || a.tier === "excluded" ? "text-muted" : ""}`}>{usd(a.balanceCents)}</span>
                {onEdit && <SmallButton onClick={() => onEdit(a.id)} label={`Edit ${a.institution} ${a.name}`}><PencilIcon /></SmallButton>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent transactions

export function TransactionsCard({ p }: { p: Profile }) {
  const [expanded, setExpanded] = useState(false);
  const recent = p.transactions.slice(0, expanded ? EXPANDED : PREVIEW);
  return (
    <Card title="Recent activity" subtitle="Latest demo transactions">
      <ul className="text-sm">
        {recent.map((t) => (
          <li key={t.id} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
            <span className="min-w-0 truncate">
              <span className="inline-block w-14 text-muted">{fmtDate(t.postedDate)}</span>
              {t.merchant}
              {t.isInternalTransfer && <span className="ml-1 text-xs text-muted">(transfer, not spending)</span>}
            </span>
            <span className={`tabular shrink-0 ${t.amountCents > 0 ? "font-bold text-accent-strong" : ""}`}>{usd(t.amountCents, { sign: true })}</span>
          </li>
        ))}
      </ul>
      <ListFooter total={p.transactions.length} expanded={expanded} setExpanded={setExpanded} href={`/dashboard/${p.slug}/transactions`} allLabel="See all transactions" />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Goals (1–2 year view, simple pace math)

function monthsBetween(a: string, b: string) {
  const da = toDate(a);
  const db = toDate(b);
  return Math.max(0, (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + db.getUTCMonth() - da.getUTCMonth());
}

export function GoalsCard({ p, onEdit }: { p: Profile; onEdit?: (id?: string) => void }) {
  return (
    <Card title="Goals" subtitle="At your planned pace" action={onEdit && <SmallButton onClick={() => onEdit()}><PlusIcon /> Add goal</SmallButton>}>
      {p.goals.length === 0 && <p className="text-sm text-muted">No goals yet. Add one to see how long it takes at your current pace.</p>}
      <ul className="space-y-4">
        {p.goals.map((g) => {
          const months = monthsBetween(p.today, g.targetDate);
          const projected = g.savedCents + g.monthlyContributionCents * months;
          const need = months > 0 ? Math.max(0, Math.ceil((g.targetCents - g.savedCents) / months)) : g.targetCents - g.savedCents;
          const onTrack = projected >= g.targetCents;
          const notStarted = g.monthlyContributionCents === 0 && g.savedCents === 0;
          return (
            <li key={g.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{g.name}</span>
                <span className="flex items-center gap-1">
                  {notStarted ? <Chip>Not started</Chip> : onTrack ? <InfoTip term="onPace" underline={false}><Chip tone="accent">On pace</Chip></InfoTip> : <InfoTip term="behindPace" underline={false}><Chip tone="tight">Behind pace</Chip></InfoTip>}
                  {onEdit && <SmallButton onClick={() => onEdit(g.id)} label={`Edit ${g.name}`}><PencilIcon /></SmallButton>}
                </span>
              </div>
              <div className="mt-1.5"><Meter value={g.savedCents} max={g.targetCents} tone={onTrack || notStarted ? "accent" : "tight"} label={`${g.name} progress`} /></div>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted">
                <span className="tabular">{usd(g.savedCents)} of {usd(g.targetCents)} · by {fmtDate(g.targetDate)} {toDate(g.targetDate).getUTCFullYear()}</span>
                <span>
                  {notStarted
                    ? `Needs ${usd(need)}/mo to make it`
                    : onTrack
                      ? `${usd(g.monthlyContributionCents)}/mo gets you there`
                      : `${usd(g.monthlyContributionCents)}/mo now · needs ${usd(need)}/mo`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Profile-specific cards

export function TaxSetupCard({ onEdit }: { onEdit: () => void }) {
  return (
    <Card title="Quarterly estimated tax" subtitle="Not set up">
      <p className="text-sm">Freelance income usually has no tax withheld, so the IRS expects payments four times a year. The next one is due <strong>Jan 15</strong>.</p>
      <div className="mt-3"><SmallButton onClick={onEdit}><PlusIcon /> Set up tax tracking</SmallButton></div>
    </Card>
  );
}

export function TaxCard({ p, f, onEdit }: { p: Profile; f: Forecast; onEdit?: () => void }) {
  if (!p.tax || !f.tax) return null;
  const gap = f.tax.amount - f.tax.setAside;
  return (
    <Card title={<InfoTip term="estimatedTax">Quarterly estimated tax</InfoTip>} subtitle={`Covers income from ${p.tax.periodLabel}`} action={onEdit && <SmallButton onClick={onEdit}><PencilIcon /> Settings</SmallButton>}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-muted">Due {fmtDay(f.tax.dueDate)}</div>
          <div className="text-3xl font-extrabold">≈ {usd(f.tax.amount)}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-muted">Set aside so far</div>
          <div className="font-bold">{usd(f.tax.setAside)}</div>
        </div>
      </div>
      <div className="mt-3"><Meter value={f.tax.setAside} max={f.tax.amount} tone={gap > 0 ? "tight" : "accent"} label="Tax set aside against estimate" /></div>
      <p className="mt-2 text-sm">
        {gap > 0 ? <>About <strong>{usd(gap)} more</strong> to set aside before {fmtDate(f.tax.dueDate)}.</> : <>Fully covered by your tax savings.</>}
      </p>
      <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer font-bold text-accent-strong">How this is estimated</summary><p className="mt-1 leading-relaxed">{p.tax.note}</p></details>
      <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-strong">
        <strong>What this is:</strong> no employer withholds tax from freelance income, so the IRS and New York expect you to pay as you go, four times a year. Skipping a payment can mean an underpayment penalty, and the full bill still arrives in April.
      </p>
    </Card>
  );
}

export function TermCard({ f }: { f: Forecast }) {
  const refund = f.events.find((e) => e.id.startsWith("s-refund"));
  return (
    <Card title="Your quarter at a glance" subtitle="How MBA cash flow actually works">
      <ol className="relative space-y-3 border-l-2 border-band pl-4 text-sm">
        <li><span className="font-bold">Autumn course-assistant pay ends</span> <span className="text-muted">· Dec 18</span></li>
        <li><span className="font-bold">Winter break</span> <span className="text-muted">· flights, gifts, and no paycheck</span></li>
        <li><span className="font-bold">Japan Trek deposit due</span> <span className="text-muted">· Jan 5</span></li>
        {refund && (
          <li>
            <span className="font-bold">Winter loan refund lands</span>{" "}
            <span className="text-muted">· likely {fmtDate(refund.date.base)}, could be {fmtDate(refund.date.low)}</span>
            <div className="text-accent-strong">{usd(refund.amount.base, { sign: true })} after tuition</div>
          </li>
        )}
      </ol>
      <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-strong">
        <strong>Why it pinches:</strong> loans pay tuition first, and only the leftover reaches you, once a quarter. The weeks before each refund are the tightest of the term, especially over winter break.
      </p>
      <p className="mt-2 text-xs text-muted">Loan refunds aren&apos;t income, so no tax set-aside is needed. Course-assistant pay already has tax withheld.</p>
    </Card>
  );
}

export function GraduationCard({ p }: { p: Profile }) {
  return (
    <Card title="From gig work to a steady paycheck" subtitle="Runway switched to the steady view in October">
      <ol className="relative space-y-3 border-l-2 border-band pl-4 text-sm">
        {(p.history ?? []).map((h) => (
          <li key={h.label}>
            <span className="font-bold">{h.label}</span> <span className="text-muted">· {fmtDate(h.date)} {toDate(h.date).getUTCFullYear()}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-strong">
        <strong>What changed:</strong> with paychecks every other Friday, the 12-week range is narrow, so goals matter more than the next dip. Side editing work still shows up, but isn&apos;t counted until it&apos;s confirmed.
      </p>
    </Card>
  );
}

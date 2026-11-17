"use client";

import { useState } from "react";
import { fmtDate, toDate, usd } from "@/lib/format";
import type { Profile, RecurringBill } from "@/lib/types";
import { PencilIcon, PlusIcon, SmallButton } from "./edit/fields";
import { billSchedule } from "./sections";
import { Card } from "./ui";

// Setup-page lists for recurring bills and one-off plans: see everything,
// add, edit (opens the drawer) and remove (inline two-step confirm).

const CATEGORY_LABEL: Record<RecurringBill["category"], string> = {
  housing: "Housing",
  utilities: "Utilities (heat & electric)",
  phone: "Phone & internet",
  insurance: "Insurance",
  health: "Health",
  debt: "Loan payments",
  card_payment: "Credit card payments",
  transport: "Transport",
  subscriptions: "Subscriptions",
  business: "Business costs",
  transfer: "Transfers to savings",
};
const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL) as RecurringBill["category"][];

/** Average monthly cost of a bill, whatever its schedule. */
function perMonth(b: RecurringBill) {
  const n = { monthly: 1, bimonthly: 0.5, weekly: 52 / 12, biweekly: 26 / 12 }[b.cadence];
  return Math.round(b.amountCents * n);
}

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming)
    return (
      <span className="flex items-center gap-1">
        <button type="button" onClick={onRemove} className="rounded-lg bg-warn px-2 py-1 text-xs font-bold text-white">Remove</button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:text-ink">Keep</button>
      </span>
    );
  return (
    <button type="button" onClick={() => setConfirming(true)} aria-label={`Remove ${name}`} className="rounded-lg p-1.5 text-muted hover:bg-warn-soft hover:text-warn">
      <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 4h9M5.5 4V2.5h3V4M3.8 4l.6 7.5h5.2l.6-7.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function RecurringBillsPanel({ p, onEdit, onRemove }: { p: Profile; onEdit: (id?: string) => void; onRemove: (id: string) => void }) {
  const groups = CATEGORY_ORDER.map((c) => ({ c, bills: p.recurringBills.filter((b) => b.category === c).sort((a, b) => a.amountCents - b.amountCents) })).filter((g) => g.bills.length > 0);
  const spending = p.recurringBills.filter((b) => b.category !== "transfer").reduce((s, b) => s + perMonth(b), 0);
  const saving = p.recurringBills.filter((b) => b.category === "transfer").reduce((s, b) => s + perMonth(b), 0);
  // Categories start collapsed; click a header to open it.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (c: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  return (
    <Card
      title="Recurring bills"
      subtitle="Rent, utilities, loans, subscriptions and anything else that repeats"
      action={<SmallButton onClick={() => onEdit()}><PlusIcon /> Add bill</SmallButton>}
    >
      <dl className="mb-4 flex flex-wrap gap-2 text-sm">
        <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Bills per month (avg)</dt><dd className="tabular font-extrabold">{usd(-spending)}</dd></div>
        {saving !== 0 && <div className="rounded-xl bg-accent-soft px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Auto-saving per month</dt><dd className="tabular font-extrabold">{usd(-saving)}</dd></div>}
        <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Bills</dt><dd className="font-extrabold">{p.recurringBills.length}</dd></div>
      </dl>
      {groups.length === 0 && <p className="text-sm text-muted">No recurring bills yet. Add rent first; it&apos;s usually the biggest.</p>}
      <div className="space-y-1">
        {groups.map(({ c, bills }) => (
          <section key={c}>
            <h3>
              <button type="button" onClick={() => toggle(c)} aria-expanded={open.has(c)} className="flex w-full items-center justify-between gap-2 border-b border-line py-1.5 text-left hover:bg-[#faf6ef]">
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`text-accent-strong transition-transform ${open.has(c) ? "rotate-90" : ""}`}><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="cat-head">{CATEGORY_LABEL[c]}</span>
                  <span className="text-xs text-muted">({bills.length})</span>
                </span>
                <span className="tabular text-xs font-bold text-accent-strong/80">{usd(-bills.reduce((s, b) => s + perMonth(b), 0))}/mo</span>
              </button>
            </h3>
            {open.has(c) && <ul className="divide-y divide-line text-sm">
              {bills.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <button type="button" onClick={() => onEdit(b.id)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-bold hover:text-accent-strong">{b.name}</span>
                    <span className="block text-xs text-muted">
                      {billSchedule(b)}
                      {b.amountSpreadCents > 0 ? ` · varies ±${usd(b.amountSpreadCents)}` : ""}
                      {!b.essential && !b.toAccountId ? " · not essential" : ""}
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <span className="tabular mr-1 font-bold">{usd(b.amountCents)}</span>
                    <SmallButton onClick={() => onEdit(b.id)} label={`Edit ${b.name}`}><PencilIcon /></SmallButton>
                    <RemoveButton name={b.name} onRemove={() => onRemove(b.id)} />
                  </span>
                </li>
              ))}
            </ul>}
          </section>
        ))}
      </div>
    </Card>
  );
}

export function PlansPanel({ p, onEdit, onRemove }: { p: Profile; onEdit: (id?: string) => void; onRemove: (id: string) => void }) {
  const sorted = [...p.plannedEvents].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const upcoming = sorted.filter((e) => e.dueDate > p.today);
  const past = sorted.filter((e) => e.dueDate <= p.today);
  const out = upcoming.filter((e) => e.amountCents < 0).reduce((s, e) => s + e.amountCents, 0);

  const row = (e: (typeof sorted)[number], muted = false) => (
    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
      <button type="button" onClick={() => onEdit(e.id)} className={`min-w-0 flex-1 text-left ${muted ? "text-muted" : ""}`}>
        <span className="inline-block w-24 text-muted">{fmtDate(e.dueDate)} {toDate(e.dueDate).getUTCFullYear() !== toDate(p.today).getUTCFullYear() ? toDate(e.dueDate).getUTCFullYear() : ""}</span>
        <span className="font-bold hover:text-accent-strong">{e.name}</span>
      </button>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className={`tabular mr-1 font-bold ${e.amountCents > 0 ? "text-accent-strong" : ""}`}>{usd(e.amountCents, { sign: true })}</span>
        <SmallButton onClick={() => onEdit(e.id)} label={`Edit ${e.name}`}><PencilIcon /></SmallButton>
        <RemoveButton name={e.name} onRemove={() => onRemove(e.id)} />
      </span>
    </li>
  );

  return (
    <Card title="One-off plans" subtitle="Trips, deposits, big purchases, or money you're expecting once" action={<SmallButton onClick={() => onEdit()}><PlusIcon /> Add a plan</SmallButton>}>
      <dl className="mb-4 flex flex-wrap gap-2 text-sm">
        <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Coming up</dt><dd className="font-extrabold">{upcoming.length}</dd></div>
        <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Planned spending</dt><dd className="tabular font-extrabold">{usd(out)}</dd></div>
      </dl>
      {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing planned. Add a trip, a deposit or a big purchase so the forecast can see it coming.</p> : <ul className="divide-y divide-line text-sm">{upcoming.map((e) => row(e))}</ul>}
      {past.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cat-head cursor-pointer">Past plans ({past.length})</summary>
          <ul className="divide-y divide-line">{past.map((e) => row(e, true))}</ul>
        </details>
      )}
    </Card>
  );
}

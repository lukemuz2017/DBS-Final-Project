"use client";

import type { Forecast } from "@/lib/engine/forecast";
import { daysBetween, fmtDate, fmtDay, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { useState } from "react";
import { PencilIcon, PlusIcon, SmallButton } from "./edit/fields";
import { InfoTip } from "./InfoTip";
import { Card, Chip, Meter } from "./ui";

// ---------------------------------------------------------------------------
// "Why" panels for flagged windows

// ---------------------------------------------------------------------------
// Stat tiles

/** Cash today and runway, side by side in one compact panel next to the headline. */
export function HeroStats({ f }: { f: Forecast }) {
  const runwayWeeks = Math.floor(f.runway.weeks);
  const onTarget = f.runway.weeks >= f.runway.target;
  return (
    <div className="card grid grid-cols-2 divide-x divide-line bg-surface/90">
      <div className="p-4">
        <div className="text-xs font-bold text-accent-strong"><InfoTip term="cashToday">Cash today</InfoTip></div>
        <div className="tabular mt-1 text-2xl font-extrabold">{usd(f.operatingToday + f.reserveToday)}</div>
        <div className="mt-1 text-xs text-muted">
          {usd(f.operatingToday)} checking · {usd(f.reserveToday - f.taxEarmarkToday)} savings
          {f.taxEarmarkToday > 0 && <> · <InfoTip term="taxEarmark">{usd(f.taxEarmarkToday)} for taxes</InfoTip></>}
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs font-bold text-accent-strong"><InfoTip term="runway">Cash Runway</InfoTip></div>
        <div className="mt-1 text-2xl font-extrabold">{runwayWeeks} <span className="text-base font-bold text-muted">of {f.runway.target} weeks</span></div>
        <div className="mt-2">
          <Meter value={f.runway.weeks} max={f.runway.target} tone={onTarget ? "accent" : f.runway.weeks >= f.runway.target * 0.6 ? "tight" : "warn"} label="Runway against target" />
        </div>
        <div className="mt-1 text-xs text-muted"><InfoTip term="burn">At {usd(f.runway.weeklyBurn)}/week</InfoTip></div>
      </div>
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
      title="Income Sources"
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

const PREVIEW = 3;

// ---------------------------------------------------------------------------
// Bill schedule text (used by the Recurring bills list)

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function billSchedule(b: Profile["recurringBills"][number]) {
  if (b.cadence === "monthly") return `Monthly on the ${ordinal(b.dayOfMonth ?? 1)}`;
  if (b.cadence === "bimonthly") return `Every 2 months, next ${fmtDate(b.firstDate!)}`;
  return `${b.cadence === "weekly" ? "Weekly" : "Every other week"}, next ${fmtDate(b.firstDate!)}`;
}

// ---------------------------------------------------------------------------
// Accounts

const TIER = { operating: "Spending money", reserve: "Buffer", long_term: "Long-term, not counted", excluded: "Not counted" } as const;
const TIER_TERM = { operating: "spending", reserve: "buffer", long_term: "longTerm", excluded: "notCounted" } as const;

const ACCOUNT_GROUPS: { id: string; label: string; types: Profile["accounts"][number]["type"][]; note?: string }[] = [
  { id: "cash", label: "Checking & savings", types: ["checking", "savings"] },
  { id: "cards", label: "Credit cards", types: ["credit_card"], note: "Not counted as cash. Card spending shows up as your monthly card payment." },
  { id: "loans", label: "Loans", types: ["loan"], note: "Not counted as cash. Monthly payments are in Recurring bills." },
  { id: "invest", label: "Investments & retirement", types: ["investment"], note: "Not counted as cash or runway." },
];

export function AccountsCard({ p, onEdit, onConnect }: { p: Profile; onEdit?: (id: string) => void; onConnect?: () => void }) {
  return (
    <Card
      title="Accounts"
      action={onConnect && <SmallButton onClick={onConnect}><PlusIcon /> Connect a bank</SmallButton>}
    >
      {p.accounts.length === 0 && <p className="text-sm text-muted">No accounts connected.</p>}
      <div className="space-y-5">
        {ACCOUNT_GROUPS.map((g) => {
          const accts = p.accounts.filter((a) => g.types.includes(a.type));
          if (accts.length === 0) return null;
          const total = accts.reduce((sum, a) => sum + a.balanceCents, 0);
          return (
            <section key={g.id}>
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                <h3 className="cat-head">{g.label}</h3>
                <span className={`tabular text-xs font-bold ${total < 0 ? "text-ink" : "text-accent-strong/80"}`}>{usd(total)}</span>
              </div>
              <ul className="divide-y divide-line text-sm">
                {accts.map((a) => {
                  const ageDays = daysBetween(a.balanceAsOf.slice(0, 10), p.today);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-bold">{a.institution} {a.name} <span className="font-normal text-muted">••{a.mask}</span></div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          {g.id === "cash" && <InfoTip term={TIER_TERM[a.tier]}>{TIER[a.tier]}</InfoTip>}
                          {ageDays >= 3 ? <Chip tone="tight">Last synced {ageDays} days ago</Chip> : a.connectedAt ? <Chip tone="accent">Just connected</Chip> : null}
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className={`tabular font-bold ${g.id === "cash" ? "" : "text-muted"}`}>{usd(a.balanceCents)}</span>
                        {onEdit && <SmallButton onClick={() => onEdit(a.id)} label={`Edit ${a.institution} ${a.name}`}><PencilIcon /></SmallButton>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {g.note && <p className="mt-1 text-xs text-muted">{g.note}</p>}
            </section>
          );
        })}
      </div>
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
    <Card title="Your quarter at a glance" action={<span className="text-xs font-bold text-accent-strong"><InfoTip term="whyPinches">Why it pinches</InfoTip></span>}>
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
      <p className="mt-3 text-xs text-muted">Loan refunds aren&apos;t income, so no tax set-aside is needed. Course-assistant pay already has tax withheld.</p>
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

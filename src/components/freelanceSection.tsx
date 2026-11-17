"use client";

// The freelancer's money section: the payment splitter across the top (taxes
// first), with quarterly tax and pay-yourself side by side below it.

import { useState, type ReactNode } from "react";
import type { Forecast } from "@/lib/engine/forecast";
import { paydayPlan, safePay, windfallSplits, type SplitLeg, type WindfallSplit } from "@/lib/engine/plan";
import { fmtDate, fmtDay, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { PencilIcon, SmallButton } from "./edit/fields";
import { InfoTip } from "./InfoTip";
import { Card, Meter } from "./ui";

const LEG_COLOR: Record<SplitLeg["kind"], { bar: string; chip: string }> = {
  tax: { bar: "bg-sun", chip: "bg-sun-soft ring-sun" },
  keep: { bar: "bg-[#c9bfae]", chip: "bg-[#f6f1e9] ring-line" },
  buffer: { bar: "bg-band", chip: "bg-accent-soft ring-accent/25" },
  retirement: { bar: "bg-[#b9c1e3]", chip: "bg-[#eef0f7] ring-[#c9cfe6]" },
  goals: { bar: "bg-[#e9bfcd]", chip: "bg-[#fbf0f4] ring-[#efd3dd]" },
  spend: { bar: "bg-accent", chip: "bg-surface ring-accent/40" },
};

// ---- shared bodies (no card chrome) ----

function TaxBody({ p, f, onEdit }: { p: Profile; f: Forecast; onEdit?: () => void }) {
  if (!p.tax || !f.tax) return null;
  const ready = f.tax.setAside + f.tax.plannedSetAside;
  const gap = f.tax.amount - ready;
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-accent-strong">Due {fmtDay(f.tax.dueDate)}</div>
          <div className="tabular text-3xl font-extrabold">≈ {usd(f.tax.amount)}</div>
        </div>
        {onEdit && <SmallButton onClick={onEdit} label="Tax settings"><PencilIcon /></SmallButton>}
      </div>
      <div className="mt-3"><Meter value={ready} max={f.tax.amount} tone={gap > 0 ? "tight" : "accent"} label="Tax set aside against estimate" /></div>
      <div className="mt-1.5 flex justify-between gap-2 text-sm">
        <span className="text-muted">
          {usd(f.tax.setAside)} saved{f.tax.plannedSetAside > 0 && <> + <InfoTip term="paydayAssumed">{usd(f.tax.plannedSetAside)} from upcoming payments</InfoTip></>}
        </span>
        <span className="shrink-0 font-bold">{gap > 0 ? `${usd(gap)} to go` : "Covered"}</span>
      </div>
      <p className="mt-2 text-xs text-muted">Covers income from {p.tax.periodLabel}. <InfoTip term="estimatedTax">What is this?</InfoTip></p>
    </div>
  );
}

function PayBody({ p }: { p: Profile }) {
  const s = safePay(p);
  if (!s.feasible) return <p className="text-sm">No room for a paycheck right now: even with no everyday spending, cash would fall about <strong>{usd(s.gapCents)}</strong> below your cushion.</p>;
  const over = s.currentWeeklyCents > s.weeklyCents;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="tabular text-3xl font-extrabold">{usd(s.paycheckCents)}</span>
        <span className="text-sm text-muted">every 2 weeks</span>
      </div>
      <p className="mt-1 text-sm text-muted">{usd(s.weeklyCents)}/week for everyday spending, after bills and the <InfoTip term="paydayAssumed">Payday Plan</InfoTip>.</p>
      <p className={`mt-2 text-sm font-bold ${over ? "text-warn" : "text-accent-strong"}`}>
        {over ? `You usually spend ${usd(s.currentWeeklyCents)}/week: ${usd(s.currentWeeklyCents - s.weeklyCents)} over.` : `You usually spend ${usd(s.currentWeeklyCents)}/week: within it.`}
      </p>
      {s.minWeeklyCents > 0 && s.weeklyCents < s.minWeeklyCents && (
        <p className="mt-1 text-xs font-bold text-warn">Below your {usd(s.minWeeklyCents)}/week minimum. Chase an invoice or trim a bill to close the gap.</p>
      )}
    </div>
  );
}

function PaymentTabs({ splits, i, setI }: { splits: WindfallSplit[]; i: number; setI: (k: number) => void }) {
  return (
    <div role="tablist" aria-label="Upcoming payments" className="flex flex-wrap gap-1">
      {splits.map((s, k) => (
        <button key={s.event.id} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${k === i ? "bg-accent text-white" : "bg-[#f1ece4] text-muted hover:text-ink"}`}>
          {fmtDate(s.event.date.base)} · {usd(s.amountCents)}
        </button>
      ))}
    </div>
  );
}

/** Horizontal: payment on the left, one proportional bar, then the parts as equal tiles. */
function SplitBar({ w }: { w: WindfallSplit }) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
      <div>
        <div className="text-xs font-bold text-accent-strong">{fmtDay(w.event.date.base)}</div>
        <div className="font-bold leading-tight">{w.event.sourceName ?? w.event.label}</div>
        <div className="tabular text-2xl font-extrabold text-accent-strong">{usd(w.amountCents, { sign: true })}</div>
      </div>
      <div>
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          {w.legs.map((l) => (
            <span key={l.kind} className={`${LEG_COLOR[l.kind].bar} border-r-2 border-surface last:border-r-0`} style={{ width: `${(l.amountCents / w.amountCents) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
          {w.legs.map((l) => (
            <li key={l.kind} className={`rounded-xl px-3 py-2 ring-1 ${LEG_COLOR[l.kind].chip}`}>
              <div className="text-[11px] font-bold text-muted">{l.label}</div>
              <div className="tabular text-lg font-extrabold">{usd(l.amountCents)}</div>
              {l.account && <div className="truncate text-[11px] text-muted">→ {l.account}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SplitFoot({ p, w }: { p: Profile; w: WindfallSplit }) {
  const { rules } = paydayPlan(p);
  const paused = !rules.pushPaused
    ? ""
    : rules.pausedBy?.reason === "dip"
      ? ` Push hard is paused: checking dips below $0 around ${fmtDate(rules.pausedBy.date!)} in the low case.`
      : rules.pausedBy?.reason === "necessities"
        ? ` Push hard is paused: it would leave less than your ${usd(rules.minWeeklySpendCents)}/week minimum for everyday spending.`
        : " Push hard is paused: Cash Runway is under 4 weeks.";
  return (
    <p className="mt-3 text-xs text-muted">
      <strong className="text-tight">Taxes first:</strong> {p.tax?.setAsidePct}% of every untaxed payment.{paused}{w.note ? ` ${w.note}` : ""} The forecast assumes you follow this plan.
    </p>
  );
}

export function FreelanceSection({ p, f, onEditTax, taxFallback }: { p: Profile; f: Forecast; onEditTax: () => void; taxFallback?: ReactNode }) {
  const splits = windfallSplits(p);
  const [i, setI] = useState(0);
  const w = splits[Math.min(i, splits.length - 1)];
  return (
    <div className="space-y-5">
      {w && (
        <Card title={<InfoTip term="windfall">Payday Plan</InfoTip>} action={<PaymentTabs splits={splits} i={i} setI={setI} />}>
          <SplitBar w={w} />
          <SplitFoot p={p} w={w} />
        </Card>
      )}
      <div className="grid items-stretch gap-5 md:grid-cols-2">
        {p.tax && f.tax ? <Card title={<InfoTip term="estimatedTax">Quarterly estimated tax</InfoTip>} className="h-full"><TaxBody p={p} f={f} onEdit={onEditTax} /></Card> : taxFallback}
        <Card title={<InfoTip term="payYourself">Pay yourself</InfoTip>} className="h-full"><PayBody p={p} /></Card>
      </div>
    </div>
  );
}

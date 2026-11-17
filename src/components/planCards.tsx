"use client";

import { refundPlan, retirementOutlook } from "@/lib/engine/plan";
import { fmtDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { InfoTip } from "./InfoTip";
import { RetirementPanel } from "./retirementOutlook";
import { Card } from "./ui";

// Cards for lumpy income: retirement room, and a student's refund plan with the
// borrowed-money check. (Pay yourself and payment splits live in freelanceSection.tsx.)


// ---------------------------------------------------------------------------
// Retirement (freelance: SEP / Solo 401(k); steady: employer 401(k) match)

export function RetirementCard({ p }: { p: Profile }) {
  const o = retirementOutlook(p);
  if (!o || !p.retirement) return null;
  const planName = { sep_ira: "SEP IRA", solo_401k: "Solo 401(k)", employer_401k: "Workplace 401(k)", none: "" }[p.retirement.plan];
  return (
    <section className="card p-5">
      <RetirementPanel o={o} planName={planName} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Student refund plan + borrowed-money check

export function RefundPlanCard({ p }: { p: Profile }) {
  const r = refundPlan(p);
  if (!r) return null;
  const rows: [string, number][] = [
    ["Refund", r.refundCents],
    ...(r.checkingBeforeCents < 0 ? ([["Refills checking first", r.checkingBeforeCents]] as [string, number][]) : []),
    [`Bills until ${fmtDate(r.nextRefundDate)}`, -r.billsCents],
    ...(r.plannedCents ? ([["Plans", r.plannedCents]] as [string, number][]) : []),
    ...(r.otherIncomeCents ? ([["Other income", r.otherIncomeCents]] as [string, number][]) : []),
  ];
  return (
    <Card title={<InfoTip term="refundPlan">Refund plan</InfoTip>} subtitle={`Winter refund, ${fmtDate(r.refundDate)} → spring refund, ${fmtDate(r.nextRefundDate)} (${r.weeks} weeks)`}>
      <dl className="divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className={`tabular font-bold ${v > 0 ? "text-accent-strong" : ""}`}>{usd(v, { sign: true })}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 ring-1 ring-accent/20">
        <div className="text-[11px] font-bold text-accent-strong">Safe to spend from this refund</div>
        <div className="tabular text-2xl font-extrabold">{usd(r.allowanceWeeklyCents)}<span className="text-sm font-bold text-muted"> / week</span></div>
        <div className="text-xs text-muted">You usually spend {usd(p.spending.weeklyMeanCents)}/week.</div>
      </div>

      {r.borrowLessCents > 0 ? (
        <div className="mt-3 rounded-xl bg-sun-soft p-3 ring-1 ring-sun">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-tight"><InfoTip term="borrowedMoney">Borrowed-money check</InfoTip></div>
          <p className="mt-1 text-sm">
            At the spring refund you&apos;re likely to still hold about <strong>{usd(r.cashAtNextRefundCents)}</strong> in checking and savings, about {usd(r.idleCents)} more than a month of costs.
          </p>
          <p className="mt-1.5 font-semibold">Borrow about {usd(r.borrowLessCents)} less for spring and use savings instead: roughly <span className="text-accent-strong">{usd(r.interestSavedPerYearCents)} a year</span> less interest.</p>
          <p className="mt-1.5 text-xs text-muted">Federal loans can be returned within 120 days of disbursement with no interest or fees: up to {usd(r.federalReturnableCents)} of the winter federal loan, by {fmtDate(r.returnByDate)}. Private loans set their own rules.</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">No borrowed money looks idle at the next refund: this quarter&apos;s borrowing is about right.</p>
      )}
    </Card>
  );
}

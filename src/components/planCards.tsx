"use client";

import { refundPlan, retirementPlan, windfallSplits } from "@/lib/engine/plan";
import { fmtDate, toDate, usd } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { InfoTip } from "./InfoTip";
import { Card, Meter } from "./ui";

// Cards for lumpy income: retirement room, and a student's refund plan with the
// borrowed-money check. (Pay yourself and payment splits live in freelanceSection.tsx.)

const fmtMonthYear = (iso: string) => {
  const d = toDate(iso);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

// ---------------------------------------------------------------------------
// Retirement (freelance: SEP / Solo 401(k); steady: employer 401(k) match)

export function RetirementCard({ p }: { p: Profile }) {
  const r = retirementPlan(p);
  if (r.kind === "none") return null;

  if (r.kind === "self_employed") {
    const plan = p.retirement!.plan === "sep_ira" ? "SEP IRA" : "Solo 401(k)";
    const limit = p.retirement!.plan === "sep_ira" ? r.sepLimitCents : r.soloLimitCents;
    const fromPayments = windfallSplits(p).reduce((s, w) => s + (w.legs.find((l) => l.kind === "retirement")?.amountCents ?? 0), 0);
    return (
      <section className="card grid gap-6 p-5 lg:grid-cols-2">
        <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-muted">{plan}, put in so far in 2026</span>
          <span className="tabular font-extrabold">{usd(r.ytdCents)} <span className="text-sm font-bold text-muted">of about {usd(limit)}</span></span>
        </div>
        <div className="mt-2"><Meter value={r.ytdCents} max={Math.max(1, limit)} label="Retirement contributions this year" /></div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">Room left for 2026</dt><dd className="tabular font-extrabold">{usd(r.roomCents)}</dd></div>
          <div className="rounded-xl bg-[#f6f1e9] px-3 py-2"><dt className="text-[11px] font-bold text-accent-strong">From your next payments</dt><dd className="tabular font-extrabold">{usd(fromPayments)}</dd></div>
        </dl>
        </div>
        <div>
        <ul className="space-y-2 text-sm">
          <li><strong>Lowers your tax bill:</strong> every $1,000 in cuts this year&apos;s taxes by roughly {usd(r.taxSavedPer1000Cents)} at your {p.tax?.setAsidePct ?? 25}% set-aside rate.</li>
          <li><strong>Lumpy-income friendly:</strong> contributions for 2026 can go in any time until your filing deadline ({fmtMonthYear(r.deadline!)}, later with an extension), so put money in after good months.</li>
          {p.retirement!.plan === "sep_ira" && r.soloLimitCents > r.sepLimitCents && (
            <li className="text-muted">A <InfoTip term="soloVsSep">Solo 401(k)</InfoTip> would allow up to about {usd(r.soloLimitCents)} at your income, worth comparing if you want to save more.</li>
          )}
        </ul>
        <p className="mt-3 text-[11px] text-muted">Estimates for planning, not tax advice. Limits are 2026 IRS figures.</p>
        </div>
      </section>
    );
  }

  // Employer plan
  return (
    <section className="card grid gap-6 p-5 lg:grid-cols-2">
      <div>
      <div className="text-xs font-bold text-accent-strong">Your workplace 401(k)</div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">You contribute</span>
        <span className="font-extrabold">{r.contributionPct}% of pay</span>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">Employer matches up to</span>
        <span className="font-extrabold">{r.matchUpToPct}% of pay</span>
      </div>
      </div>
      <div>
      {r.raiseToPct ? (
        <div className="rounded-xl bg-sun-soft p-3 ring-1 ring-sun">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-tight">Suggestion</div>
          <p className="mt-1 font-semibold">Raise to {r.raiseToPct}% to get the full match: about <span className="text-accent-strong">{usd(r.matchGainedPerYearCents!)} a year</span> in free money.</p>
          <p className="mt-1 text-xs text-muted">Costs about {usd(r.costPerPaycheckCents!)} less take-home per paycheck, since contributions come out before tax.</p>
        </div>
      ) : (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm ring-1 ring-accent/20">You&apos;re getting the full match. Common next step: add 1% a year until you reach 10–15%.</p>
      )}
      <p className="mt-3 text-[11px] text-muted">Estimates for planning, not tax or investment advice.</p>
      </div>
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

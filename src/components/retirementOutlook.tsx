"use client";

// Retirement card: the long-term outlook (Low / Expected / High balance against
// what you'd need), with a toggle to this year's contributions by quarter and
// what would keep pace. Numbers come from retirementOutlook() in the engine.

import { useState, type ReactNode } from "react";
import { OUTLOOK_RULES, type KeepPace, type RetirementOutlook } from "@/lib/engine/plan";
import { fmtDate, usd } from "@/lib/format";
import { InfoTip } from "./InfoTip";
import { Chip } from "./ui";

const YOU = "var(--accent)";
const MATCH = "#7cc4ad";
const NEED = "var(--tight)";

/** Long-range projections are rough: show them to the nearest $1,000. */
const k = (cents: number) => usd(Math.round(cents / 100_000) * 100_000);

function compact(cents: number) {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(d >= 10_000_000 ? 0 : 1)}M`;
  if (d >= 1000) return `$${Math.round(d / 1000)}k`;
  return `$${Math.round(d)}`;
}

function step(max: number, count = 4) {
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => max / s <= count) ?? 10 * pow;
}

export function RetirementPanel({ o, planName }: { o: RetirementOutlook; planName: string }) {
  const [view, setView] = useState<"outlook" | "recent">("outlook");
  return view === "outlook" ? (
    <LongTermOutlook o={o} action={<LinkButton onClick={() => setView("recent")}>Recent contributions →</LinkButton>} />
  ) : (
    <RecentContributions o={o} planName={planName} action={<LinkButton onClick={() => setView("outlook")}>← Back to outlook</LinkButton>} />
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-sm font-bold text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Long-term outlook

function LongTermOutlook({ o, action }: { o: RetirementOutlook; action: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const R = OUTLOOK_RULES;
  const pts = o.path;
  const needPts = pts.filter((p) => p.age >= R.earliestAge);

  const W = 900;
  const H = 240;
  const PAD = { top: 12, right: 12, bottom: 26, left: 52 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const maxV = Math.max(...pts.map((p) => p.high), ...needPts.map((p) => p.needCents));
  const s = step(maxV, 4);
  const yMax = Math.ceil(maxV / s) * s;
  const ticks = Array.from({ length: Math.round(yMax / s) + 1 }, (_, i) => i * s);
  const x0 = pts[0].age;
  const x1 = pts[pts.length - 1].age;
  const x = (age: number) => PAD.left + ((age - x0) / Math.max(1, x1 - x0)) * iw;
  const y = (v: number) => PAD.top + ih - (Math.min(v, yMax) / yMax) * ih;
  const line = (sel: (p: (typeof pts)[number]) => number, list = pts) => list.map((p) => `${x(p.age)},${y(sel(p))}`).join(" ");
  const band = `${line((p) => p.high)} ${line((p) => p.low, [...pts].reverse())}`;
  const ageTicks = pts.filter((p) => p.age % 5 === 0 || p.age === o.retirementAge).map((p) => p.age).filter((a) => a === o.retirementAge || Math.abs(a - o.retirementAge) > 1);
  const a = active === null ? null : pts.find((p) => p.age === active)!;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const age = Math.round(x0 + ((px - PAD.left) / iw) * (x1 - x0));
    setActive(Math.max(x0, Math.min(x1, age)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted">
            <InfoTip term="retirementOutlook">Long-term outlook</InfoTip>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="tabular text-2xl font-extrabold">
              {o.readinessPct}% <span className="text-sm font-bold text-muted">of what you&apos;ll need at {o.retirementAge}</span>
            </span>
            <Chip tone={o.readinessPct >= 100 ? "accent" : "tight"}>{o.readyAge ? `Ready around ${o.readyAge}` : `Not by ${R.lastAge} at this rate`}</Chip>
          </div>
        </div>
        {action}
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Projected retirement savings: about ${k(o.atRetirement.base)} at ${o.retirementAge} in the expected case, against ${k(o.atRetirement.needCents)} needed.`} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{compact(t)}</text>
            </g>
          ))}
          {ageTicks.map((age) => (
            <text key={age} x={x(age)} y={H - 6} textAnchor="middle" fontSize="12" fontWeight={age === o.retirementAge ? 700 : 400} fill={age === o.retirementAge ? "var(--text)" : "var(--muted)"}>{age}</text>
          ))}
          <line x1={x(o.retirementAge)} x2={x(o.retirementAge)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--line)" strokeWidth={1.5} />
          <polygon points={band} fill="var(--band)" opacity={0.7} />
          <polyline points={line((p) => p.needCents, needPts)} fill="none" stroke={NEED} strokeWidth={2} strokeDasharray="6 5" />
          <polyline points={line((p) => p.base)} fill="none" stroke={YOU} strokeWidth={2.5} strokeLinejoin="round" />
          {a && (
            <g pointerEvents="none">
              <line x1={x(a.age)} x2={x(a.age)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--muted)" strokeDasharray="2 3" />
              <circle cx={x(a.age)} cy={y(a.base)} r={5} fill={YOU} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {a && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-md ring-1 ring-line"
            style={{ left: `${(x(a.age) / W) * 100}%`, transform: x(a.age) > W * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
          >
            <div className="font-bold">At {a.age}</div>
            <div className="tabular">Low: {k(a.low)}</div>
            <div className="tabular font-bold">Expected: {k(a.base)}</div>
            <div className="tabular">High: {k(a.high)}</div>
            {a.age >= R.earliestAge && <div className="tabular text-tight">Need: {k(a.needCents)}</div>}
          </div>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <Legend
          items={[
            { label: "Expected", swatch: <span className="inline-block h-0.5 w-4 rounded" style={{ background: YOU }} /> },
            { label: "Low – High", swatch: <Swatch color="var(--band)" /> },
            { label: "Need", swatch: <Dash /> },
          ]}
        />
        {o.atRule && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs ring-1 ring-accent/20">
            Saving 15% ({usd(o.atRule.annualContributionCents)}/yr): <strong>{o.atRule.readyAge ? `ready around ${o.atRule.readyAge}` : `${o.atRule.readinessPct}% at ${o.retirementAge}`}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent contributions: this year by quarter, against the 15% pace

function RecentContributions({ o, planName, action }: { o: RetirementOutlook; planName: string; action: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const employer = o.keepPace.kind === "employer";
  const qs = o.quarters;
  const pct = o.paceQuarterCents > 0 ? Math.round((o.avgQuarterCents * 100) / o.paceQuarterCents) : 100;

  const W = 420;
  const H = 190;
  const PAD = { top: 12, right: 8, bottom: 26, left: 48 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const maxV = Math.max(o.paceQuarterCents, ...qs.map((q) => q.youCents + q.employerCents)) * 1.08;
  const s = step(maxV, 4);
  const yMax = Math.ceil(maxV / s) * s;
  const ticks = Array.from({ length: Math.round(yMax / s) + 1 }, (_, i) => i * s);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const slot = iw / Math.max(qs.length, 4);
  const bw = Math.min(56, slot - 20);
  const bx = (i: number) => PAD.left + slot * i + (slot - bw) / 2;
  const a = active === null ? null : qs[active];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted">
            <InfoTip tip={{ title: planName, body: planTip(o.keepPace) }}>{planName}</InfoTip> · 2026 by quarter
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="tabular text-2xl font-extrabold">
              {usd(o.avgQuarterCents)} <span className="text-sm font-bold text-muted">average per quarter</span>
            </span>
            <Chip tone={pct >= 100 ? "accent" : "tight"}>{pct}% of the 15% pace</Chip>
          </div>
        </div>
        {action}
      </div>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Retirement contributions by quarter: ${usd(o.avgQuarterCents)} average against a ${usd(o.paceQuarterCents)} pace.`} onMouseLeave={() => setActive(null)}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                  <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{compact(t)}</text>
                </g>
              ))}
              {qs.map((q, i) => {
                const total = q.youCents + q.employerCents;
                const op = q.complete ? 1 : 0.55;
                return (
                  <g key={q.label}>
                    {active === i && <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={ih} fill="var(--accent-soft)" opacity={0.6} />}
                    {q.youCents > 0 && <rect x={bx(i)} y={y(q.youCents)} width={bw} height={Math.max(1, PAD.top + ih - y(q.youCents))} rx={4} fill={YOU} opacity={op} />}
                    {q.employerCents > 0 && <rect x={bx(i)} y={y(total)} width={bw} height={Math.max(1, y(q.youCents) - y(total) - 2)} rx={4} fill={MATCH} opacity={op} />}
                    <text x={bx(i) + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{q.complete ? q.label : `${q.label} so far`}</text>
                    <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={ih} fill="transparent" onMouseEnter={() => setActive(i)} />
                  </g>
                );
              })}
              <line x1={PAD.left} x2={W - PAD.right} y1={y(o.paceQuarterCents)} y2={y(o.paceQuarterCents)} stroke={NEED} strokeWidth={1.5} strokeDasharray="5 4" pointerEvents="none" />
            </svg>
            {a && active !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 w-max rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-md ring-1 ring-line"
                style={{ left: `${((bx(active) + bw) / W) * 100}%`, transform: active >= 2 ? `translateX(calc(-100% - ${bw * 0.6}px))` : "translateX(8px)" }}
              >
                <div className="font-bold">{a.label}: {fmtDate(a.start)} – {a.complete ? fmtDate(a.end) : "today"}</div>
                <div className="tabular">You: {usd(a.youCents)}</div>
                {employer && <div className="tabular">Match: {usd(a.employerCents)}</div>}
                <div className="tabular text-muted">15% pace: {usd(o.paceQuarterCents)}</div>
              </div>
            )}
          </div>
          <Legend items={[{ label: "You", swatch: <Swatch color={YOU} /> }, ...(employer ? [{ label: "Employer match", swatch: <Swatch color={MATCH} /> }] : []), { label: "15% pace", swatch: <Dash /> }]} />
        </div>

        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-tight">To keep pace</div>
          <ul className="mt-2 space-y-2">
            {keepPaceItems(o.keepPace).map((it, i) => (
              <li key={i} className="rounded-xl bg-[#f6f1e9] px-3 py-2.5 text-sm">{it}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">Estimates for planning, not tax or investment advice.</p>
        </div>
      </div>
    </div>
  );
}

function planTip(kp: KeepPace): ReactNode {
  if (kp.kind === "self_employed") {
    return (
      <>
        Your 2026 limit is about {usd(kp.planLimitCents)} at your income.
        {kp.soloLimitCents ? ` A Solo 401(k) would allow up to about ${usd(kp.soloLimitCents)}, worth comparing if you want to save more.` : ""}
      </>
    );
  }
  return <>Contributions come out of each paycheck before tax. Your employer adds a match on top.</>;
}

function keepPaceItems(kp: KeepPace): ReactNode[] {
  if (kp.kind === "self_employed") {
    const items: ReactNode[] = [];
    if (kp.sharePct > kp.currentSharePct) {
      items.push(
        <>
          Raise your{" "}
          <InfoTip tip={{ title: `Why ${kp.sharePct}%?`, body: `Saving 15% of pre-tax income works out to about ${kp.sharePct}% of what's left after your tax set-aside. Every $1,000 you put in also cuts this year's taxes by roughly ${usd(kp.taxSavedPer1000Cents)}.` }}>
            Payday Plan share
          </InfoTip>{" "}
          to <strong>{kp.sharePct}%</strong> of each payment (now {kp.currentSharePct}%).
        </>,
      );
    }
    if (kp.catchUpCents > 0) {
      items.push(
        <>
          <InfoTip tip={{ title: "Catching up", body: `Contributions for 2026 can go in any time until your filing deadline (${fmtDate(kp.deadline)}, ${kp.deadline.slice(0, 4)}, later with an extension), so you can top up after good months.` }}>
            Catch up
          </InfoTip>{" "}
          <strong>{usd(kp.catchUpCents)}</strong> for 2026 by {fmtDate(kp.deadline)}.
        </>,
      );
    }
    return items.length ? items : ["You're at the 15% pace. Keep it up."];
  }
  const items: ReactNode[] = [];
  if (kp.matchPct) {
    items.push(
      <>
        Raise to <strong>{kp.matchPct}%</strong> to get the full match: about{" "}
        <InfoTip tip={{ title: "Free money", body: `Costs about ${usd(kp.costPerPaycheckCents)} less take-home per paycheck, since contributions come out before tax.` }}>
          <strong className="text-accent-strong">{usd(kp.matchGainedPerYearCents)} a year</strong>
        </InfoTip>{" "}
        free.
      </>,
    );
  }
  if (kp.pacePct > Math.max(kp.currentPct, kp.matchPct ?? 0)) {
    items.push(
      <>
        {kp.matchPct ? "Then work" : "Work"} up to{" "}
        <InfoTip tip={{ title: "Getting to 15%", body: "A common approach: raise it 1% a year, or each time you get a raise, so your take-home never drops much." }}>
          <strong>{kp.pacePct}%</strong>
        </InfoTip>{" "}
        (15% with the match).
      </>,
    );
  }
  return items.length ? items : ["You're at the 15% pace. Keep it up."];
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />;
}

function Dash() {
  return <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: NEED }} />;
}

function Legend({ items }: { items: { label: string; swatch: ReactNode }[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">{it.swatch}{it.label}</span>
      ))}
    </div>
  );
}

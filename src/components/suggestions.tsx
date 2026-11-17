"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Fix, Forecast, Reasons, Status, WeekResult, WindowResult } from "@/lib/engine/forecast";
import { fmtDate, fmtRange, usd } from "@/lib/format";
import { StatusBadge } from "./ui";

// How the forecast's suggestions are shown: hover a flagged week for its advice,
// or open the Suggestions button in the Cash Forecast header to see them all.

const RANK: Status[] = ["ok", "tight", "short", "shortfall"];

export interface FlaggedRun {
  lead: WindowResult; // first window of the run; carries reasons and fix
  status: Status; // worst status in the run
  headline: string;
  weeks: [number, number]; // first and last week index (1..12)
  start: string;
  end: string;
}

/** Each flagged stretch of the forecast, explained once. */
export function flaggedRuns(f: Forecast): FlaggedRun[] {
  return f.windows
    .filter((w) => w.reasons && !w.continuesFrom)
    .map((w) => {
      const run = f.windows.filter((x) => x.index === w.index || x.continuesFrom === w.index);
      const last = run[run.length - 1];
      const status = run.reduce<Status>((s, x) => (RANK.indexOf(x.status) > RANK.indexOf(s) ? x.status : s), "ok");
      const headline =
        status === "shortfall" ? "Short, even with savings" : status === "short" ? (f.scope === "cash" ? "Cash dips below $0" : "Checking dips below $0") : "Tight but positive";
      return { lead: w, status, headline, weeks: [w.index * 2 - 1, last.index * 2], start: w.start, end: last.end };
    });
}

/** The run that a given week (1..12) belongs to, if any. */
export function runForWeek(runs: FlaggedRun[], week: number) {
  return runs.find((r) => week >= r.weeks[0] && week <= r.weeks[1]);
}

/** The full explanation: sentence plus the items that cause the dip. */
export function ReasonDetail({ r }: { r: FlaggedRun }) {
  const reasons = r.lead.reasons!;
  return (
    <div className="text-sm">
      <p className="leading-relaxed text-ink">{reasons.sentence}</p>
      {reasons.outflows.length > 0 && (
        <ul className="mt-2 space-y-1">
          {reasons.outflows.map((o) => (
            <li key={o.label + o.date} className="flex justify-between gap-3 border-b border-dashed border-line pb-1 last:border-0">
              <span><span className="text-muted">{fmtDate(o.date)}</span> · {o.label}</span>
              <span className="tabular font-bold">{usd(o.amount)}</span>
            </li>
          ))}
          {reasons.waitingFor && (
            <li className="flex justify-between gap-3 text-accent-strong">
              <span>{fmtDate(reasons.waitingFor.earliest)}–{fmtDate(reasons.waitingFor.latest)} · {reasons.waitingFor.label} (waiting)</span>
              <span className="tabular font-bold">{usd(reasons.waitingFor.amount, { sign: true })}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function weeksText(r: FlaggedRun) {
  return fmtRange(r.start, r.end);
}

// ---------------------------------------------------------------------------
// The Suggestions button: every suggestion, with the exact money move spelled out.

function fmtDayShort(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]}, ${fmtDate(iso)}`;
}

/** Boxes and arrows: each savings account on the left, an arrow carrying the
 * amount, all pointing into the one checking account on the right. */
export function MoveFlow({ fix, compact = false }: { fix: Fix; compact?: boolean }) {
  const legs = fix.legs ?? [];
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,0.85fr)] items-center gap-x-1.5 gap-y-1.5 ${compact ? "text-xs" : "text-sm"}`}>
      {legs.map((l, i) => (
        <div key={l.accountId} className="contents">
          <span className="rounded-lg bg-surface px-2 py-1 ring-1 ring-line" style={{ gridRow: i + 1, gridColumn: 1 }}>
            <span className="block font-bold leading-tight">{l.account}</span>
            <span className="block text-[11px] text-muted">{compact ? `${usd(l.balance)} now` : `${usd(l.balance)} now · ${usd(l.balance - l.amount)} after`}</span>
          </span>
          <span className="text-center text-xs font-bold text-tight" style={{ gridRow: i + 1, gridColumn: 2 }}>
            {usd(l.amount)}
            <svg className="mx-auto" width="28" height="10" viewBox="0 0 28 10" aria-hidden="true"><path d="M1 5h24M21 1.5 25 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
      ))}
      {legs.length > 0 && (
        <span className="flex h-full flex-col justify-center rounded-lg bg-surface px-2 py-1 ring-2 ring-accent/40" style={{ gridColumn: 3, gridRow: `1 / span ${legs.length}` }}>
          <span className="block font-bold leading-tight">{fix.to}</span>
          <span className="block text-[11px] text-muted">checking{legs.length > 1 ? ` · +${usd(fix.amount)}` : ""}</span>
        </span>
      )}
    </div>
  );
}

/** Compact move: amount + deadline, then the boxes and arrows. Falls back to text for non-moves. */
export function MoveSummary({ fix, compact = false }: { fix: Fix; compact?: boolean }) {
  if (fix.kind === "move" && fix.amount > 0 && fix.legs?.length) {
    return (
      <div className="rounded-xl bg-sun-soft p-2.5 ring-1 ring-sun">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="tabular text-base font-extrabold">Move {usd(fix.amount)}</span>
          {fix.by && <span className="text-xs font-bold text-tight">by {fmtDayShort(fix.by)}</span>}
        </div>
        <MoveFlow fix={fix} compact={compact} />
      </div>
    );
  }
  return <p className={`rounded-lg px-2.5 py-1.5 text-sm ${fix.kind === "shortfall" ? "bg-warn-soft ring-1 ring-warn/30" : "text-muted"}`}>{fix.sentence}</p>;
}

function MoveCard({ r }: { r: FlaggedRun }) {
  const fix = r.lead.fix!;
  return (
    <div className="rounded-xl bg-sun-soft p-3 ring-1 ring-sun">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-tight">Move money</span>
        {fix.by && <span className="text-xs font-bold text-tight">by {fmtDayShort(fix.by)}</span>}
      </div>
      <div className="tabular mt-0.5 text-2xl font-extrabold">{usd(fix.amount)}</div>
      <div className="mt-2"><MoveFlow fix={fix} /></div>
      <p className="mt-2 text-xs text-muted">{fix.rule}</p>
    </div>
  );
}

export function SuggestionsButton({ f, p }: { f: Forecast; p: { name: string } }) {
  const runs = flaggedRuns(f);
  const [open, setOpen] = useState(false);
  // Open toward whichever side has room, so the card never runs off the screen.
  const [alignRight, setAlignRight] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = () => {
    if (!open && wrap.current) {
      const r = wrap.current.getBoundingClientRect();
      const width = Math.min(460, window.innerWidth - 32);
      setAlignRight(r.left + width > window.innerWidth - 16);
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (runs.length === 0) return <span className="text-xs font-bold text-accent-strong">✓ No suggestions</span>;
  // Most urgent first: real shortfalls, then money moves, then heads-ups.
  const sorted = [...runs].sort((a, b) => RANK.indexOf(b.status) - RANK.indexOf(a.status) || a.weeks[0] - b.weeks[0]);
  const urgent = runs.some((r) => r.status === "short" || r.status === "shortfall");
  const first = p.name.split(" ")[0];

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 transition-colors ${urgent ? "bg-sun-soft text-tight ring-sun hover:bg-sun/40" : "bg-accent-soft text-accent-strong ring-accent/30"}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5a4 4 0 0 0-2.3 7.3V10.5h4.6V8.8A4 4 0 0 0 7 1.5ZM5.2 12.5h3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {runs.length} suggestion{runs.length === 1 ? "" : "s"}
      </button>
      {open && (
        <div role="dialog" aria-label="Suggestions" className={`absolute ${alignRight ? "right-0" : "left-0"} top-full z-30 mt-2 max-h-[75vh] w-[min(460px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl`}>
          <div className="border-b border-line px-4 py-3">
            <div className="font-display text-base font-bold">Suggestions for {first}</div>
          </div>
          <ol className="divide-y divide-line">
            {sorted.map((r) => {
              const fix = r.lead.fix;
              return (
                <li key={r.lead.index} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} tip={false} />
                    <span className="font-bold">{r.headline}</span>
                    <span className="text-xs text-muted">{weeksText(r)}</span>
                  </div>
                  {fix?.kind === "move" && fix.amount > 0 && <MoveCard r={r} />}
                  {fix?.kind === "shortfall" && (
                    <div className="rounded-xl bg-warn-soft p-3 text-sm ring-1 ring-warn/30">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-warn">About {usd(fix.amount)} short</div>
                      <p className="mt-1">{fix.sentence}</p>
                    </div>
                  )}
                  {fix?.kind === "move" && fix.amount === 0 && <p className="text-sm text-muted">{fix.sentence}</p>}
                  <details>
                    <summary className="cursor-pointer text-xs font-bold text-accent-strong">Why this is flagged</summary>
                    <div className="mt-1.5"><ReasonDetail r={r} /></div>
                  </details>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hover a flagged week for half a second to see why and what to do.

export function HoverCard({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // After a click (the week opens in full), stay closed until the pointer leaves.
  const suppressed = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const show = () => {
    clear();
    if (suppressed.current) return;
    const r = wrap.current?.getBoundingClientRect();
    if (r) setAlignRight(r.left + 340 > window.innerWidth);
    setOpen(true);
  };
  useEffect(() => clear, []);
  if (!content) return <>{children}</>;
  return (
    <div
      ref={wrap}
      className="relative"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { clear(); timer.current = setTimeout(show, 500); } }}
      onPointerLeave={() => { clear(); suppressed.current = false; timer.current = setTimeout(() => setOpen(false), 120); }}
      onPointerDown={() => { clear(); suppressed.current = true; setOpen(false); }}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div role="tooltip" className={`absolute top-full z-30 mt-2 w-[22rem] rounded-2xl border border-line bg-surface p-3 shadow-2xl ${alignRight ? "right-0" : "left-0"}`}>
          {content}
        </div>
      )}
    </div>
  );
}

/** What causes the dip, as up to three line items (date · item · amount), plus the payment it's waiting on. */
export function ReasonItems({ reasons }: { reasons: Reasons }) {
  const items = reasons.outflows.slice(0, 3);
  const wait = reasons.waitingFor;
  if (items.length === 0) return <p className="text-xs text-muted">{reasons.sentence}</p>;
  return (
    <div>
      <div className="cat-head mb-1 text-[10px]">Why</div>
      <ul className="divide-y divide-line text-xs">
        {items.map((o) => (
          <li key={o.label + o.date} className="flex items-baseline justify-between gap-2 py-1">
            <span className="min-w-0">
              <span className="inline-block w-12 text-muted">{fmtDate(o.date)}</span>
              <span className="font-bold">{o.label}</span>
            </span>
            <span className="tabular shrink-0 font-bold">{usd(o.amount)}</span>
          </li>
        ))}
      </ul>
      {wait && (
        <p className="mt-1 text-[11px] text-accent-strong">
          …all before {wait.label} pays <span className="font-bold">{usd(wait.amount, { sign: true })}</span>, likely {wait.earliest === wait.latest ? fmtDate(wait.latest) : `${fmtDate(wait.earliest)}–${fmtDate(wait.latest)}`}.
        </p>
      )}
    </div>
  );
}

/** Hover card for a week tile: the three cases, then (if flagged) the move and why. */
export function WeekTip({ week, r, onOpen }: { week: WeekResult; r?: FlaggedRun; onOpen?: () => void }) {
  const cases: [string, number, string][] = [
    ["Low", week.low, "ring-1 ring-line"],
    ["Expected", week.base, "ring-2 ring-accent/45"],
    ["High", week.high, "ring-1 ring-line"],
  ];
  return (
    <div className="space-y-2.5 text-left">
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {cases.map(([label, v, bg]) => (
          <div key={label} className={`rounded-lg bg-[#f8f4ee] px-1.5 py-1.5 ${bg}`}>
            <div className="text-[10px] font-bold text-accent-strong">{label}</div>
            <div className={`tabular font-extrabold ${label === "Expected" ? "text-base" : "text-sm"} ${v < 0 ? "text-warn" : ""}`}>{usd(v)}</div>
          </div>
        ))}
      </div>
      {r?.lead.fix && <MoveSummary fix={r.lead.fix} compact />}
      {r && <ReasonItems reasons={r.lead.reasons!} />}
      {onOpen ? (
        <button type="button" onClick={onOpen} className="text-[11px] font-bold text-accent-strong hover:underline">See week details →</button>
      ) : (
        <p className="text-[11px] font-bold text-accent-strong">See week details →</p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

export interface ChartWeek {
  index: number;
  label: string; // "Nov 14 – 20"
  low: number;
  base: number;
  high: number;
  status: "ok" | "tight" | "short" | "shortfall";
}

const W = 720;
const H = 230;
const PAD = { top: 16, right: 16, bottom: 34, left: 56 };

const STATUS_TEXT = { ok: "On track", tight: "Tight", short: "Checking dips below $0", shortfall: "Short even with savings" };

function money(cents: number) {
  const d = Math.round(cents / 100);
  return `${d < 0 ? "−" : ""}$${Math.abs(d).toLocaleString("en-US")}`;
}

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count) ?? 10 * pow;
  // Extend to the next whole step on both ends so no data is clipped.
  const ticks: number[] = [];
  const end = Math.ceil(max / step) * step;
  for (let v = Math.floor(min / step) * step; v <= end + 1e-6; v += step) ticks.push(Math.round(v));
  return ticks;
}

function tickLabel(cents: number, compact: boolean) {
  const d = cents / 100;
  if (d === 0) return "$0";
  const sign = d < 0 ? "−" : "";
  const a = Math.abs(d);
  return compact ? `${sign}$${a % 1000 === 0 ? a / 1000 : (a / 1000).toFixed(1)}k` : `${sign}$${a.toLocaleString("en-US")}`;
}

export function ForecastChart({ weeks, title }: { weeks: ChartWeek[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const lo = Math.min(0, ...weeks.map((w) => w.low));
  const hi = Math.max(...weeks.map((w) => w.high));
  const ticks = niceTicks(lo, hi);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const compact = Math.max(Math.abs(yMin), Math.abs(yMax)) >= 1_000_000;

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (iw * (i + 0.5)) / weeks.length;
  const y = (v: number) => PAD.top + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const highPts = weeks.map((w, i) => `${x(i)},${y(w.high)}`);
  const lowPts = weeks.map((w, i) => `${x(i)},${y(w.low)}`).reverse();
  const band = `M${highPts.join(" L")} L${lowPts.join(" L")} Z`;
  const baseLine = `M${weeks.map((w, i) => `${x(i)},${y(w.base)}`).join(" L")}`;

  function indexFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    const i = Math.floor(((px - PAD.left) / iw) * weeks.length);
    return Math.max(0, Math.min(weeks.length - 1, i));
  }

  const a = active !== null ? weeks[active] : null;
  const tipLeftPct = active !== null ? (x(active) / W) * 100 : 0;

  return (
    <figure className="relative m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y select-none outline-none"
        role="img"
        aria-label={`${title}. Use left and right arrow keys to read each week.`}
        tabIndex={0}
        onPointerMove={(e) => setActive(indexFromClientX(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((v) => v ?? 0)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { setActive((v) => Math.min(weeks.length - 1, (v ?? -1) + 1)); e.preventDefault(); }
          if (e.key === "ArrowLeft") { setActive((v) => Math.max(0, (v ?? 1) - 1)); e.preventDefault(); }
          if (e.key === "Escape") setActive(null);
        }}
      >
        {/* gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#b9ad99" : "var(--grid)"} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="tabular fill-[var(--muted)] text-[11px]">
              {tickLabel(t, compact)}
            </text>
          </g>
        ))}
        {/* week labels: every other week to avoid crowding */}
        {weeks.map((w, i) =>
          i % 2 === 0 ? (
            <text key={w.index} x={x(i)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
              {w.label.split(" – ")[0]}
            </text>
          ) : null,
        )}
        {/* range band + base line */}
        <path d={band} fill="var(--accent)" fillOpacity={0.12} />
        <path d={baseLine} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* flagged weeks: marker at the low end of the range */}
        {weeks.map((w, i) =>
          w.status === "short" || w.status === "shortfall" ? (
            <circle key={`f${w.index}`} cx={x(i)} cy={y(w.low)} r={5} fill={w.status === "shortfall" ? "var(--warn)" : "var(--tight)"} stroke="var(--surface)" strokeWidth={2} />
          ) : null,
        )}
        {/* crosshair */}
        {a && active !== null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + ih} stroke="#9aa5b1" strokeWidth={1} />
            <circle cx={x(active)} cy={y(a.base)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {a && active !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-52 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg"
          style={{ left: `clamp(0px, calc(${tipLeftPct}% - 104px), calc(100% - 208px))` }}
          role="status"
        >
          <div className="mb-1 text-xs font-bold text-muted">Week {a.index} · {a.label}</div>
          <div className="flex items-baseline justify-between"><span className="text-muted">Likely low point</span><strong className="tabular">{money(a.base)}</strong></div>
          <div className="flex items-baseline justify-between"><span className="text-muted">Cautious case</span><span className="tabular">{money(a.low)}</span></div>
          <div className="flex items-baseline justify-between"><span className="text-muted">Good case</span><span className="tabular">{money(a.high)}</span></div>
          {a.status !== "ok" && <div className="mt-2 border-t border-line pt-2 text-xs font-bold text-ink">⚠ {STATUS_TEXT[a.status]}</div>}
        </div>
      )}
    </figure>
  );
}

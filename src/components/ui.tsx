import Link from "next/link";
import type { ReactNode } from "react";
import type { Status } from "@/lib/engine/forecast";
import { InfoTip } from "./InfoTip";
import type { Profile } from "@/lib/types";

export function Card({ title, subtitle, children, className = "", action }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS: Record<Status, { label: string; cls: string; icon: ReactNode }> = {
  ok: { label: "On track", cls: "bg-accent-soft text-accent-strong", icon: <CheckIcon /> },
  tight: { label: "Tight", cls: "bg-tight-soft text-tight", icon: <AlertIcon /> },
  short: { label: "Move money", cls: "bg-tight-soft text-tight ring-1 ring-tight/40", icon: <ArrowsIcon /> },
  shortfall: { label: "Short", cls: "bg-warn-soft text-warn ring-1 ring-warn/40", icon: <AlertIcon /> },
};

export function StatusBadge({ status, className = "", tip = true }: { status: Status; className?: string; tip?: boolean }) {
  const s = STATUS[status];
  const badge = (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls} ${className}`}>
      {s.icon}
      {s.label}
    </span>
  );
  return tip ? <InfoTip term={status} underline={false}>{badge}</InfoTip> : badge;
}

export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "tight" | "warn" }) {
  const cls = {
    muted: "bg-[#f1ece4] text-muted",
    accent: "bg-accent-soft text-accent-strong",
    tight: "bg-tight-soft text-tight",
    warn: "bg-warn-soft text-warn",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

export function Meter({ value, max, tone = "accent", label }: { value: number; max: number; tone?: "accent" | "tight" | "warn"; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = { accent: "bg-accent", tight: "bg-[var(--tight)]", warn: "bg-warn" }[tone];
  const track = { accent: "bg-accent-soft", tight: "bg-tight-soft", warn: "bg-warn-soft" }[tone];
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-label={label}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PersonaSwitcher({ profiles, active, section }: { profiles: Profile[]; active: string; section?: string }) {
  return (
    <nav aria-label="Demo profiles" className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto rounded-2xl bg-surface/70 p-1 ring-1 ring-line backdrop-blur">
      {profiles.map((p) => {
        const on = p.slug === active;
        return (
          <Link
            key={p.slug}
            href={`/dashboard/${p.slug}${section ? `/${section}` : ""}`}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`flex min-w-0 shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors ${on ? "bg-accent text-white shadow-sm" : "text-ink hover:bg-accent-soft"}`}
          >
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${on ? "bg-white/20" : "bg-sun-soft text-ink ring-1 ring-sun"}`}>{p.initials}</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">{p.name}</span>
              <span className={`block text-[11px] ${on ? "text-white/80" : "text-muted"}`}>
                {p.profileType === "student" ? "Student" : p.profileType === "freelance" ? "Freelance" : "Steady income"} · {p.city}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}
function AlertIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M6 5v2.4M6 8.9v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  );
}
function ArrowsIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4h7.5M7.5 2l2 2-2 2M10 8H2.5M4.5 6l-2 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

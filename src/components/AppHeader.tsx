"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Section = "setup";

/** What changes between the demo, the sample-data preview and a signed-in user's app. */
export interface Chrome {
  /** Where this dashboard lives; Account Details is basePath + "/setup". */
  basePath: string;
  /** Kept on both tabs' links, e.g. "?style=push" in the demo. */
  query?: string;
  /** Where the logo goes. */
  homeHref?: string;
  /** A label next to the logo, e.g. "Demo data" or "Sample data". */
  badge?: string;
  /** Right side of the header: the persona switcher, or the account menu. */
  right?: ReactNode;
  /** A strip under the header (demo edits, preview notice). */
  banner?: ReactNode;
}

export function AppHeader({ chrome, section, setupAlert }: { chrome: Chrome; section?: Section; setupAlert?: boolean }) {
  const tabs = [
    { label: "Forecast", href: `${chrome.basePath}${chrome.query ?? ""}`, on: section === undefined, alert: false },
    { label: "Account Details", href: `${chrome.basePath}/setup${chrome.query ?? ""}`, on: section === "setup", alert: Boolean(setupAlert) },
  ];
  return (
    <>
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href={chrome.homeHref ?? "/"} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
            <span className="font-display text-xl font-bold">Runway</span>
            {chrome.badge && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-bold text-tight ring-1 ring-sun">{chrome.badge}</span>}
          </Link>
          <nav aria-label="Sections" className="flex gap-1">
            {tabs.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                aria-current={t.on ? "page" : undefined}
                title={t.alert ? "An account has not synced in a few days" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${t.on ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-accent-soft hover:text-ink"}`}
              >
                {t.label}
                {t.alert && <span className="size-2 rounded-full bg-[var(--tight)]" aria-label="an account is out of date" />}
              </Link>
            ))}
          </nav>
        </div>
        {chrome.right}
      </div>
    </header>
    {chrome.banner}
    </>
  );
}

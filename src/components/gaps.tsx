"use client";

import { accountGaps, type AccountGap } from "@/lib/engine/gaps";
import { rulesOf } from "@/lib/engine/rules";
import type { Profile } from "@/lib/types";
import { InfoTip } from "./InfoTip";

// Account suggestions: account types the user is missing (never banks or funds).

export function GapsList({ p, onDismiss, onAct }: { p: Profile; onDismiss: (id: AccountGap["id"]) => void; onAct?: (g: AccountGap) => void }) {
  const gaps = accountGaps(p);
  if (gaps.length === 0) return null;
  return (
    <section aria-label="Account suggestions" className="space-y-2">
      <div className="text-xs font-extrabold uppercase tracking-wider text-tight">Worth setting up</div>
      <ul className="space-y-2">
        {gaps.map((g) => (
          <li key={g.id} className="rounded-xl bg-sun-soft px-3 py-2.5 ring-1 ring-sun">
            <div className="text-sm font-bold">{g.term ? <InfoTip term={g.term}>{g.title}</InfoTip> : g.title}</div>
            <p className="mt-0.5 text-sm">{g.why}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              {onAct && (
                <button type="button" onClick={() => onAct(g)} className="rounded-lg bg-accent px-2.5 py-1 text-white hover:bg-accent-strong">
                  {g.id === "emergency-goal" ? "Create goal" : g.id === "employer-match" ? "Update 401(k)" : "Add account"}
                </button>
              )}
              <button type="button" onClick={() => onDismiss(g.id)} className="rounded-lg px-2.5 py-1 text-muted ring-1 ring-line hover:text-ink">I have one</button>
              <button type="button" onClick={() => onDismiss(g.id)} className="rounded-lg px-2.5 py-1 text-muted hover:text-ink">Not now</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Update helper: remember a dismissed suggestion in the money rules. */
export function dismissGap(p: Profile, id: string): Profile {
  const r = rulesOf(p);
  return { ...p, rules: { ...p.rules, dismissedGaps: [...new Set([...r.dismissedGaps, id])] } };
}

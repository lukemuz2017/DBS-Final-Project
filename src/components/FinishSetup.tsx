"use client";

import { useEffect, useRef, useState } from "react";
import { accountGaps, type AccountGap } from "@/lib/engine/gaps";
import type { Profile } from "@/lib/types";
import { GapsList } from "./gaps";

// "Finish setup" next to Edit profile: the account suggestions still open for this
// person (tax savings, emergency fund, retirement, employer match, emergency goal).
// Hidden once there's nothing left.

export function FinishSetup({ p, onAct, onDismiss }: { p: Profile; onAct: (g: AccountGap) => void; onDismiss: (id: AccountGap["id"]) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const count = accountGaps(p).length;

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

  if (count === 0) return null;
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-lg bg-sun-soft px-2 py-0.5 text-xs font-bold text-tight ring-1 ring-sun hover:bg-sun/40"
      >
        Finish setup <span className="rounded-full bg-[var(--tight)] px-1.5 text-[10px] text-white">{count}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Finish setup" className="absolute left-0 top-full z-30 mt-2 max-h-[70vh] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-2xl">
          <GapsList
            p={p}
            onDismiss={onDismiss}
            onAct={(g) => {
              setOpen(false);
              onAct(g);
            }}
          />
        </div>
      )}
    </div>
  );
}

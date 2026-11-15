"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A right-hand slide-over built on the native <dialog> element, which gives
// focus trapping, Escape-to-close and screen-reader semantics for free.
export function Drawer({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line bg-[linear-gradient(160deg,var(--mint),#fdf3e6)] px-5 py-4">
            <div>
              <h2 id="drawer-title" className="font-display text-xl font-bold">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-white/70 hover:text-ink" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

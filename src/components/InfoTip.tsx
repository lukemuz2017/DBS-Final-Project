"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

const OPEN_DELAY = 500; // ms of hover before the explanation appears
const CLOSE_DELAY = 120; // grace period so the pointer can move onto the pop-up

// Only one explanation is open at a time: opening one closes the last.
let closeActive: (() => void) | null = null;

/**
 * Wraps a term in a hover/focus explanation.
 * - Mouse: appears after hovering for half a second.
 * - Keyboard: appears immediately on focus. Escape closes it.
 * - Touch: tap to toggle.
 */
export function InfoTip({ term, children, underline = true }: { term: GlossaryKey; children: ReactNode; underline?: boolean }) {
  const entry = GLOSSARY[term];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ above: boolean; alignRight: boolean }>({ above: false, alignRight: false });
  const wrap = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const hide = () => {
    clear();
    setOpen(false);
    if (closeActive === hide) closeActive = null;
  };

  const show = () => {
    clear();
    if (closeActive && closeActive !== hide) closeActive();
    closeActive = hide;
    const r = wrap.current?.getBoundingClientRect();
    if (r) setPlace({ above: r.bottom + 190 > window.innerHeight, alignRight: r.left + 290 > window.innerWidth });
    setOpen(true);
  };

  const scheduleShow = () => {
    clear();
    openTimer.current = setTimeout(show, OPEN_DELAY);
  };

  const scheduleHide = () => {
    clear();
    closeTimer.current = setTimeout(hide, CLOSE_DELAY);
  };

  useEffect(() => clear, []);

  return (
    <span
      ref={wrap}
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && scheduleShow()}
      onPointerLeave={(e) => e.pointerType === "mouse" && scheduleHide()}
    >
      <span
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
        onFocus={show}
        onBlur={scheduleHide}
        onClick={(e) => {
          // Taps toggle; clicks inside a parent button or link shouldn't fire it.
          e.stopPropagation();
          if (open) hide();
          else show();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") hide();
        }}
        className={`cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${underline ? "underline decoration-[var(--muted)]/50 decoration-dotted underline-offset-4 hover:decoration-accent" : ""}`}
      >
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          onPointerEnter={clear}
          onPointerLeave={scheduleHide}
          className={`absolute z-40 w-72 rounded-xl border border-line bg-surface p-3 text-left text-[13px] font-normal normal-case leading-snug tracking-normal text-ink shadow-xl ${
            place.above ? "bottom-full mb-2" : "top-full mt-2"
          } ${place.alignRight ? "right-0" : "left-0"}`}
        >
          <span className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-accent-strong">
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="var(--accent-soft)" stroke="currentColor" strokeWidth="1.2" /><path d="M7 6.2v3.6M7 4.1v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {entry.title}
          </span>
          <span className="block text-muted">{entry.body}</span>
        </span>
      )}
    </span>
  );
}

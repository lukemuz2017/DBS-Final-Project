"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

// The signed-in account button: initials (or the user's photo) in Runway's chip style,
// the name beside it, and a small menu. Replaces Clerk's default purple avatar.

/** `displayName`: the name from the user's Runway profile, when they have one. */
export function AccountButton({ displayName }: { displayName?: string }) {
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

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

  if (!isLoaded || !user) return <span aria-hidden="true" className="inline-block h-10 w-36 rounded-xl bg-surface/70 ring-1 ring-line" />;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  // The name from setup comes first; before setup, whatever the Clerk account has.
  const name = displayName?.trim() || user.fullName || user.firstName || user.username || email.split("@")[0] || "Your account";
  const initials = name.split(/[\s.+_-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-surface/70 px-2 py-1.5 text-left ring-1 ring-line backdrop-blur transition-colors hover:bg-accent-soft"
      >
        {user.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, already sized
          <img src={user.imageUrl} alt="" className="size-7 shrink-0 rounded-full object-cover ring-1 ring-sun" />
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sun-soft text-[11px] font-extrabold text-ink ring-1 ring-sun">{initials}</span>
        )}
        <span className="max-w-[12rem] truncate text-sm font-bold">{name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-bold">{name}</div>
            {email && <div className="truncate text-xs text-muted">{email}</div>}
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); openUserProfile(); }} className="block w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-accent-soft">
            Manage account
          </button>
          <button type="button" role="menuitem" onClick={() => signOut({ redirectUrl: "/sign-in" })} className="block w-full border-t border-line px-4 py-2.5 text-left text-sm font-bold text-muted hover:bg-accent-soft hover:text-ink">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

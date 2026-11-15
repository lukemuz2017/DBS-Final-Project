"use client";

// Demo-only persistence: edits to a persona are saved in this browser
// (localStorage, falling back to memory if storage is blocked). Nothing leaves
// the browser and nothing touches Supabase. "Reset demo" deletes the saved copy.

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Profile } from "../types";

const VERSION = "v1";
const key = (slug: string) => `runway-demo-${VERSION}:${slug}`;

const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

function read(k: string): string | null {
  if (memory.has(k)) return memory.get(k) ?? null;
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function write(k: string, value: string | null) {
  memory.set(k, value);
  try {
    if (value === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, value);
  } catch {
    // Private window or blocked storage: the in-memory copy still works this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDemoProfile(base: Profile) {
  const k = key(base.slug);
  const raw = useSyncExternalStore(
    subscribe,
    () => read(k),
    () => null, // server render and first paint use the original demo data
  );

  const profile = useMemo<Profile>(() => {
    if (!raw) return base;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return base;
    }
  }, [raw, base]);

  const update = useCallback(
    (fn: (p: Profile) => Profile) => write(k, JSON.stringify(fn(profile))),
    [k, profile],
  );
  const reset = useCallback(() => write(k, null), [k]);

  return { profile, update, reset, edited: raw !== null };
}

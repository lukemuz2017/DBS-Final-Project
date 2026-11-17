"use client";

import Link from "next/link";
import { useChosenStyle } from "@/components/DemoChooser";
import { DashboardView } from "@/components/DashboardView";
import { DemoBanner } from "@/components/edit/Editor";
import { SetupView } from "@/components/SetupView";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import type { ProfileStore } from "@/lib/store/types";
import type { Profile } from "@/lib/types";

// The public demo (/dashboard/<persona>?style=...): a demo profile with the savings
// style picked in the chooser, edits saved in this browser.

function useDemoStore(base: Profile): { store: ProfileStore; query: string } {
  const { profile, style, query } = useChosenStyle(base);
  // Each style keeps its own saved edits, so switching styles starts clean.
  return { store: { ...useDemoProfile(profile, style), mode: "demo" }, query };
}

function DemoActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-bold text-muted hover:bg-accent-soft hover:text-ink">Change demo</Link>
      <Link href="/sign-in" className="rounded-lg px-3 py-1.5 text-sm font-bold text-accent-strong ring-1 ring-accent/30 hover:bg-accent-soft">Sign in</Link>
      <Link href="/sign-up" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-white hover:bg-accent-strong">Create account</Link>
    </div>
  );
}

function demoChrome(store: ProfileStore, query: string) {
  const p = store.profile;
  return {
    basePath: `/dashboard/${p.slug}`,
    query,
    homeHref: "/dashboard",
    badge: "Demo data",
    right: <DemoActions />,
    banner: <DemoBanner name={p.name.split(" ")[0]} edited={store.edited} onReset={store.reset!} />,
  };
}

export function DemoDashboard({ base }: { base: Profile }) {
  const { store, query } = useDemoStore(base);
  return <DashboardView store={store} chrome={demoChrome(store, query)} />;
}

export function DemoSetup({ base }: { base: Profile }) {
  const { store, query } = useDemoStore(base);
  return <SetupView store={store} chrome={demoChrome(store, query)} />;
}

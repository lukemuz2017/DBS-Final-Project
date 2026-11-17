"use client";

import { DashboardView } from "@/components/DashboardView";
import { DemoBanner } from "@/components/edit/Editor";
import { SetupView } from "@/components/SetupView";
import { PersonaSwitcher } from "@/components/ui";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import type { ProfileStore } from "@/lib/store/types";
import type { Profile } from "@/lib/types";

// The public demo (/dashboard/<persona>): demo personas, edits saved in this browser.

function useDemoStore(base: Profile): ProfileStore {
  return { ...useDemoProfile(base), mode: "demo" };
}

function demoChrome(store: ProfileStore, profiles: Profile[], section?: "setup") {
  const p = store.profile;
  return {
    basePath: `/dashboard/${p.slug}`,
    badge: "Demo data",
    right: <PersonaSwitcher profiles={profiles.map((x) => (x.slug === p.slug ? p : x))} active={p.slug} section={section} />,
    banner: <DemoBanner name={p.name.split(" ")[0]} edited={store.edited} onReset={store.reset!} />,
  };
}

export function DemoDashboard({ base, profiles }: { base: Profile; profiles: Profile[] }) {
  const store = useDemoStore(base);
  return <DashboardView store={store} chrome={demoChrome(store, profiles)} />;
}

export function DemoSetup({ base, profiles }: { base: Profile; profiles: Profile[] }) {
  const store = useDemoStore(base);
  return <SetupView store={store} chrome={demoChrome(store, profiles, "setup")} />;
}

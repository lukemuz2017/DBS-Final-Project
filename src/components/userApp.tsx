"use client";

import { useUser } from "@clerk/nextjs";
import { AccountButton } from "@/components/AccountButton";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { Chrome } from "@/components/AppHeader";
import { DashboardView } from "@/components/DashboardView";
import { SetupView } from "@/components/SetupView";
import { DemoChooser, useChosenStyle } from "@/components/DemoChooser";
import type { ProfileStore } from "@/lib/store/types";
import { useUserProfile, type UserProfileState } from "@/lib/store/useUserProfile";
import type { Profile } from "@/lib/types";

// The signed-in app (/app): the user's own data, a welcome screen for new accounts,
// and a sample-data preview that never saves anything.

function AccountMenu({ preview }: { preview?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {!preview && (
        <Link href="/app/preview" className="text-sm font-bold text-muted hover:text-ink">
          Preview sample data
        </Link>
      )}
      <AccountButton />
    </div>
  );
}

function userChrome(saveError: string | null): Chrome {
  return {
    basePath: "/app",
    right: <AccountMenu />,
    banner: saveError ? <Strip tone="warn">{saveError}</Strip> : undefined,
  };
}

function Strip({ tone, children }: { tone: "warn" | "sun"; children: ReactNode }) {
  return (
    <div className={tone === "warn" ? "border-b border-warn/30 bg-warn-soft" : "border-b border-sun bg-sun-soft"}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">{children}</div>
    </div>
  );
}

/** Loading, error and "new account" states shared by /app and /app/setup. */
function Gate({ state, children }: { state: UserProfileState; children: (s: Extract<UserProfileState, { status: "ready" }>) => ReactNode }) {
  if (state.status === "loading") return <Centered><p className="text-muted">Loading your forecast…</p></Centered>;
  if (state.status === "error")
    return (
      <Centered>
        <p className="font-bold">{state.message}</p>
        <button type="button" onClick={state.retry} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-strong">Try again</button>
      </Centered>
    );
  if (state.status === "new") return <Welcome />;
  return <>{children(state)}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="hero-glow flex flex-1 items-center">
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">{children}</div>
    </main>
  );
}

export function UserDashboard() {
  const state = useUserProfile();
  return <Gate state={state}>{(s) => <DashboardView store={s.store} chrome={userChrome(s.saveError)} />}</Gate>;
}

export function UserSetup() {
  const state = useUserProfile();
  return <Gate state={state}>{(s) => <SetupView store={s.store} chrome={userChrome(s.saveError)} />}</Gate>;
}

/** First visit: set up your own forecast, or look around with sample data first. */
export function Welcome() {
  const { user } = useUser();
  const first = user?.firstName ?? "";
  return (
    <main className="hero-glow flex flex-1 items-center">
      <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
            <span className="font-display text-2xl font-bold">Runway</span>
          </span>
          <AccountButton />
        </div>
        <h1 className="mt-10 font-display text-4xl font-bold tracking-tight sm:text-5xl">Welcome{first ? `, ${first}` : ""}.</h1>
        <p className="mt-3 text-lg text-muted">How would you like to start?</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/app/start" className="card block p-6 transition-transform hover:-translate-y-0.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-accent">About 5 minutes</div>
            <div className="mt-2 font-display text-2xl font-bold">Set up my own</div>
            <p className="mt-2 text-sm text-muted">Your accounts, income, biggest bills and money rules. You get your own 12-week forecast and Payday Plan.</p>
          </Link>
          <Link href="/app/preview" className="card block p-6 transition-transform hover:-translate-y-0.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-tight">Just looking</div>
            <div className="mt-2 font-display text-2xl font-bold">Preview with sample data</div>
            <p className="mt-2 text-sm text-muted">Tell us how you earn and save, and explore a full forecast that fits. Nothing is saved.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Preview: sample data inside the signed-in app. Edits live in memory only.

function usePreviewStore(base: Profile): ProfileStore {
  const [edits, setEdits] = useState<Profile | null>(null);
  const profile = edits ?? base;
  return useMemo(
    () => ({ profile, update: (fn) => setEdits(fn(profile)), reset: () => setEdits(null), edited: edits !== null, mode: "preview" }),
    [profile, edits],
  );
}

function previewChrome(p: Profile, query: string): Chrome {
  return {
    basePath: `/app/preview/${p.slug}`,
    query,
    homeHref: "/app",
    badge: "Sample data",
    right: (
      <div className="flex items-center gap-3">
        <Link href="/app/preview" className="text-sm font-bold text-muted hover:text-ink">Change sample</Link>
        <AccountButton />
      </div>
    ),
    banner: (
      <Strip tone="sun">
        <span>
          <strong>You&apos;re previewing {p.name.split(" ")[0]}&apos;s sample data</strong> ({p.role.toLowerCase()}). Try anything; nothing is saved.
        </span>
        <Link href="/app" className="rounded-lg bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-accent-strong">Switch to my data</Link>
      </Strip>
    ),
  };
}

export function PreviewDashboard({ base }: { base: Profile }) {
  const { profile, query } = useChosenStyle(base);
  const store = usePreviewStore(profile);
  return <DashboardView store={store} chrome={previewChrome(store.profile, query)} />;
}

export function PreviewSetup({ base }: { base: Profile }) {
  const { profile, query } = useChosenStyle(base);
  const store = usePreviewStore(profile);
  return <SetupView store={store} chrome={previewChrome(store.profile, query)} />;
}

/** /app/preview: pick a sample that fits you. */
export function PreviewChooser() {
  return (
    <main className="hero-glow flex-1">
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/app" className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
            <span className="font-display text-2xl font-bold">Runway</span>
          </Link>
          <AccountButton />
        </div>
        <h1 className="mt-10 font-display text-4xl font-bold tracking-tight">Preview with sample data</h1>
        <p className="mt-2 text-muted">Pick what sounds like you. Nothing here is saved.</p>
        <div className="mt-6"><DemoChooser basePath="/app/preview" /></div>
        <p className="mt-4 text-sm"><Link href="/app" className="font-bold text-accent-strong underline decoration-accent/40 underline-offset-4">Back to my data</Link></p>
      </div>
    </main>
  );
}

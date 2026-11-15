"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DemoBanner, useEditor } from "@/components/edit/Editor";
import { PencilIcon, SmallButton } from "@/components/edit/fields";
import { AccountsCard, BillsCard, GraduationCard, IncomeCard } from "@/components/sections";
import { Card } from "@/components/ui";
import { useDemoProfile } from "@/lib/demo/useDemoProfile";
import type { Profile } from "@/lib/types";

const TYPE_LABEL = { freelance: "Freelance", student: "Student", steady: "Steady paycheck" } as const;

// The setup page: the facts the forecast is built from (profile, accounts,
// income sources, bills and plans). The dashboard shows what they add up to.
export function SetupView({ base, profiles }: { base: Profile; profiles: Profile[] }) {
  const { profile: p, update, reset, edited } = useDemoProfile(base);
  const { edit, drawerNode } = useEditor(p, update);
  const first = p.name.split(" ")[0];
  const switcherProfiles = profiles.map((x) => (x.slug === p.slug ? p : x));

  const profileRows: [string, string][] = [
    ["Name", p.name],
    ["What you do", p.role],
    ["Where", `${p.neighborhood}, ${p.city}`],
    ["How you get paid", TYPE_LABEL[p.profileType]],
    ["Runway target", `${p.runwayTargetWeeks} weeks (about ${Math.round(p.runwayTargetWeeks / 4.33)} months)`],
    ["Range", p.rangeConfidence === 90 ? "Extra cautious" : "Standard"],
    ["Estimated tax", p.tax ? `On · set aside ${p.tax.setAsidePct}% of untaxed income` : "Off"],
  ];

  return (
    <>
      <AppHeader profiles={switcherProfiles} active={p.slug} section="setup" />
      <DemoBanner name={first} edited={edited} onReset={reset} />

      <div className="hero-glow border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Link href={`/dashboard/${p.slug}`} className="text-sm font-bold text-accent-strong hover:underline">← {first}&apos;s forecast</Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{first}&apos;s setup</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">The facts the forecast is built from. Change anything here and the dashboard updates right away.</p>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-5 px-4 py-6 sm:px-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card title="Profile & settings" action={<SmallButton onClick={() => edit({ kind: "profile" })}><PencilIcon /> Edit</SmallButton>}>
            <dl className="divide-y divide-line text-sm">
              {profileRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <AccountsCard p={p} onEdit={(id) => edit({ kind: "account", id })} onConnect={() => edit({ kind: "connect" })} />
          {p.history && p.history.length > 0 && <GraduationCard p={p} />}
        </div>
        <div className="space-y-5">
          <IncomeCard p={p} limit={false} onEdit={(id) => edit({ kind: "income", id })} />
          <BillsCard p={p} limit={false} onEditBill={(id) => edit({ kind: "bill", id })} onEditEvent={(id) => edit({ kind: "event", id })} />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">Runway · Demo data. Edits stay in this browser. Educational project, not financial advice.</footer>
      {drawerNode}
    </>
  );
}

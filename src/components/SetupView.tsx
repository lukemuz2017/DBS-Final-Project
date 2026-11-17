"use client";

import { useState, type ReactNode } from "react";
import { AppHeader, type Chrome } from "@/components/AppHeader";
import { useEditor } from "@/components/edit/Editor";
import { PencilIcon, SmallButton } from "@/components/edit/fields";
import { AccountsCard, GraduationCard, IncomeCard } from "@/components/sections";
import { PlansPanel, RecurringBillsPanel } from "@/components/setupPanels";
import { ActivityList } from "@/components/ActivityView";
import type { CashEvent } from "@/lib/engine/forecast";
import { Card } from "@/components/ui";
import type { ProfileStore } from "@/lib/store/types";
import { daysBetween, usd } from "@/lib/format";
import { CLIENTS_PAY, CUSHION, PREDICTABILITY, styleExample } from "@/components/edit/RulesForm";
import { dismissGap, GapsList } from "@/components/gaps";
import { DeleteData } from "@/components/DeleteData";
import { InfoTip } from "@/components/InfoTip";
import { rulesOf, STYLES } from "@/lib/engine/rules";

const TYPE_LABEL = { freelance: "Freelance", student: "Student", steady: "Steady paycheck" } as const;

type Section = "profile" | "rules" | "accounts" | "income" | "bills" | "plans" | "upcoming" | "activity" | "journey";

// Account details: the facts the forecast is built from. A fixed menu on the
// left picks which section shows on the right.
export function SetupView({ store, chrome }: { store: ProfileStore; chrome: Chrome }) {
  const { profile: p, update } = store;
  const { edit, drawerNode } = useEditor(p, update);
  const [section, setSection] = useState<Section | null>(null);

  const stale = p.accounts.filter((a) => daysBetween(a.balanceAsOf.slice(0, 10), p.today) >= 3).length;
  const menu: { id: Section; label: string; icon: ReactNode; alert?: boolean }[] = [
    { id: "profile", label: "Profile & settings", icon: <IconUser /> },
    { id: "rules", label: "Money rules", icon: <IconSliders /> },
    { id: "accounts", label: "Bank accounts", icon: <IconBank />, alert: stale > 0 },
    { id: "income", label: "Income sources", icon: <IconIncome /> },
    { id: "bills", label: "Recurring bills", icon: <IconRepeat /> },
    { id: "plans", label: "One-off plans", icon: <IconCalendar /> },
    { id: "upcoming", label: "Upcoming", icon: <IconClock /> },
    { id: "activity", label: "Recent activity", icon: <IconList /> },
    ...(p.history?.length ? [{ id: "journey" as const, label: "Your journey", icon: <IconFlag /> }] : []),
  ];

  const pick = (id: Section) => setSection(id);

  // Clicking an upcoming item opens whatever produced it.
  const editItem = (e: CashEvent) => {
    // Payday Plan rows: tax set-asides open tax settings, the plan's moves open money rules.
    if (e.sourceId === "tax") edit({ kind: "profile" });
    else if (e.sourceId === "payday") edit({ kind: "rules" });
    else if (e.kind === "income") edit({ kind: "income", id: e.sourceId });
    else if (e.kind === "bill" || e.kind === "transfer") edit({ kind: "bill", id: e.sourceId });
    else if (e.sourceId === "tax") edit({ kind: "profile" });
    else edit({ kind: "event", id: e.sourceId });
  };

  const profileRows: [string, string][] = [
    ["Name", p.name],
    ["What you do", p.role],
    ["Where", `${p.neighborhood}, ${p.city}`],
    ["How you get paid", TYPE_LABEL[p.profileType]],
    ["Runway target", `${p.runwayTargetWeeks} weeks (about ${Math.round(p.runwayTargetWeeks / 4.33)} months)`],
    ["Range", p.rangeConfidence === 90 ? "Extra cautious" : "Standard"],
    ["Estimated tax", p.tax ? `On · set aside ${p.tax.setAsidePct}% of untaxed income` : "Off"],
  ];

  let content: ReactNode;
  if (section === null) {
    content = (
      <Card title="What the forecast is built from" subtitle="Pick a category to see and change it">
        <ol className="space-y-3 text-sm">
          <li><strong>Bank accounts</strong> give today&apos;s balances: where every forecast starts.</li>
          <li><strong>Income sources</strong> add money in, each with its own timing and certainty.</li>
          <li><strong>Recurring bills</strong> and <strong>one-off plans</strong> take money out.</li>
          <li><strong>Profile & settings</strong> decide how cautious the range is, your runway target, and whether estimated tax is tracked.</li>
        </ol>
        {stale > 0 && (
          <button type="button" onClick={() => pick("accounts")} className="mt-4 w-full rounded-xl bg-tight-soft px-3 py-2 text-left text-sm text-tight ring-1 ring-sun hover:bg-sun-soft">
            <strong>{stale} account{stale === 1 ? "" : "s"} out of date.</strong> The forecast may be off until {stale === 1 ? "it reconnects" : "they reconnect"}. Review accounts →
          </button>
        )}
      </Card>
    );
  } else if (section === "profile") {
    content = (
      <Card title="Profile & settings" subtitle="Who the forecast is for, and how cautious it should be" action={<SmallButton onClick={() => edit({ kind: "profile" })}><PencilIcon /> Edit</SmallButton>}>
        <dl className="divide-y divide-line text-sm">
          {profileRows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        {p.tax && (
          <p className="mt-3 text-xs text-muted">Untaxed income received this period: <strong className="text-ink">{usd(p.tax.receivedThisPeriodCents)}</strong>. Edit it in settings if it&apos;s out of date.</p>
        )}
        {store.deleteAll && <DeleteData onDelete={store.deleteAll} />}
      </Card>
    );
  } else if (section === "rules") {
    const r = rulesOf(p);
    const rows: [string, string][] = [
      ["Savings style", STYLES[r.savingsStyle].label],
      ["Income", PREDICTABILITY.find((x) => x.value === r.predictability)!.label],
      ["Clients usually pay", CLIENTS_PAY.find((x) => x.value === r.clientsPay)!.label],
      ["Cushion in checking", CUSHION.find((x) => x.value === String(r.cushionWeeks))!.label],
      ["Minimum weekly spending", r.minWeeklySpendCents ? usd(r.minWeeklySpendCents) : "Not set"],
    ];
    content = (
      <Card title={<InfoTip term="moneyRules">Money rules</InfoTip>} action={<SmallButton onClick={() => edit({ kind: "rules" })}><PencilIcon /> Edit</SmallButton>}>
        <dl className="divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        {p.tax && <p className="mt-3 text-xs text-muted">Per $1,000 client payment: {styleExample(r.savingsStyle, p.tax.setAsidePct)}, when checking can spare it.</p>}
      </Card>
    );
  } else if (section === "accounts") {
    content = (
      <div className="space-y-4">
        <GapsList p={p} onDismiss={(id) => update((q) => dismissGap(q, id))} />
        <AccountsCard p={p} onEdit={(id) => edit({ kind: "account", id })} onConnect={() => edit({ kind: "connect" })} />
      </div>
    );
  } else if (section === "income") {
    content = <IncomeCard p={p} limit={false} onEdit={(id) => edit({ kind: "income", id })} />;
  } else if (section === "bills") {
    content = (
      <RecurringBillsPanel
        p={p}
        onEdit={(id) => edit({ kind: "bill", id })}
        onRemove={(id) => update((q) => ({ ...q, recurringBills: q.recurringBills.filter((b) => b.id !== id) }))}
      />
    );
  } else if (section === "plans") {
    content = (
      <PlansPanel
        p={p}
        onEdit={(id) => edit({ kind: "event", id })}
        onRemove={(id) => update((q) => ({ ...q, plannedEvents: q.plannedEvents.filter((e) => e.id !== id) }))}
      />
    );
  } else if (section === "upcoming") {
    content = <ActivityList p={p} mode="upcoming" onEditItem={editItem} onAdd={(k) => edit({ kind: k })} />;
  } else if (section === "activity") {
    content = <ActivityList p={p} mode="transactions" />;
  } else {
    content = <GraduationCard p={p} />;
  }

  return (
    <>
      <AppHeader chrome={chrome} section="setup" setupAlert={stale > 0} />

      <div className="hero-glow border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Account Details</h1>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-5 px-4 py-6 sm:px-6 md:flex-row">
        {/* Phones: a scrolling row of tabs. Wider screens: a fixed menu on the left. */}
        <nav aria-label="Setup sections" className="w-full md:sticky md:top-20 md:w-auto md:shrink-0">
          <div className="md:w-64 md:rounded-2xl md:border md:border-line md:bg-surface md:p-2">
            <ul className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
              {menu.map((m) => {
                const on = section === m.id;
                return (
                  <li key={m.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => pick(m.id)}
                      aria-current={on ? "page" : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${on ? "bg-accent text-white" : "bg-surface ring-1 ring-line hover:bg-accent-soft md:ring-0"}`}
                    >
                      <span className={`grid size-[22px] shrink-0 place-items-center ${on ? "text-white" : "text-accent-strong"}`}>{m.icon}</span>
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-sm font-bold">{m.label}</span>
                      </span>
                      {m.alert && <span className={`absolute right-2 top-2 size-2 rounded-full ${on ? "bg-sun" : "bg-[var(--tight)]"}`} aria-label="needs attention" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        <div className="w-full min-w-0 flex-1">{content}</div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-muted sm:px-6">Runway · Demo data. Edits stay in this browser. Educational project, not financial advice.</footer>
      {drawerNode}
    </>
  );
}

// ---- small line icons (18px, currentColor) ----
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function Svg({ children }: { children: ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{children}</svg>;
}
function IconUser() { return <Svg><circle cx="9" cy="6" r="3" {...S} /><path d="M3.5 15c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2" {...S} /></Svg>; }
function IconBank() { return <Svg><path d="M2.5 7 9 3l6.5 4M3.5 7.5v6M7 7.5v6M11 7.5v6M14.5 7.5v6M2.5 15h13" {...S} /></Svg>; }
function IconIncome() { return <Svg><path d="M9 14V4M5 8l4-4 4 4M3 15.5h12" {...S} /></Svg>; }
function IconRepeat() { return <Svg><path d="M3 8a5 5 0 0 1 9-3l1.5 1.5M15 10a5 5 0 0 1-9 3L4.5 11.5M13.5 3.5v3h-3M4.5 14.5v-3h3" {...S} /></Svg>; }
function IconCalendar() { return <Svg><rect x="2.5" y="3.5" width="13" height="12" rx="2" {...S} /><path d="M2.5 7.5h13M6 2v3M12 2v3" {...S} /></Svg>; }
function IconClock() { return <Svg><circle cx="9" cy="9" r="6.5" {...S} /><path d="M9 5.5V9l2.5 1.5" {...S} /></Svg>; }
function IconList() { return <Svg><path d="M6.5 5h8M6.5 9h8M6.5 13h8M3.5 5h.01M3.5 9h.01M3.5 13h.01" {...S} /></Svg>; }
function IconSliders() { return <Svg><path d="M3 5h7M13 5h2M3 13h2M8 13h7M10 3v4M5 11v4" {...S} /></Svg>; }
function IconFlag() { return <Svg><path d="M4 16V3M4 3.5h8.5l-1.5 3 1.5 3H4" {...S} /></Svg>; }

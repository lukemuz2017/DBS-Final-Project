"use client";

import { useState, type ReactNode } from "react";
import type { Profile } from "@/lib/types";
import { ConnectBank } from "./ConnectBank";
import { Drawer } from "./Drawer";
import { AccountForm, BillForm, EventForm, GoalForm, IncomeForm, ProfileForm } from "./forms";

// One place that knows how to open and save every editor, shared by the
// dashboard and the setup page.

export type Editing =
  | { kind: "profile" }
  | { kind: "income"; id?: string }
  | { kind: "bill"; id?: string }
  | { kind: "event"; id?: string }
  | { kind: "goal"; id?: string }
  | { kind: "account"; id: string }
  | { kind: "connect" };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export function useEditor(p: Profile, update: (fn: (p: Profile) => Profile) => void) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const close = () => setEditing(null);
  const save = (fn: (p: Profile) => Profile) => {
    update(fn);
    close();
  };

  let drawer: { title: string; subtitle?: string; body: ReactNode } | null = null;
  if (editing?.kind === "profile") {
    drawer = { title: "Profile & settings", body: <ProfileForm p={p} onCancel={close} onSave={(np) => save(() => np)} /> };
  } else if (editing?.kind === "income") {
    const s = p.incomeStreams.find((x) => x.id === editing.id);
    drawer = {
      title: s ? `Edit ${s.name}` : "Add income",
      subtitle: "Paychecks, clients, stipends, refunds",
      body: (
        <IncomeForm
          key={editing.id ?? "new"}
          stream={s}
          today={p.today}
          onCancel={close}
          onSave={(ns) => save((q) => ({ ...q, incomeStreams: upsert(q.incomeStreams, ns) }))}
          onDelete={s ? () => save((q) => ({ ...q, incomeStreams: q.incomeStreams.filter((x) => x.id !== s.id) })) : undefined}
        />
      ),
    };
  } else if (editing?.kind === "bill") {
    const b = p.recurringBills.find((x) => x.id === editing.id);
    drawer = {
      title: b ? `Edit ${b.name}` : "Add a regular bill",
      body: (
        <BillForm
          key={editing.id ?? "new"}
          bill={b}
          p={p}
          onCancel={close}
          onSave={(nb) => save((q) => ({ ...q, recurringBills: upsert(q.recurringBills, nb) }))}
          onDelete={b ? () => save((q) => ({ ...q, recurringBills: q.recurringBills.filter((x) => x.id !== b.id) })) : undefined}
        />
      ),
    };
  } else if (editing?.kind === "event") {
    const e = p.plannedEvents.find((x) => x.id === editing.id);
    drawer = {
      title: e ? `Edit ${e.name}` : "Add a one-off plan",
      subtitle: "A trip, a deposit, a big purchase, or money you're expecting once",
      body: (
        <EventForm
          key={editing.id ?? "new"}
          event={e}
          today={p.today}
          onCancel={close}
          onSave={(ne) => save((q) => ({ ...q, plannedEvents: upsert(q.plannedEvents, ne) }))}
          onDelete={e ? () => save((q) => ({ ...q, plannedEvents: q.plannedEvents.filter((x) => x.id !== e.id) })) : undefined}
        />
      ),
    };
  } else if (editing?.kind === "goal") {
    const g = p.goals.find((x) => x.id === editing.id);
    drawer = {
      title: g ? `Edit ${g.name}` : "Add a goal",
      subtitle: "Something 1–2 years out (or longer)",
      body: (
        <GoalForm
          key={editing.id ?? "new"}
          goal={g}
          today={p.today}
          onCancel={close}
          onSave={(ng) => save((q) => ({ ...q, goals: upsert(q.goals, ng) }))}
          onDelete={g ? () => save((q) => ({ ...q, goals: q.goals.filter((x) => x.id !== g.id) })) : undefined}
        />
      ),
    };
  } else if (editing?.kind === "account") {
    const a = p.accounts.find((x) => x.id === editing.id);
    if (a)
      drawer = {
        title: `${a.institution} ${a.name}`,
        body: (
          <AccountForm
            key={a.id}
            account={a}
            onCancel={close}
            onSave={(na) => save((q) => ({ ...q, accounts: upsert(q.accounts, na) }))}
            onDelete={() =>
              save((q) => ({
                ...q,
                accounts: q.accounts.filter((x) => x.id !== a.id),
                // Keep references consistent: transfers into this account stop, tax setup forgets it.
                recurringBills: q.recurringBills.filter((b) => b.toAccountId !== a.id),
                tax: q.tax && q.tax.reserveAccountId === a.id ? { ...q.tax, reserveAccountId: undefined } : q.tax,
              }))
            }
          />
        ),
      };
  } else if (editing?.kind === "connect") {
    drawer = {
      title: "Connect a bank",
      subtitle: "Demo of the Plaid connection flow",
      body: <ConnectBank today={p.today} onCancel={close} onConnect={(accts) => update((q) => ({ ...q, accounts: [...q.accounts, ...accts] }))} />,
    };
  }

  const drawerNode = (
    <Drawer open={drawer !== null} onClose={close} title={drawer?.title ?? ""} subtitle={drawer?.subtitle}>
      {drawer?.body}
    </Drawer>
  );

  return { edit: setEditing, drawerNode };
}

/** Yellow strip shown once a demo persona has been edited, with a two-step reset. */
export function DemoBanner({ name, edited, onReset }: { name: string; edited: boolean; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!edited) return null;
  return (
    <div className="border-b border-sun bg-sun-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
        <span><strong>You&apos;ve edited {name}&apos;s demo.</strong> Changes are saved in this browser only.</span>
        {confirm ? (
          <span className="flex items-center gap-2">
            <span className="font-bold">Undo all edits?</span>
            <button type="button" className="rounded-lg bg-warn px-3 py-1 text-xs font-bold text-white" onClick={() => { onReset(); setConfirm(false); }}>Yes, reset</button>
            <button type="button" className="rounded-lg px-3 py-1 text-xs font-bold text-muted hover:text-ink" onClick={() => setConfirm(false)}>Cancel</button>
          </span>
        ) : (
          <button type="button" className="rounded-lg px-3 py-1 text-xs font-bold text-tight ring-1 ring-sun hover:bg-white" onClick={() => setConfirm(true)}>Reset demo</button>
        )}
      </div>
    </div>
  );
}

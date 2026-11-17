"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CLIENTS_PAY, CUSHION, PREDICTABILITY, StylePicker } from "@/components/edit/RulesForm";
import { Field, inputCls, MoneyInput, Segmented } from "@/components/edit/fields";
import { GapsList } from "@/components/gaps";
import { centsToInput, newId, parseDollars, type RepeatCadence } from "@/lib/edit";
import { addDays } from "@/lib/format";
import { buildProfile, type AccountKind, type AccountUse, type DraftAccount, type DraftBill, type DraftPayment, type OnboardingDraft } from "@/lib/onboarding";
import { todayIn } from "@/lib/store/planData";
import { useUserProfile } from "@/lib/store/useUserProfile";
import type { MoneyRules, RecurringBill } from "@/lib/types";

// First-time setup: five short steps to a working forecast. Everything here can be
// changed later in Account Details. Planning settings, not financial advice.

const STEPS = ["You", "How you get paid", "Accounts", "Money in and out", "Your money rules"] as const;

const ACCOUNT_KINDS: { value: AccountKind; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "retirement", label: "Retirement" },
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
];
const USES: { value: AccountUse; label: string }[] = [
  { value: "emergency", label: "Emergency fund" },
  { value: "taxes", label: "Taxes" },
  { value: "goals", label: "Goals" },
  { value: "general", label: "General" },
];
const BILL_CATEGORIES: { value: RecurringBill["category"]; label: string }[] = [
  { value: "housing", label: "Rent / housing" },
  { value: "utilities", label: "Utilities & phone" },
  { value: "insurance", label: "Insurance" },
  { value: "health", label: "Health" },
  { value: "debt", label: "Loan payment" },
  { value: "transport", label: "Car / transit" },
  { value: "business", label: "Business" },
  { value: "subscriptions", label: "Subscriptions" },
];

/** Form rows keep dollar text as typed; it's parsed to cents when the step is checked. */
type Row<T> = Omit<T, "amountCents"> & { amount: string };

export function Onboarding() {
  const state = useUserProfile();
  const router = useRouter();
  const { user } = useUser();
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago", []);
  const today = useMemo(() => todayIn(tz), [tz]);

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 1
  // Starts from the name on the Clerk account until the user edits it.
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? user?.fullName ?? "";
  const [occupation, setOccupation] = useState("");
  const [city, setCity] = useState("");
  const [usState, setUsState] = useState("");
  const [birthYear, setBirthYear] = useState("");
  // Step 2
  const [profileType, setProfileType] = useState<"freelance" | "steady">("freelance");
  const [predictability, setPredictability] = useState<MoneyRules["predictability"]>("lumpy");
  const [clientsPay, setClientsPay] = useState<MoneyRules["clientsPay"]>("on_time");
  // Step 3
  const [accounts, setAccounts] = useState<(Row<DraftAccount> & { paydown?: string })[]>([{ id: newId("acct"), kind: "checking", institution: "", name: "", amount: "" }]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  // Step 4
  const [payments, setPayments] = useState<Row<DraftPayment>[]>([{ id: newId("pay"), client: "", date: addDays(today, 7), amount: "", taxWithheld: false }]);
  const [paycheck, setPaycheck] = useState({ amount: "", cadence: "biweekly" as RepeatCadence, next: addDays(today, 7) });
  const [bills, setBills] = useState<Row<DraftBill>[]>([{ id: newId("bill"), name: "Rent", amount: "", dayOfMonth: 1, category: "housing" }]);
  const [weeklySpend, setWeeklySpend] = useState("");
  // Step 5
  const [style, setStyle] = useState<MoneyRules["savingsStyle"]>("balanced");
  const [cushion, setCushion] = useState<"0.5" | "1" | "2">("1");
  const [runwayTarget, setRunwayTarget] = useState("17");
  const [taxPct, setTaxPct] = useState("30");
  const [minSpend, setMinSpend] = useState("");

  // Already set up: go to the forecast.
  useEffect(() => {
    if (state.status === "ready") router.replace("/app");
  }, [state.status, router]);

  const cents = (s: string) => parseDollars(s || "0") ?? 0;
  const draft: OnboardingDraft = {
    name, occupation, city, state: usState,
    birthYear: Number(birthYear) || undefined,
    profileType, predictability, clientsPay,
    accounts: accounts.map(({ amount, paydown, ...a }) => ({ ...a, amountCents: cents(amount), paydownCents: paydown ? cents(paydown) : undefined })),
    payments: payments.map(({ amount, ...x }) => ({ ...x, amountCents: cents(amount) })),
    paycheck: { amountCents: cents(paycheck.amount), cadence: paycheck.cadence, next: paycheck.next },
    bills: bills.map(({ amount, ...b }) => ({ ...b, amountCents: cents(amount) })),
    weeklySpendCents: cents(weeklySpend),
    savingsStyle: style,
    cushionWeeks: Number(cushion) as MoneyRules["cushionWeeks"],
    runwayTargetWeeks: Number(runwayTarget),
    taxPct: Number(taxPct),
    minWeeklySpendCents: cents(minSpend),
  };
  const preview = buildProfile(draft, today);
  const previewWithDismissed = { ...preview, rules: { ...preview.rules, dismissedGaps: dismissed } };

  function check(): string {
    const money = (s: string) => s === "" || (parseDollars(s) !== null && parseDollars(s)! >= 0);
    if (step === 0) {
      if (!name.trim()) return "Add your name.";
      if (birthYear && (!/^\d{4}$/.test(birthYear) || Number(birthYear) < 1920 || Number(birthYear) > Number(today.slice(0, 4)) - 14)) return "Birth year should look like 1994.";
    }
    if (step === 2) {
      if (!accounts.some((a) => a.kind === "checking")) return "Add the checking account your bills come out of.";
      if (!accounts.every((a) => money(a.amount))) return "Balances should be dollar amounts.";
    }
    if (step === 3) {
      if (profileType === "freelance" && !payments.every((x) => money(x.amount))) return "Payments should be dollar amounts.";
      if (profileType === "steady" && !cents(paycheck.amount)) return "Add your take-home pay per paycheck.";
      if (!bills.every((b) => money(b.amount) && b.dayOfMonth >= 1 && b.dayOfMonth <= 31)) return "Bills need a dollar amount and a day of the month (1–31).";
      if (!money(weeklySpend)) return "Everyday spending should be a dollar amount.";
    }
    if (step === 4) {
      const t = Number(taxPct);
      if (profileType === "freelance" && (!Number.isFinite(t) || t < 0 || t > 60)) return "Tax set-aside should be between 0% and 60%.";
      if (!money(minSpend)) return "Minimum weekly spending should be a dollar amount.";
    }
    return "";
  }

  async function next() {
    const e = check();
    setError(e);
    if (e) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    if (state.status !== "new") return;
    setSaving(true);
    try {
      await state.create(previewWithDismissed, tz);
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  if (state.status === "loading" || state.status === "ready") return <Shell step={step}><p className="text-muted">Loading…</p></Shell>;
  if (state.status === "error") return <Shell step={step}><p className="font-bold">{state.message}</p></Shell>;

  const upd = <T extends { id: string }>(set: (fn: (rows: T[]) => T[]) => void, id: string, patch: Partial<T>) => set((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <Shell step={step}>
      <h1 className="font-display text-3xl font-bold tracking-tight">{["About you", "How you get paid", "Your accounts", "Money in and out", "Your money rules"][step]}</h1>

      <div className="mt-6 space-y-5">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">{(id) => <input id={id} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="What you do">{(id) => <input id={id} className={inputCls} value={occupation} placeholder="e.g. Freelance photographer" onChange={(e) => setOccupation(e.target.value)} />}</Field>
            <Field label="City">{(id) => <input id={id} className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />}</Field>
            <Field label="State" hint="For estimated-tax reminders.">{(id) => <input id={id} className={inputCls} value={usState} maxLength={2} placeholder="IL" onChange={(e) => setUsState(e.target.value.toUpperCase())} />}</Field>
            <Field label="Birth year" hint="Only the year: it sets your retirement outlook.">{(id) => <input id={id} className={inputCls} inputMode="numeric" value={birthYear} placeholder="1994" onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />}</Field>
          </div>
        )}

        {step === 1 && (
          <>
            <Field label="Mostly">{() => <Segmented label="How you get paid" value={profileType} onChange={setProfileType} options={[{ value: "freelance", label: "Freelance or gig work" }, { value: "steady", label: "A steady paycheck" }]} />}</Field>
            <Field label="How predictable is your income?" hint="Sets how wide the forecast range is and how cautious Pay yourself is.">
              {() => <Segmented label="How predictable is your income?" value={predictability} onChange={setPredictability} options={PREDICTABILITY} />}
            </Field>
            {profileType === "freelance" && (
              <Field label="Clients usually pay" hint="Late payments land later in the low case.">{() => <Segmented label="Clients usually pay" value={clientsPay} onChange={setClientsPay} options={CLIENTS_PAY} />}</Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted">Add balances by hand for now. Bank connections come later.</p>
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="grid gap-3 sm:grid-cols-[150px_1fr_1fr_140px]">
                    <Field label="Type">
                      {(id) => (
                        <select id={id} className={inputCls} value={a.kind} onChange={(e) => upd(setAccounts, a.id, { kind: e.target.value as AccountKind, use: e.target.value === "savings" ? "emergency" : undefined })}>
                          {ACCOUNT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="Bank">{(id) => <input id={id} className={inputCls} value={a.institution} placeholder="e.g. Chase" onChange={(e) => upd(setAccounts, a.id, { institution: e.target.value })} />}</Field>
                    <Field label="Nickname">{(id) => <input id={id} className={inputCls} value={a.name} placeholder="optional" onChange={(e) => upd(setAccounts, a.id, { name: e.target.value })} />}</Field>
                    <Field label={a.kind === "credit_card" || a.kind === "loan" ? "You owe" : "Balance"}>{(id) => <MoneyInput id={id} value={a.amount} onChange={(v) => upd(setAccounts, a.id, { amount: v })} />}</Field>
                  </div>
                  {a.kind === "credit_card" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-[110px_1fr_160px]">
                      <Field label="Due day">{(id) => <input id={id} className={inputCls} inputMode="numeric" value={a.dueDay ? String(a.dueDay) : ""} placeholder="22" onChange={(e) => upd(setAccounts, a.id, { dueDay: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || undefined })} />}</Field>
                      <Field label="Pay it off every month?">
                        {() => <Segmented label="Pays in full" value={a.paysInFull === false ? "no" : "yes"} onChange={(v) => upd(setAccounts, a.id, { paysInFull: v === "yes" })} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No, I carry a balance" }]} />}
                      </Field>
                      {a.paysInFull === false && <Field label="Extra paid down / month">{(id) => <MoneyInput id={id} value={a.paydown ?? ""} onChange={(v) => upd(setAccounts, a.id, { paydown: v })} />}</Field>}
                    </div>
                  )}
                  {a.kind === "savings" && (
                    <div className="mt-3">
                      <Segmented label="Used for" value={a.use ?? "general"} onChange={(v) => upd(setAccounts, a.id, { use: v })} options={profileType === "freelance" ? USES : USES.filter((u) => u.value !== "taxes")} />
                    </div>
                  )}
                  {accounts.length > 1 && (
                    <button type="button" onClick={() => setAccounts((rows) => rows.filter((r) => r.id !== a.id))} className="mt-2 text-xs font-bold text-muted hover:text-warn">Remove</button>
                  )}
                </li>
              ))}
            </ul>
            <AddButton onClick={() => setAccounts((rows) => [...rows, { id: newId("acct"), kind: "savings", institution: "", name: "", amount: "", use: "emergency" }])}>Add another account</AddButton>
            <GapsList
              p={previewWithDismissed}
              onDismiss={(id) => setDismissed((d) => [...new Set([...d, id])])}
              onAct={(g) => {
                if (g.id === "emergency-goal" || g.id === "employer-match") return setDismissed((d) => [...d, g.id]);
                const use: AccountUse = g.id === "tax-savings" ? "taxes" : "emergency";
                setAccounts((rows) => [...rows, g.id === "retirement-self" ? { id: newId("acct"), kind: "retirement", institution: "", name: "SEP IRA", amount: "" } : { id: newId("acct"), kind: "savings", institution: "", name: "", amount: "", use }]);
              }}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Section title={profileType === "freelance" ? "Payments you expect" : "Your paycheck"}>
              {profileType === "freelance" ? (
                <>
                  <ul className="space-y-2">
                    {payments.map((x) => (
                      <li key={x.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[1fr_150px_140px]">
                        <Field label="Client">{(id) => <input id={id} className={inputCls} value={x.client} placeholder="Who's paying" onChange={(e) => upd(setPayments, x.id, { client: e.target.value })} />}</Field>
                        <Field label="Expected">{(id) => <input id={id} type="date" className={inputCls} value={x.date} min={today} onChange={(e) => upd(setPayments, x.id, { date: e.target.value })} />}</Field>
                        <Field label="Amount">{(id) => <MoneyInput id={id} value={x.amount} onChange={(v) => upd(setPayments, x.id, { amount: v })} />}</Field>
                      </li>
                    ))}
                  </ul>
                  <AddButton onClick={() => setPayments((rows) => [...rows, { id: newId("pay"), client: rows[rows.length - 1]?.client ?? "", date: addDays(rows[rows.length - 1]?.date ?? today, 14), amount: "", taxWithheld: false }])}>Add a payment</AddButton>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Take-home per paycheck">{(id) => <MoneyInput id={id} value={paycheck.amount} onChange={(v) => setPaycheck((pc) => ({ ...pc, amount: v }))} />}</Field>
                  <Field label="How often">
                    {(id) => (
                      <select id={id} className={inputCls} value={paycheck.cadence} onChange={(e) => setPaycheck((pc) => ({ ...pc, cadence: e.target.value as RepeatCadence }))}>
                        <option value="weekly">Every week</option>
                        <option value="biweekly">Every other week</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Next payday">{(id) => <input id={id} type="date" className={inputCls} value={paycheck.next} min={today} onChange={(e) => setPaycheck((pc) => ({ ...pc, next: e.target.value }))} />}</Field>
                </div>
              )}
            </Section>
            <Section title="Your biggest bills">
              <ul className="space-y-2">
                {bills.map((b) => (
                  <li key={b.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[1fr_170px_120px_90px]">
                    <Field label="Bill">{(id) => <input id={id} className={inputCls} value={b.name} onChange={(e) => upd(setBills, b.id, { name: e.target.value })} />}</Field>
                    <Field label="Kind">
                      {(id) => (
                        <select id={id} className={inputCls} value={b.category} onChange={(e) => upd(setBills, b.id, { category: e.target.value as RecurringBill["category"] })}>
                          {BILL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label="Per month">{(id) => <MoneyInput id={id} value={b.amount} onChange={(v) => upd(setBills, b.id, { amount: v })} />}</Field>
                    <Field label="Due day">{(id) => <input id={id} className={inputCls} inputMode="numeric" value={String(b.dayOfMonth)} onChange={(e) => upd(setBills, b.id, { dayOfMonth: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0 })} />}</Field>
                  </li>
                ))}
              </ul>
              {bills.length < 8 && <AddButton onClick={() => setBills((rows) => [...rows, { id: newId("bill"), name: "", amount: "", dayOfMonth: 1, category: "utilities" }])}>Add a bill</AddButton>}
            </Section>
            <Field label="Everyday spending per week, including what you put on cards" hint="Groceries, coffee, rides: everything that isn't a bill above. Don't add your card payment as a bill; it would count the same spending twice.">
              {(id) => <MoneyInput id={id} value={weeklySpend} onChange={setWeeklySpend} placeholder="150" />}
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Savings style">{() => <StylePicker value={style} onChange={setStyle} taxPct={profileType === "freelance" ? Number(taxPct) || 0 : 0} />}</Field>
            <p className="-mt-2 text-xs text-muted">The Payday Plan only moves money checking can spare. Push hard pauses itself when cash gets tight or would squeeze your minimum spending.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Keep in checking as a cushion">{() => <Segmented label="Cushion" value={cushion} onChange={setCushion} options={CUSHION} />}</Field>
              <Field label="Cash Runway goal" hint="How long your cash should last if income stopped.">
                {() => <Segmented label="Cash Runway goal" value={runwayTarget} onChange={setRunwayTarget} options={[{ value: "8", label: "2 months" }, { value: "13", label: "3 months" }, { value: "17", label: "4 months" }, { value: "26", label: "6 months" }]} />}
              </Field>
              {profileType === "freelance" && (
                <Field label="Set aside for taxes" hint="Share of each client payment. 25–30% is a common rule of thumb.">
                  {(id) => <input id={id} className={inputCls} inputMode="decimal" value={taxPct} onChange={(e) => setTaxPct(e.target.value.replace(/[^\d.]/g, ""))} />}
                </Field>
              )}
              <Field label="Minimum weekly spending" hint="The basics you can't cut. Push hard never goes below it.">
                {(id) => <MoneyInput id={id} value={minSpend} onChange={setMinSpend} placeholder={weeklySpend ? centsToInput(Math.round(cents(weeklySpend) * 0.7)) : "100"} />}
              </Field>
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-5 text-sm font-bold text-warn" role="alert">{error}</p>}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        <button type="button" onClick={() => { setError(""); setStep(Math.max(0, step - 1)); }} className={`rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-ink ${step === 0 ? "invisible" : ""}`}>Back</button>
        <button type="button" disabled={saving} onClick={next} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-strong disabled:opacity-60">
          {step < STEPS.length - 1 ? "Next" : saving ? "Saving…" : "See my forecast"}
        </button>
      </div>
      <p className="mt-6 text-xs text-muted">You can change all of this later in Account Details. Planning estimates, not financial advice.</p>
    </Shell>
  );
}

function Shell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <main className="hero-glow flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
          <span className="font-display text-xl font-bold">Runway</span>
        </div>
        <ol className="mt-6 flex gap-1.5" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <span className={`block h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-[#e6dccb]"}`} />
              <span className={`mt-1.5 hidden text-[11px] font-bold sm:block ${i === step ? "text-accent-strong" : "text-muted"}`} aria-current={i === step ? "step" : undefined}>{s}</span>
            </li>
          ))}
        </ol>
        <div className="card mt-6 p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-bold text-accent-strong hover:underline">
      + {children}
    </button>
  );
}

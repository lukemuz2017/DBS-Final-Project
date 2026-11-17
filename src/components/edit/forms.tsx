"use client";

import { useState, type FormEvent } from "react";
import { FEATURES } from "@/lib/features";
import { centsToInput, newId, parseDollars, repeatPayments, summarizeStream, type RepeatCadence } from "@/lib/edit";
import { addDays, daysBetween, toDate, usd } from "@/lib/format";
import type { Account, Confidence, Goal, IncomeStream, PlannedEvent, Profile, ProfileType, RecurringBill, TaxSetup, Tier } from "@/lib/types";
import { Button, Check, Field, FormActions, inputCls, MoneyInput, Segmented } from "./fields";

type Done = { onCancel: () => void };

// ---------------------------------------------------------------------------
// Profile & settings

const TYPE_HELP: Record<ProfileType, string> = {
  freelance: "Turns on estimated-tax tracking and puts client income and quarterly taxes first.",
  student: "Puts term dates, loan refunds and the summer gap first.",
  steady: "Narrow range, goals first. Good for anyone with a regular paycheck.",
};

export function ProfileForm({ p, onSave, onCancel }: Done & { p: Profile; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(p.name);
  const [role, setRole] = useState(p.role);
  const [neighborhood, setNeighborhood] = useState(p.neighborhood);
  const [city, setCity] = useState(p.city);
  const [type, setType] = useState<ProfileType>(p.profileType);
  const [target, setTarget] = useState(String(p.runwayTargetWeeks));
  const [conf, setConf] = useState<"80" | "90">(String(p.rangeConfidence) as "80" | "90");
  const [taxOn, setTaxOn] = useState(Boolean(p.tax));
  const [taxPct, setTaxPct] = useState(String(p.tax?.setAsidePct ?? 30));
  const [taxReceived, setTaxReceived] = useState(centsToInput(p.tax?.receivedThisPeriodCents ?? 0));
  const reserves = p.accounts.filter((a) => a.tier === "reserve");
  const [taxAccount, setTaxAccount] = useState(p.tax?.reserveAccountId ?? reserves[0]?.id ?? "");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const pct = Number(taxPct);
    const received = parseDollars(taxReceived || "0");
    if (!name.trim()) return setError("Add a name.");
    if (taxOn && (!Number.isFinite(pct) || pct < 0 || pct > 60)) return setError("Tax set-aside should be between 0% and 60%.");
    if (taxOn && (received === null || received < 0)) return setError("Untaxed income received should be a dollar amount.");
    const tax: TaxSetup | undefined = taxOn
      ? {
          setAsidePct: pct,
          receivedThisPeriodCents: received ?? 0,
          periodLabel: p.tax?.periodLabel ?? "Sep 1 – Dec 31, 2026",
          periodEnd: p.tax?.periodEnd ?? "2026-12-31",
          dueDate: p.tax?.dueDate ?? "2027-01-15",
          reserveAccountId: taxAccount || undefined,
          note: p.tax?.note ?? "Federal and state estimated tax for Q4 2026, due Jan 15. The set-aside rate is a rule of thumb; your real bill depends on your full-year income.",
        }
      : undefined;
    onSave({
      ...p,
      name: name.trim(),
      initials: name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      role: role.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      profileType: type,
      runwayTargetWeeks: Number(target),
      rangeConfidence: Number(conf) as 80 | 90,
      tax,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">{(id) => <input id={id} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="What you do">{(id) => <input id={id} className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} />}</Field>
        <Field label="Neighborhood">{(id) => <input id={id} className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />}</Field>
        <Field label="City">{(id) => <input id={id} className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />}</Field>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-bold">How you get paid</div>
        <Segmented label="Profile type" value={type} onChange={setType} options={[{ value: "freelance", label: "Freelance" }, ...(FEATURES.students || p.profileType === "student" ? [{ value: "student" as const, label: "Student" }] : []), { value: "steady", label: "Steady paycheck" }]} />
        <p className="text-xs text-muted">{TYPE_HELP[type]} This only changes what you see first; you can switch any time.</p>
      </div>

      <Field label="Runway target" hint="How long your cash should last if income stopped. The usual guidance is 3–6 months; freelancers often aim for 6.">
        {(id) => (
          <select id={id} className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="13">3 months (13 weeks)</option>
            <option value="17">4 months (17 weeks)</option>
            <option value="26">6 months (26 weeks)</option>
            <option value="39">9 months (39 weeks)</option>
          </select>
        )}
      </Field>

      <div className="space-y-2">
        <div className="text-sm font-bold">How cautious should the range be?</div>
        <Segmented label="Range caution" value={conf} onChange={setConf} options={[{ value: "80", label: "Standard" }, { value: "90", label: "Extra cautious" }]} />
        <p className="text-xs text-muted">Extra cautious widens the low end, so dips get flagged earlier.</p>
      </div>

      <div className="space-y-3 rounded-xl bg-[#faf6ef] p-4 ring-1 ring-line">
        <Check checked={taxOn} onChange={setTaxOn}>
          <span className="font-bold">Track estimated tax</span>
          <span className="block text-xs text-muted">For income with no tax withheld (freelance, side work, most fellowships).</span>
        </Check>
        {taxOn && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Set aside" hint="Share of untaxed income">
              {(id) => (
                <div className="relative">
                  <input id={id} inputMode="decimal" className={`${inputCls} pr-7`} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                </div>
              )}
            </Field>
            <Field label="Untaxed income so far" hint="Received since Sep 1">
              {(id) => <MoneyInput id={id} value={taxReceived} onChange={setTaxReceived} />}
            </Field>
            {reserves.length > 0 && (
              <Field label="Tax money is kept in">
                {(id) => (
                  <select id={id} className={inputCls} value={taxAccount} onChange={(e) => setTaxAccount(e.target.value)}>
                    {reserves.map((a) => <option key={a.id} value={a.id}>{a.institution} {a.name}</option>)}
                  </select>
                )}
              </Field>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Income source

const KIND_OPTIONS: { value: IncomeStream["kind"]; label: string }[] = [
  { value: "salary", label: "Paycheck" },
  { value: "freelance_client", label: "Client / freelance" },
  { value: "stipend", label: "Stipend or fellowship" },
  { value: "loan_refund", label: "Loan refund" },
  { value: "bonus", label: "Bonus" },
  { value: "other", label: "Other" },
];

interface Row { key: string; label: string; date: string; amount: string; latest: string; confidence?: Confidence }

function detectRepeat(s?: IncomeStream) {
  if (!s || !(s.cadence === "weekly" || s.cadence === "biweekly" || s.cadence === "monthly") || s.payments.length < 2) return null;
  const amt = s.payments[0].amountCents;
  if (!s.payments.every((x) => x.amountCents === amt)) return null;
  const first = s.payments[0];
  return { cadence: s.cadence as RepeatCadence, amount: centsToInput(amt), next: first.expectedDate, late: String(first.latestDate ? daysBetween(first.expectedDate, first.latestDate) : 0) };
}

export function IncomeForm({ stream, today, onSave, onDelete, onCancel }: Done & { stream?: IncomeStream; today: string; onSave: (s: IncomeStream) => void; onDelete?: () => void }) {
  const rep = detectRepeat(stream);
  const [name, setName] = useState(stream?.name ?? "");
  const [kind, setKind] = useState<IncomeStream["kind"]>(stream?.kind ?? "freelance_client");
  const [confidence, setConfidence] = useState<Confidence>(stream?.confidence ?? "likely");
  const [taxWithheld, setTaxWithheld] = useState(stream?.taxWithheld ?? false);
  const [spread, setSpread] = useState(centsToInput(stream?.amountSpreadCents ?? 0));
  const [note, setNote] = useState(stream?.payDelayNote ?? "");
  const [mode, setMode] = useState<"repeat" | "specific">(stream ? (rep ? "repeat" : "specific") : "specific");
  const [cadence, setCadence] = useState<RepeatCadence>(rep?.cadence ?? "biweekly");
  const [amount, setAmount] = useState(rep?.amount ?? "");
  const [next, setNext] = useState(rep?.next ?? addDays(today, 7));
  const [late, setLate] = useState(rep?.late ?? "0");
  const [rows, setRows] = useState<Row[]>(
    stream && !rep
      ? stream.payments.map((x, i) => ({ key: `r${i}`, label: x.label ?? "", date: x.expectedDate, amount: centsToInput(x.amountCents), latest: x.latestDate ?? "", confidence: x.confidence }))
      : [{ key: "r0", label: "", date: addDays(today, 14), amount: "", latest: "" }],
  );
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const setRow = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give this income a name, like a client or employer.");
    const spreadC = parseDollars(spread || "0");
    if (spreadC === null || spreadC < 0) return setError("Variation should be a dollar amount.");
    let payments: IncomeStream["payments"];
    let cad: IncomeStream["cadence"];
    if (mode === "repeat") {
      const a = parseDollars(amount);
      if (!a || a <= 0) return setError("Enter how much each payment is.");
      if (!next) return setError("Pick the next payment date.");
      const lateN = Math.max(0, Math.round(Number(late) || 0));
      payments = repeatPayments(cadence, next, a, lateN, today);
      cad = cadence;
    } else {
      const parsed = rows.filter((r) => r.date || r.amount);
      if (parsed.length === 0) return setError("Add at least one expected payment.");
      payments = [];
      for (const r of parsed) {
        const a = parseDollars(r.amount);
        if (!a || a <= 0 || !r.date) return setError("Each payment needs a date and an amount.");
        if (r.latest && r.latest < r.date) return setError("“Could slip to” has to be on or after the expected date.");
        payments.push({ label: r.label.trim() || undefined, expectedDate: r.date, amountCents: a, latestDate: r.latest || undefined, confidence: r.confidence });
      }
      payments.sort((x, y) => (x.expectedDate < y.expectedDate ? -1 : 1));
      cad = kind === "loan_refund" || kind === "stipend" ? "per_term" : "irregular";
    }
    const s: IncomeStream = {
      id: stream?.id ?? newId("inc"),
      name: name.trim(),
      kind,
      cadence: cad,
      confidence,
      amountSpreadCents: spreadC,
      payDelayNote: note.trim() || undefined,
      taxWithheld,
      payments,
      summary: "",
    };
    s.summary = summarizeStream(s);
    onSave(s);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">{(id) => <input id={id} className={inputCls} value={name} placeholder="e.g. Corner & Co." onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Type">
          {(id) => (
            <select id={id} className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as IncomeStream["kind"])}>
              {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </Field>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-bold">How sure is it?</div>
        <Segmented label="Certainty" value={confidence} onChange={setConfidence} options={[{ value: "certain", label: "Certain" }, { value: "likely", label: "Likely" }, { value: "uncertain", label: "Not counted yet" }]} />
        <p className="text-xs text-muted">“Not counted yet” shows up only in the high case, so a maybe never props up your forecast.</p>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-bold">When does it arrive?</div>
        <Segmented label="Schedule" value={mode} onChange={setMode} options={[{ value: "repeat", label: "Repeats" }, { value: "specific", label: "Specific payments" }]} />

        {mode === "repeat" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How often">
              {(id) => (
                <select id={id} className={inputCls} value={cadence} onChange={(e) => setCadence(e.target.value as RepeatCadence)}>
                  <option value="weekly">Every week</option>
                  <option value="biweekly">Every other week</option>
                  <option value="monthly">Every month</option>
                </select>
              )}
            </Field>
            <Field label="Amount each time">{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}</Field>
            <Field label="Next payment">{(id) => <input id={id} type="date" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
            <Field label="Can arrive late by" hint="Days. 0 for a reliable paycheck.">
              {(id) => <input id={id} inputMode="numeric" className={inputCls} value={late} onChange={(e) => setLate(e.target.value)} />}
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <fieldset key={r.key} className="rounded-xl p-3 ring-1 ring-line">
                <legend className="px-1 text-xs font-bold text-muted">Payment {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Expected">{(id) => <input id={id} type="date" className={inputCls} value={r.date} onChange={(e) => setRow(r.key, { date: e.target.value })} />}</Field>
                  <Field label="Amount">{(id) => <MoneyInput id={id} value={r.amount} onChange={(v) => setRow(r.key, { amount: v })} />}</Field>
                  <Field label="Could slip to" hint="Optional: the latest it might come">
                    {(id) => <input id={id} type="date" className={inputCls} value={r.latest} onChange={(e) => setRow(r.key, { latest: e.target.value })} />}
                  </Field>
                  <Field label="Label" hint="Optional">{(id) => <input id={id} className={inputCls} value={r.label} placeholder="e.g. Holiday campaign" onChange={(e) => setRow(r.key, { label: e.target.value })} />}</Field>
                </div>
                {rows.length > 1 && (
                  <div className="mt-2 text-right">
                    <Button variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove payment</Button>
                  </div>
                )}
              </fieldset>
            ))}
            <Button variant="secondary" onClick={() => setRows((rs) => [...rs, { key: `r${Date.now()}`, label: "", date: "", amount: "", latest: "" }])}>+ Add another payment</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typical variation (±)" hint="How much one payment can differ. Widens the range.">
          {(id) => <MoneyInput id={id} value={spread} onChange={setSpread} />}
        </Field>
        <div className="pt-6"><Check checked={taxWithheld} onChange={setTaxWithheld}>Tax is already withheld</Check></div>
      </div>
      <Field label="Note" hint="Optional, e.g. “net-45, usually pays late”">
        {(id) => <input id={id} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>

      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} onDelete={onDelete} deleteLabel="Remove income" confirming={confirming} setConfirming={setConfirming} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Recurring bill

const BILL_CATEGORIES: { value: RecurringBill["category"]; label: string }[] = [
  { value: "housing", label: "Rent / housing" },
  { value: "utilities", label: "Utilities & phone" },
  { value: "insurance", label: "Insurance" },
  { value: "health", label: "Health" },
  { value: "debt", label: "Loan / debt payment" },
  { value: "card_payment", label: "Credit card payment" },
  { value: "transport", label: "Transport" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "business", label: "Business costs" },
  { value: "transfer", label: "Transfer to savings" },
];

export function BillForm({ bill, p, onSave, onDelete, onCancel }: Done & { bill?: RecurringBill; p: Profile; onSave: (b: RecurringBill) => void; onDelete?: () => void }) {
  const reserves = p.accounts.filter((a) => a.tier === "reserve");
  const [name, setName] = useState(bill?.name ?? "");
  const [category, setCategory] = useState<RecurringBill["category"]>(bill?.category ?? "utilities");
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amountCents) : "");
  const [cadence, setCadence] = useState<RecurringBill["cadence"]>(bill?.cadence ?? "monthly");
  const [day, setDay] = useState(String(bill?.dayOfMonth ?? 1));
  const [first, setFirst] = useState(bill?.firstDate ?? addDays(p.today, 7));
  const [spread, setSpread] = useState(centsToInput(bill?.amountSpreadCents ?? 0));
  const [essential, setEssential] = useState(bill?.essential ?? true);
  const [toAccount, setToAccount] = useState(bill?.toAccountId ?? (category === "transfer" ? reserves[0]?.id ?? "" : ""));
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const isTransfer = category === "transfer";

  function submit(e: FormEvent) {
    e.preventDefault();
    const a = parseDollars(amount);
    const s = parseDollars(spread || "0");
    if (!name.trim()) return setError("Name the bill.");
    if (!a || a <= 0) return setError("Enter the amount.");
    if (s === null || s < 0) return setError("Variation should be a dollar amount.");
    const d = Number(day);
    const monthly = cadence === "monthly" || cadence === "bimonthly";
    if (cadence === "monthly" && !(d >= 1 && d <= 31)) return setError("Day of month should be 1–31.");
    if (cadence !== "monthly" && !first) return setError("Pick the next date.");
    if (isTransfer && !toAccount) return setError("Pick the savings account it goes to.");
    onSave({
      id: bill?.id ?? newId("bill"),
      name: name.trim(),
      category,
      cadence,
      amountCents: -a,
      amountSpreadCents: s,
      dayOfMonth: monthly ? (cadence === "bimonthly" ? toDate(first).getUTCDate() : d) : undefined,
      firstDate: cadence === "monthly" ? undefined : first,
      toAccountId: isTransfer ? toAccount : undefined,
      essential: isTransfer ? false : essential,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">{(id) => <input id={id} className={inputCls} value={name} placeholder="e.g. Con Edison" onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Category">
          {(id) => (
            <select id={id} className={inputCls} value={category} onChange={(e) => { const c = e.target.value as RecurringBill["category"]; setCategory(c); if (c === "transfer" && !toAccount) setToAccount(reserves[0]?.id ?? ""); }}>
              {BILL_CATEGORIES.filter((c) => c.value !== "transfer" || reserves.length > 0).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Amount">{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}</Field>
        <Field label="Varies by (±)" hint="Utilities and card payments vary; rent doesn't.">{(id) => <MoneyInput id={id} value={spread} onChange={setSpread} />}</Field>
        <Field label="How often">
          {(id) => (
            <select id={id} className={inputCls} value={cadence} onChange={(e) => setCadence(e.target.value as RecurringBill["cadence"])}>
              <option value="monthly">Every month</option>
              <option value="bimonthly">Every 2 months</option>
              <option value="biweekly">Every other week</option>
              <option value="weekly">Every week</option>
            </select>
          )}
        </Field>
        {cadence === "monthly" ? (
          <Field label="Day of the month">{(id) => <input id={id} inputMode="numeric" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} />}</Field>
        ) : (
          <Field label="Next date">{(id) => <input id={id} type="date" className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} />}</Field>
        )}
      </div>
      {isTransfer ? (
        <Field label="Goes to">
          {(id) => (
            <select id={id} className={inputCls} value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
              {reserves.map((a) => <option key={a.id} value={a.id}>{a.institution} {a.name}</option>)}
            </select>
          )}
        </Field>
      ) : (
        <Check checked={essential} onChange={setEssential}>
          <span className="font-bold">Essential</span>
          <span className="block text-xs text-muted">Counts toward your Cash Runway. Turn off for things you&apos;d cancel.</span>
        </Check>
      )}
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} onDelete={onDelete} deleteLabel="Remove bill" confirming={confirming} setConfirming={setConfirming} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// One-off planned expense or income

export function EventForm({ event, today, onSave, onDelete, onCancel }: Done & { event?: PlannedEvent; today: string; onSave: (e: PlannedEvent) => void; onDelete?: () => void }) {
  const [name, setName] = useState(event?.name ?? "");
  const [kind, setKind] = useState<PlannedEvent["kind"]>(event?.kind ?? "purchase");
  const [dir, setDir] = useState<"out" | "in">(event && event.amountCents > 0 ? "in" : "out");
  const [amount, setAmount] = useState(event ? centsToInput(event.amountCents) : "");
  const [date, setDate] = useState(event?.dueDate ?? addDays(today, 21));
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const a = parseDollars(amount);
    if (!name.trim()) return setError("Name it, e.g. “Flight home”.");
    if (!a || a <= 0) return setError("Enter the amount.");
    if (!date) return setError("Pick a date.");
    onSave({ id: event?.id ?? newId("evt"), name: name.trim(), kind: dir === "in" ? "income_one_off" : kind, amountCents: dir === "in" ? a : -a, dueDate: date });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Segmented label="Direction" value={dir} onChange={setDir} options={[{ value: "out", label: "Money out" }, { value: "in", label: "Money in" }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What is it?">{(id) => <input id={id} className={inputCls} value={name} placeholder={dir === "out" ? "e.g. Flight home" : "e.g. Tax refund"} onChange={(e) => setName(e.target.value)} />}</Field>
        {dir === "out" && (
          <Field label="Type">
            {(id) => (
              <select id={id} className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as PlannedEvent["kind"])}>
                <option value="purchase">Purchase</option>
                <option value="travel">Travel</option>
                <option value="tuition">Tuition / school</option>
                <option value="deposit">Deposit</option>
                <option value="gift">Gifts</option>
                <option value="tax_payment">Tax payment (overrides the estimate)</option>
                <option value="other">Other</option>
              </select>
            )}
          </Field>
        )}
        <Field label="Amount">{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}</Field>
        <Field label="Date">{(id) => <input id={id} type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      </div>
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} onDelete={onDelete} deleteLabel="Remove" confirming={confirming} setConfirming={setConfirming} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Goal

export function GoalForm({ goal, today, accounts, onSave, onDelete, onCancel }: Done & { goal?: Goal; today: string; accounts: Account[]; onSave: (g: Goal) => void; onDelete?: () => void }) {
  const [accountId, setAccountId] = useState(goal?.accountId ?? "");
  const [name, setName] = useState(goal?.name ?? "");
  const [kind, setKind] = useState<Goal["kind"]>(goal?.kind ?? "emergency_fund");
  const [target, setTarget] = useState(goal ? centsToInput(goal.targetCents) : "");
  const [date, setDate] = useState(goal?.targetDate ?? addDays(today, 365));
  const [saved, setSaved] = useState(goal ? centsToInput(goal.savedCents) : "0");
  const [monthly, setMonthly] = useState(goal ? centsToInput(goal.monthlyContributionCents) : "");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = parseDollars(target);
    const s = parseDollars(saved || "0");
    const m = parseDollars(monthly || "0");
    if (!name.trim()) return setError("Name the goal.");
    if (!t || t <= 0) return setError("Enter a target amount.");
    if (s === null || s < 0 || m === null || m < 0) return setError("Saved and monthly amounts should be dollar amounts.");
    if (!date || date <= today) return setError("Pick a date in the future.");
    onSave({ id: goal?.id ?? newId("goal"), name: name.trim(), kind, targetCents: t, targetDate: date, savedCents: s, monthlyContributionCents: m, accountId: accountId || undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Goal">{(id) => <input id={id} className={inputCls} value={name} placeholder="e.g. Down payment" onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Type">
          {(id) => (
            <select id={id} className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Goal["kind"])}>
              <option value="emergency_fund">Emergency fund</option>
              <option value="home_down_payment">Home down payment</option>
              <option value="car">Car</option>
              <option value="education">School</option>
              <option value="debt_payoff">Pay off debt</option>
              <option value="travel">Travel</option>
              <option value="other">Other</option>
            </select>
          )}
        </Field>
        <Field label="Target amount">{(id) => <MoneyInput id={id} value={target} onChange={setTarget} />}</Field>
        <Field label="By">{(id) => <input id={id} type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        {accounts.length > 0 && (
          <Field label="Saves into" hint={accountId ? "Saved and monthly amounts come from this account: its balance, plus what the Payday Plan or a recurring transfer puts in." : undefined}>
            {(id) => (
              <select id={id} className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">No specific account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.institution} {a.name}</option>)}
              </select>
            )}
          </Field>
        )}
        {!accountId && (
          <>
            <Field label="Saved so far">{(id) => <MoneyInput id={id} value={saved} onChange={setSaved} />}</Field>
            <Field label="Putting in each month">{(id) => <MoneyInput id={id} value={monthly} onChange={setMonthly} />}</Field>
          </>
        )}
      </div>
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} onDelete={onDelete} deleteLabel="Remove goal" confirming={confirming} setConfirming={setConfirming} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Account (rename, change what it counts as, disconnect)

const TIER_OPTIONS: { value: Tier; label: string; help: string }[] = [
  { value: "operating", label: "Spending money", help: "Bills come out of it. This is what the 12-week forecast tracks." },
  { value: "reserve", label: "Buffer", help: "Savings you'd move to checking to cover a dip." },
  { value: "long_term", label: "Long-term", help: "Investments or retirement. Not counted as cash." },
  { value: "excluded", label: "Don't count", help: "Cards, loans, or anything to leave out." },
];

const PURPOSE_OPTIONS: { value: "" | "emergency" | "goals"; label: string; help: string }[] = [
  { value: "emergency", label: "Emergency fund", help: "The Payday Plan tops it up; suggestions draw on it first." },
  { value: "goals", label: "Goals", help: "Money for your goals. Suggestions draw on it last." },
  { value: "", label: "General savings", help: "Counted as a buffer, drawn on after the emergency fund." },
];

export function AccountForm({ account, isTax, onSave, onDelete, onCancel }: Done & { account: Account; isTax?: boolean; onSave: (a: Account) => void; onDelete: () => void }) {
  const [name, setName] = useState(account.name);
  const [tier, setTier] = useState<Tier>(account.tier);
  const [purpose, setPurpose] = useState<"" | "emergency" | "goals">(account.purpose ?? "");
  const [balance, setBalance] = useState((account.balanceCents < 0 ? "-" : "") + centsToInput(account.balanceCents));
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const b = parseDollars(balance);
    if (!name.trim()) return setError("Give the account a name.");
    if (b === null) return setError("Balance should be a dollar amount.");
    onSave({ ...account, name: name.trim(), tier, balanceCents: b, purpose: tier === "reserve" && !isTax && purpose ? purpose : undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-muted">{account.institution} ••{account.mask}</p>
      <Field label="Nickname">{(id) => <input id={id} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <div className="space-y-2">
        <div className="text-sm font-bold">What is this account for?</div>
        <div className="grid gap-2">
          {TIER_OPTIONS.map((o) => (
            <label key={o.value} className={`flex cursor-pointer gap-2.5 rounded-xl p-3 ring-1 ${tier === o.value ? "bg-accent-soft ring-accent" : "ring-line hover:bg-[#faf6ef]"}`}>
              <input type="radio" name="tier" className="mt-0.5 accent-[var(--accent)]" checked={tier === o.value} onChange={() => setTier(o.value)} />
              <span><span className="block text-sm font-bold">{o.label}</span><span className="block text-xs text-muted">{o.help}</span></span>
            </label>
          ))}
        </div>
      </div>
      {tier === "reserve" &&
        (isTax ? (
          <p className="rounded-xl bg-sun-soft px-3 py-2 text-sm">This is your tax savings (set in tax settings). It pays estimated tax and isn&apos;t counted as spendable cash.</p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-bold">Used for</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {PURPOSE_OPTIONS.map((o) => (
                <label key={o.value || "general"} className={`flex cursor-pointer gap-2 rounded-xl p-2.5 ring-1 ${purpose === o.value ? "bg-accent-soft ring-accent" : "ring-line hover:bg-[#faf6ef]"}`}>
                  <input type="radio" name="purpose" className="mt-0.5 accent-[var(--accent)]" checked={purpose === o.value} onChange={() => setPurpose(o.value)} />
                  <span><span className="block text-sm font-bold">{o.label}</span><span className="block text-xs text-muted">{o.help}</span></span>
                </label>
              ))}
            </div>
          </div>
        ))}
      <Field label="Balance (demo)" hint="In the real app this comes from your bank and can't be edited. Change it here to see how the forecast reacts.">
        {(id) => <MoneyInput id={id} value={balance} onChange={setBalance} />}
      </Field>
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} onDelete={onDelete} deleteLabel="Disconnect" confirming={confirming} setConfirming={setConfirming} />
      <p className="text-xs text-muted">Disconnecting removes the account and stops syncing. In the real app, Runway would also revoke its access at the bank. Current balance shown: {usd(account.balanceCents)}.</p>
    </form>
  );
}

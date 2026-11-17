"use client";

import { useState, type FormEvent } from "react";
import { centsToInput, parseDollars } from "@/lib/edit";
import { rulesOf, STYLES } from "@/lib/engine/rules";
import { usd } from "@/lib/format";
import type { MoneyRules, Profile, SavingsStyle } from "@/lib/types";
import { Field, FormActions, MoneyInput, Segmented } from "./fields";

// Money rules: the user's cash-flow policy. Shared by Account Details and signup.

export const PREDICTABILITY: { value: MoneyRules["predictability"]; label: string }[] = [
  { value: "very_steady", label: "Very steady" },
  { value: "mostly_steady", label: "Mostly steady" },
  { value: "lumpy", label: "Lumpy" },
  { value: "feast_famine", label: "Feast or famine" },
];

export const CLIENTS_PAY: { value: MoneyRules["clientsPay"]; label: string }[] = [
  { value: "on_time", label: "On time" },
  { value: "1_2_weeks_late", label: "1–2 weeks late" },
  { value: "3_plus_weeks_late", label: "3+ weeks late" },
];

export const CUSHION: { value: "0.5" | "1" | "2"; label: string }[] = [
  { value: "0.5", label: "½ week" },
  { value: "1", label: "1 week" },
  { value: "2", label: "2 weeks" },
];

/** What a style does to a sample $1,000 client payment, before checking what you can spare. */
export function styleExample(style: SavingsStyle, taxPct: number) {
  const afterTax = 100_000 - Math.round((100_000 * taxPct) / 100);
  const s = STYLES[style];
  const pieces = [`${usd((100_000 * taxPct) / 100)} tax`, `${usd((afterTax * s.bufferPct) / 100)} buffer`, `${usd((afterTax * s.retirementPct) / 100)} retirement`];
  if (s.goalPace > 1) pieces.push("goals ahead of schedule");
  return pieces.join(" · ");
}

export function StylePicker({ value, onChange, taxPct }: { value: SavingsStyle; onChange: (v: SavingsStyle) => void; taxPct: number }) {
  return (
    <div role="radiogroup" aria-label="Savings style" className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(STYLES) as SavingsStyle[]).map((k) => (
        <label key={k} className={`flex cursor-pointer flex-col gap-1 rounded-xl p-3 ring-1 ${value === k ? "bg-accent-soft ring-accent" : "ring-line hover:bg-[#faf6ef]"}`}>
          <span className="flex items-center gap-2">
            <input type="radio" name="savings-style" className="accent-[var(--accent)]" checked={value === k} onChange={() => onChange(k)} />
            <span className="text-sm font-bold">{STYLES[k].label}</span>
          </span>
          <span className="text-xs text-muted">Per $1,000: {styleExample(k, taxPct)}</span>
        </label>
      ))}
    </div>
  );
}

export function RulesForm({ p, onSave, onCancel }: { p: Profile; onSave: (rules: MoneyRules) => void; onCancel: () => void }) {
  const r = rulesOf(p);
  const [style, setStyle] = useState<SavingsStyle>(r.savingsStyle);
  const [predictability, setPredictability] = useState(r.predictability);
  const [clientsPay, setClientsPay] = useState(r.clientsPay);
  const [cushion, setCushion] = useState(String(r.cushionWeeks) as "0.5" | "1" | "2");
  const [minSpend, setMinSpend] = useState(r.minWeeklySpendCents ? centsToInput(r.minWeeklySpendCents) : "");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const min = parseDollars(minSpend || "0");
    if (min === null || min < 0) return setError("Minimum weekly spending should be a dollar amount.");
    onSave({ ...r, savingsStyle: style, predictability, clientsPay, cushionWeeks: Number(cushion) as MoneyRules["cushionWeeks"], minWeeklySpendCents: min });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <div className="text-sm font-bold">Savings style</div>
        <StylePicker value={style} onChange={setStyle} taxPct={p.tax?.setAsidePct ?? 0} />
        <p className="text-xs text-muted">The Payday Plan only moves money checking can spare. Push hard pauses itself when cash gets tight.</p>
      </div>
      <Field label="How predictable is your income?">{() => <Segmented label="How predictable is your income?" value={predictability} onChange={setPredictability} options={PREDICTABILITY} />}</Field>
      <Field label="Clients usually pay">{() => <Segmented label="Clients usually pay" value={clientsPay} onChange={setClientsPay} options={CLIENTS_PAY} />}</Field>
      <Field label="Keep in checking as a cushion">{() => <Segmented label="Cushion" value={cushion} onChange={setCushion} options={CUSHION} />}</Field>
      <Field label="Minimum weekly spending" hint="Groceries, transit and the basics. Pay yourself warns if it can't cover this.">
        {(id) => <MoneyInput id={id} value={minSpend} onChange={setMinSpend} placeholder="e.g. 120" />}
      </Field>
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} confirming={false} setConfirming={() => {}} />
    </form>
  );
}

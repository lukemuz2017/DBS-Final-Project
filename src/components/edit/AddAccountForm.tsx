"use client";

import { useState, type FormEvent } from "react";
import { newId, parseDollars } from "@/lib/edit";
import { payTaxesOf } from "@/lib/engine/rules";
import type { AccountKind, AccountUse } from "@/lib/onboarding";
import type { Account, Profile } from "@/lib/types";
import { Field, FormActions, inputCls, MoneyInput, Segmented } from "./fields";
import { InstitutionInput } from "./InstitutionInput";

// Add an account by hand (signed-in users, until bank connections arrive). Opened from
// Account Details or from a Finish setup suggestion, pre-filled with what's missing.

export interface AddAccountPreset {
  kind?: Exclude<AccountKind, "loan">;
  use?: AccountUse;
  name?: string;
}

const KINDS: { value: Exclude<AccountKind, "loan">; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "retirement", label: "Retirement" },
  { value: "credit_card", label: "Credit card" },
];

export function AddAccountForm({ p, preset, onSave, onCancel }: { p: Profile; preset?: AddAccountPreset; onSave: (p: Profile) => void; onCancel: () => void }) {
  const untaxed = payTaxesOf(p) !== "withheld" || Boolean(p.tax);
  const uses: { value: AccountUse; label: string }[] = [
    { value: "emergency", label: "Emergency fund" },
    ...(untaxed ? [{ value: "taxes" as const, label: "Taxes" }] : []),
    { value: "goals", label: "Goals" },
    { value: "general", label: "General" },
  ];
  const [kind, setKind] = useState(preset?.kind ?? "savings");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState(preset?.name ?? "");
  const [amount, setAmount] = useState("");
  const [use, setUse] = useState<AccountUse>(preset?.use ?? "emergency");
  const [dueDay, setDueDay] = useState("");
  const [paysInFull, setPaysInFull] = useState(true);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseDollars(amount || "0");
    if (cents === null || cents < 0) return setError("Balance should be a dollar amount.");
    if (!institution.trim()) return setError("Which bank is it with?");
    const day = Number(dueDay);
    if (kind === "credit_card" && dueDay && (!Number.isInteger(day) || day < 1 || day > 31)) return setError("Due day should be a day of the month (1–31).");
    const id = newId("acct");
    const tier = kind === "checking" ? "operating" : kind === "savings" ? "reserve" : kind === "retirement" ? "long_term" : "excluded";
    const account: Account = {
      id,
      institution: institution.trim(),
      name: name.trim() || { checking: "Checking", savings: use === "taxes" ? "Tax savings" : "Savings", retirement: "Retirement", credit_card: "Credit card" }[kind],
      mask: "",
      type: kind === "retirement" ? "investment" : kind,
      tier,
      balanceCents: kind === "credit_card" ? -cents : cents,
      balanceAsOf: `${p.today}T12:00:00Z`,
      purpose: kind === "savings" && (use === "emergency" || use === "goals") ? use : undefined,
      ...(kind === "credit_card" ? { paymentDueDay: dueDay ? day : undefined, paysInFull } : {}),
    };
    // A savings account for taxes becomes where the tax set-aside goes.
    const tax = kind === "savings" && use === "taxes" && p.tax ? { ...p.tax, reserveAccountId: id } : p.tax;
    onSave({ ...p, accounts: [...p.accounts, account], tax });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Type">{() => <Segmented label="Account type" value={kind} onChange={setKind} options={KINDS} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bank">{(id) => <InstitutionInput id={id} value={institution} kind={kind} onChange={setInstitution} />}</Field>
        <Field label="Nickname">{(id) => <input id={id} className={inputCls} value={name} placeholder="optional" onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={kind === "credit_card" ? "You owe" : "Balance"} hint={kind === "savings" || kind === "retirement" ? "Starting at $0 is fine." : undefined}>
          {(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}
        </Field>
        {kind === "credit_card" && (
          <Field label="Payment due day">{(id) => <input id={id} className={inputCls} inputMode="numeric" value={dueDay} placeholder="22" onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />}</Field>
        )}
      </div>
      {kind === "savings" && <Field label="Used for">{() => <Segmented label="Used for" value={use} onChange={setUse} options={uses} />}</Field>}
      {kind === "credit_card" && (
        <Field label="Do you pay it off every month?">
          {() => <Segmented label="Pays in full" value={paysInFull ? "yes" : "no"} onChange={(v) => setPaysInFull(v === "yes")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No, I carry a balance" }]} />}
        </Field>
      )}
      {error && <p className="text-sm font-bold text-warn" role="alert">{error}</p>}
      <FormActions onCancel={onCancel} confirming={false} setConfirming={() => {}} saveLabel="Add account" />
    </form>
  );
}

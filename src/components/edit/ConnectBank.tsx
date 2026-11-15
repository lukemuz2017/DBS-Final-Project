"use client";

import { useEffect, useMemo, useState } from "react";
import { newId } from "@/lib/edit";
import { usd } from "@/lib/format";
import type { Account, Tier } from "@/lib/types";
import { Button, inputCls } from "./fields";

// A demo of what connecting a bank through Plaid would feel like.
// Deliberately has NO username/password fields: in the real flow you sign in
// on your bank's own page inside Plaid's window, and Runway never sees it.

const BANKS = [
  { id: "chase", name: "Chase", color: "#117aca" },
  { id: "bofa", name: "Bank of America", color: "#e31837" },
  { id: "wells", name: "Wells Fargo", color: "#d71e28" },
  { id: "citi", name: "Citi", color: "#056dae" },
  { id: "capone", name: "Capital One", color: "#d03027" },
  { id: "ally", name: "Ally", color: "#650360" },
  { id: "sofi", name: "SoFi", color: "#00a2c7" },
  { id: "marcus", name: "Marcus by Goldman Sachs", color: "#1f2a44" },
  { id: "amex", name: "American Express", color: "#006fcf" },
  { id: "schwab", name: "Charles Schwab", color: "#00a0df" },
  { id: "alliant", name: "Alliant Credit Union", color: "#0f6b3c" },
  { id: "navy", name: "Navy Federal Credit Union", color: "#003b71" },
];

type Bank = (typeof BANKS)[number];

interface Offer { key: string; name: string; type: Account["type"]; mask: string; balanceCents: number; tier: Tier; selected: boolean }

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h);
}

/** Believable sandbox-style accounts for a bank, the same every time. */
function offersFor(bank: Bank): Offer[] {
  const h = hash(bank.id);
  const mask = (n: number) => String(1000 + ((h >> n) % 9000));
  const out: Offer[] = [
    { key: "chk", name: "Checking", type: "checking", mask: mask(1), balanceCents: 80_000 + (h % 300_000), tier: "operating", selected: true },
    { key: "sav", name: "Savings", type: "savings", mask: mask(3), balanceCents: 150_000 + ((h >> 4) % 900_000), tier: "reserve", selected: true },
  ];
  if (h % 3 !== 0) out.push({ key: "card", name: "Credit Card", type: "credit_card", mask: mask(5), balanceCents: -(20_000 + ((h >> 6) % 180_000)), tier: "excluded", selected: false });
  return out;
}

type Step = "pick" | "consent" | "signing" | "accounts" | "done";

export function ConnectBank({ today, onConnect, onCancel }: { today: string; onConnect: (accounts: Account[]) => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>("pick");
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState<Bank | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [added, setAdded] = useState<Account[]>([]);

  const matches = useMemo(() => BANKS.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  // Simulated hand-off to the bank's own sign-in page.
  useEffect(() => {
    if (step !== "signing") return;
    const t = setTimeout(() => setStep("accounts"), 1400);
    return () => clearTimeout(t);
  }, [step]);

  function finish() {
    const accounts: Account[] = offers
      .filter((o) => o.selected)
      .map((o) => ({ id: newId("acct"), institution: bank!.name, name: o.name, mask: o.mask, type: o.type, tier: o.tier, balanceCents: o.balanceCents, balanceAsOf: `${today}T12:00:00Z`, connectedAt: `${today}T12:00:00Z` }));
    setAdded(accounts);
    onConnect(accounts);
    setStep("done");
  }

  return (
    <div className="space-y-5">
      <ol className="flex gap-1.5" aria-label="Progress">
        {(["pick", "consent", "accounts", "done"] as const).map((s, i) => {
          const order = ["pick", "consent", "signing", "accounts", "done"];
          const reached = order.indexOf(step) >= order.indexOf(s);
          return <li key={s} className={`h-1.5 flex-1 rounded-full ${reached ? "bg-accent" : "bg-band"}`} aria-label={`Step ${i + 1}`} />;
        })}
      </ol>

      {step === "pick" && (
        <div className="space-y-4">
          <p className="text-sm">Pick your bank. Runway connects through <strong>Plaid</strong>, a service most finance apps use, and only ever <strong>reads</strong> balances and transactions.</p>
          <input className={inputCls} placeholder="Search banks and credit unions" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search banks" autoFocus />
          <ul className="grid grid-cols-2 gap-2">
            {matches.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => { setBank(b); setOffers(offersFor(b)); setStep("consent"); }} className="flex w-full items-center gap-2.5 rounded-xl p-3 text-left text-sm font-bold ring-1 ring-line hover:bg-accent-soft hover:ring-accent">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white" style={{ background: b.color }} aria-hidden="true">{b.name[0]}</span>
                  {b.name}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="col-span-2 text-sm text-muted">No match in this demo list. The real flow searches thousands of banks.</li>}
          </ul>
        </div>
      )}

      {step === "consent" && bank && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: bank.color }} aria-hidden="true">{bank.name[0]}</span>
            <div>
              <div className="font-display text-lg font-bold">Connect {bank.name}</div>
              <div className="text-xs text-muted">via Plaid · demo</div>
            </div>
          </div>
          <ul className="space-y-2.5 text-sm">
            <li className="flex gap-2"><Tick /> <span><strong>Read-only.</strong> Runway sees balances and the last 90 days of transactions. It can&apos;t move money.</span></li>
            <li className="flex gap-2"><Tick /> <span><strong>Your password stays with your bank.</strong> You sign in on {bank.name}&apos;s own page. Runway never sees it.</span></li>
            <li className="flex gap-2"><Tick /> <span><strong>Disconnect any time</strong> from Accounts, which also revokes access.</span></li>
          </ul>
          <div className="rounded-xl bg-sun-soft p-3 text-xs ring-1 ring-sun">
            <strong>Demo:</strong> no real bank is contacted. The next step pretends you signed in and returns sample accounts.
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep("pick")}>Back</Button>
            <Button onClick={() => setStep("signing")}>Continue to {bank.name}</Button>
          </div>
        </div>
      )}

      {step === "signing" && bank && (
        <div className="grid place-items-center gap-3 py-12 text-center" role="status">
          <span className="size-9 animate-spin rounded-full border-4 border-band border-t-accent" aria-hidden="true" />
          <p className="font-bold">Signing in at {bank.name}…</p>
          <p className="max-w-xs text-xs text-muted">In the real app this is {bank.name}&apos;s own sign-in page, opened by Plaid.</p>
        </div>
      )}

      {step === "accounts" && bank && (
        <div className="space-y-4">
          <p className="text-sm">Choose which {bank.name} accounts Runway can see, and what each one is for.</p>
          <ul className="space-y-2">
            {offers.map((o) => (
              <li key={o.key} className={`rounded-xl p-3 ring-1 ${o.selected ? "ring-accent" : "ring-line"}`}>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={o.selected} onChange={(e) => setOffers((os) => os.map((x) => (x.key === o.key ? { ...x, selected: e.target.checked } : x)))} />
                    <span><span className="block text-sm font-bold">{o.name} ••{o.mask}</span><span className="block text-xs text-muted">{o.type === "credit_card" ? "Card balance" : "Available"}: {usd(o.balanceCents)}</span></span>
                  </span>
                </label>
                {o.selected && (
                  <select aria-label={`What ${o.name} is for`} className={`${inputCls} mt-2`} value={o.tier} onChange={(e) => setOffers((os) => os.map((x) => (x.key === o.key ? { ...x, tier: e.target.value as Tier } : x)))}>
                    <option value="operating">Spending money (bills come out of it)</option>
                    <option value="reserve">Buffer (savings)</option>
                    <option value="long_term">Long-term (not counted as cash)</option>
                    <option value="excluded">Don&apos;t count</option>
                  </select>
                )}
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={finish} disabled={!offers.some((o) => o.selected)}>Connect {offers.filter((o) => o.selected).length} account{offers.filter((o) => o.selected).length === 1 ? "" : "s"}</Button>
          </div>
        </div>
      )}

      {step === "done" && bank && (
        <div className="space-y-4">
          <div className="rounded-xl bg-accent-soft p-4 ring-1 ring-accent/30">
            <div className="font-display text-lg font-bold">Connected</div>
            <p className="mt-1 text-sm">{added.length} {bank.name} account{added.length === 1 ? "" : "s"} added. Your forecast has already updated.</p>
          </div>
          <p className="text-sm text-muted">
            In the real app, Runway would now read about 90 days of history and suggest the paychecks and bills it finds, for you to confirm. This demo adds the balances only.
          </p>
          <div className="flex justify-end"><Button onClick={onCancel}>Done</Button></div>
        </div>
      )}
    </div>
  );
}

function Tick() {
  return <svg className="mt-0.5 shrink-0 text-accent" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--accent-soft)" /><path d="M5 8.3 7 10.2 11 5.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

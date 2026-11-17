// Everyday spending from transactions (for bank sync): the weekly average the forecast
// uses for "Other expenses". Pure and deterministic.
//
// Counted once, however it was paid:
//   + purchases from checking (debit, cash) and from credit cards.
// Never counted:
//   - card payments and other transfers between your own accounts (isInternalTransfer),
//     so a card purchase isn't counted again when the card bill is paid;
//   - recurring bills (rent, phone): the forecast schedules those separately;
//   - money coming in (refunds and income have positive amounts).

import { addDays } from "../format";
import type { Profile } from "../types";

export function everydaySpending(p: Profile, weeks = 8): { weeklyMeanCents: number; weeklySdCents: number; counted: number } {
  const spendAccounts = new Set(p.accounts.filter((a) => a.tier === "operating" || a.type === "credit_card").map((a) => a.id));
  const from = addDays(p.today, -7 * weeks);
  const totals = new Array<number>(weeks).fill(0);
  let counted = 0;
  for (const t of p.transactions) {
    if (t.postedDate <= from || t.postedDate > p.today) continue;
    if (t.amountCents >= 0 || t.isInternalTransfer || t.recurringBillId || !spendAccounts.has(t.accountId)) continue;
    // Week 0 is the most recent seven days.
    const daysAgo = Math.round((Date.parse(p.today) - Date.parse(t.postedDate)) / 86_400_000);
    totals[Math.min(weeks - 1, Math.floor(daysAgo / 7))] += -t.amountCents;
    counted++;
  }
  const mean = totals.reduce((s, x) => s + x, 0) / weeks;
  const sd = Math.sqrt(totals.reduce((s, x) => s + (x - mean) ** 2, 0) / weeks);
  return { weeklyMeanCents: Math.round(mean), weeklySdCents: Math.round(sd), counted };
}

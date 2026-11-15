// Builds a believable, repeatable transaction history for a demo profile:
// the fixed items you list (paychecks, rent, bills) plus everyday spending
// drawn from a seeded random generator, so every reload shows the same data.

import { addDays } from "../format";
import type { Transaction } from "../types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpendPattern {
  merchant: string;
  category: string;
  accountId: string;
  minCents: number;
  maxCents: number;
  perWeek: number; // average visits per week
}

export function buildHistory(opts: {
  seed: number;
  today: string;
  days: number;
  fixed: Omit<Transaction, "id">[];
  spend: SpendPattern[];
}): Transaction[] {
  const rand = mulberry32(opts.seed);
  const out: Omit<Transaction, "id">[] = [...opts.fixed];
  for (let i = 0; i < opts.days; i++) {
    const date = addDays(opts.today, -i);
    for (const s of opts.spend) {
      if (rand() < s.perWeek / 7) {
        const amt = s.minCents + rand() * (s.maxCents - s.minCents);
        out.push({ accountId: s.accountId, postedDate: date, amountCents: -Math.round(amt), merchant: s.merchant, category: s.category });
      }
    }
  }
  return out
    .filter((t) => t.postedDate <= opts.today && t.postedDate > addDays(opts.today, -opts.days))
    .sort((a, b) => (a.postedDate < b.postedDate ? 1 : a.postedDate > b.postedDate ? -1 : a.amountCents - b.amountCents))
    .map((t, i) => ({ ...t, id: `t${opts.seed}-${i}` }));
}

/** Repeat a monthly item on `day` for each month between two dates. */
export function monthly(
  item: Omit<Transaction, "id" | "postedDate">,
  day: number,
  months: string[], // "2026-09", "2026-10", ...
): Omit<Transaction, "id">[] {
  return months.map((m) => ({ ...item, postedDate: `${m}-${String(day).padStart(2, "0")}` }));
}

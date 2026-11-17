// Common US banks, credit unions, card issuers, brokerages and loan servicers, for the
// "Bank" suggestions in setup. Brand names people recognize, not legal names. Kept in
// the app so nothing typed is sent anywhere. When bank connections arrive (Plaid),
// its institution search can replace this list behind the same input.

import type { AccountKind } from "./onboarding";

export interface Institution {
  name: string;
  /** Other names people type ("BofA", "Amex"). */
  aliases?: string[];
  /** Account kinds this institution is best known for, to rank suggestions. */
  kinds: AccountKind[];
}

const BANK: AccountKind[] = ["checking", "savings", "credit_card", "loan"];

export const INSTITUTIONS: Institution[] = [
  // Big banks
  { name: "Chase", aliases: ["JPMorgan Chase"], kinds: BANK },
  { name: "Bank of America", aliases: ["BofA", "BoA"], kinds: BANK },
  { name: "Wells Fargo", kinds: BANK },
  { name: "Citi", aliases: ["Citibank"], kinds: BANK },
  { name: "Capital One", kinds: BANK },
  { name: "U.S. Bank", aliases: ["US Bank"], kinds: BANK },
  { name: "PNC", kinds: BANK },
  { name: "Truist", kinds: BANK },
  { name: "TD Bank", kinds: BANK },
  { name: "Citizens", kinds: BANK },
  { name: "Fifth Third", kinds: BANK },
  { name: "KeyBank", kinds: BANK },
  { name: "Huntington", kinds: BANK },
  { name: "Regions", kinds: BANK },
  { name: "M&T Bank", kinds: BANK },
  { name: "BMO", kinds: BANK },
  { name: "Santander", kinds: BANK },
  { name: "First Citizens", kinds: BANK },
  { name: "HSBC", kinds: BANK },
  // Online banks and fintech
  { name: "Ally", kinds: ["checking", "savings", "loan"] },
  { name: "Marcus by Goldman Sachs", aliases: ["Goldman Sachs"], kinds: ["savings"] },
  { name: "Discover", kinds: ["savings", "checking", "credit_card"] },
  { name: "SoFi", kinds: ["checking", "savings", "loan", "retirement"] },
  { name: "Chime", kinds: ["checking", "savings"] },
  { name: "Varo", kinds: ["checking", "savings"] },
  { name: "Axos", kinds: ["checking", "savings"] },
  { name: "American Express", aliases: ["Amex"], kinds: ["credit_card", "savings"] },
  { name: "Synchrony", kinds: ["savings", "credit_card"] },
  { name: "Barclays", kinds: ["savings", "credit_card"] },
  { name: "Wealthfront", kinds: ["savings", "retirement"] },
  { name: "Betterment", kinds: ["savings", "retirement"] },
  { name: "Novo", kinds: ["checking"] },
  { name: "Mercury", kinds: ["checking"] },
  { name: "Bluevine", kinds: ["checking"] },
  { name: "Found", kinds: ["checking"] },
  { name: "Apple Card", aliases: ["Apple"], kinds: ["credit_card", "savings"] },
  { name: "Bilt", kinds: ["credit_card"] },
  // Credit unions
  { name: "Navy Federal Credit Union", aliases: ["NFCU"], kinds: BANK },
  { name: "PenFed Credit Union", kinds: BANK },
  { name: "Alliant Credit Union", kinds: BANK },
  { name: "BECU", kinds: BANK },
  { name: "Golden 1 Credit Union", kinds: BANK },
  { name: "SchoolsFirst Federal Credit Union", kinds: BANK },
  { name: "USAA", kinds: BANK },
  // Brokerages and retirement
  { name: "Fidelity", kinds: ["retirement", "checking"] },
  { name: "Vanguard", kinds: ["retirement"] },
  { name: "Charles Schwab", aliases: ["Schwab"], kinds: ["retirement", "checking"] },
  { name: "E*TRADE", aliases: ["ETrade", "Morgan Stanley"], kinds: ["retirement"] },
  { name: "Robinhood", kinds: ["retirement"] },
  { name: "Merrill", aliases: ["Merrill Edge", "Merrill Lynch"], kinds: ["retirement"] },
  { name: "Empower", kinds: ["retirement"] },
  { name: "Principal", kinds: ["retirement"] },
  { name: "Guideline", kinds: ["retirement"] },
  // Loan servicers and lenders
  { name: "Nelnet", kinds: ["loan"] },
  { name: "MOHELA", kinds: ["loan"] },
  { name: "Aidvantage", kinds: ["loan"] },
  { name: "Sallie Mae", kinds: ["loan", "savings"] },
  { name: "Earnest", kinds: ["loan"] },
  { name: "Laurel Road", kinds: ["loan"] },
  { name: "Upstart", kinds: ["loan"] },
  { name: "LendingClub", kinds: ["loan", "savings"] },
  { name: "Honda Financial Services", aliases: ["Honda"], kinds: ["loan"] },
  { name: "Toyota Financial Services", aliases: ["Toyota"], kinds: ["loan"] },
  { name: "Affirm", kinds: ["loan"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Up to `max` suggestions for what's typed: names (or aliases) that start with it first,
 * then ones containing it, each favoring institutions known for this kind of account.
 */
export function suggestInstitutions(query: string, kind?: AccountKind, max = 3): Institution[] {
  const q = norm(query);
  if (!q) return [];
  const scored = INSTITUTIONS.map((inst) => {
    const names = [inst.name, ...(inst.aliases ?? [])].map(norm);
    const starts = names.some((n) => n.startsWith(q)) || inst.name.split(/\s+/).some((w) => norm(w).startsWith(q));
    const contains = names.some((n) => n.includes(q));
    if (!starts && !contains) return null;
    const score = (starts ? 2 : 0) + (kind && inst.kinds.includes(kind) ? 1 : 0);
    return { inst, score };
  }).filter((x): x is { inst: Institution; score: number } => x !== null);
  return scored
    .sort((a, b) => b.score - a.score || a.inst.name.length - b.inst.name.length)
    .slice(0, max)
    .map((x) => x.inst);
}

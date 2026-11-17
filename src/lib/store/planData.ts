// Converts between a signed-in user's database rows (profiles + plans) and the
// Profile shape the forecast engine and screens use. Pure: no I/O, easy to test.

import { DEFAULT_RULES } from "../engine/rules";
import type { MoneyRules, Profile, ProfileType } from "../types";

/** A row of public.profiles (see supabase/migrations). */
export interface ProfileRow {
  user_id: string;
  display_name: string;
  occupation: string;
  city: string;
  state: string;
  birth_year: number | null;
  profile_type: ProfileType;
  timezone: string;
  runway_target_weeks: number;
  range_confidence: 80 | 90;
  savings_style: MoneyRules["savingsStyle"];
  predictability: MoneyRules["predictability"];
  clients_pay: MoneyRules["clientsPay"];
  cushion_weeks: number | string; // numeric comes back as a number or a string
  min_weekly_spend_cents: number;
  dismissed_gaps: string[];
  onboarded_at: string | null;
  tour_seen_at: string | null;
}

/** What public.plans.data holds: everything about the user's money that isn't on the profile row. */
export type PlanData = Pick<Profile, "accounts" | "incomeStreams" | "recurringBills" | "plannedEvents" | "spending" | "goals"> &
  Partial<Pick<Profile, "tax" | "retirement" | "history" | "payTaxes">>;

export const PLAN_SCHEMA_VERSION = 1;

export function emptyPlanData(): PlanData {
  return { accounts: [], incomeStreams: [], recurringBills: [], plannedEvents: [], spending: { weeklyMeanCents: 0, weeklySdCents: 0 }, goals: [] };
}

/** Today's date (YYYY-MM-DD) in the user's time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function initialsOf(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "ME";
}

export function toProfile(row: ProfileRow, data: PlanData, today: string): Profile {
  const cushion = Number(row.cushion_weeks);
  return {
    slug: "me",
    name: row.display_name,
    initials: initialsOf(row.display_name),
    role: row.occupation,
    city: row.city,
    neighborhood: row.state,
    blurb: "",
    profileType: row.profile_type,
    today,
    runwayTargetWeeks: row.runway_target_weeks,
    rangeConfidence: row.range_confidence,
    birthYear: row.birth_year ?? undefined,
    rules: {
      savingsStyle: row.savings_style,
      predictability: row.predictability,
      clientsPay: row.clients_pay,
      cushionWeeks: cushion === 0.5 || cushion === 2 ? cushion : 1,
      minWeeklySpendCents: Number(row.min_weekly_spend_cents),
      dismissedGaps: row.dismissed_gaps ?? [],
    },
    ...emptyPlanData(),
    ...data,
    transactions: [], // bank transactions arrive with bank sync, not in the saved plan
  };
}

/** The profile row's editable columns (user_id comes from the session; timestamps from the database). */
export function profileColumns(p: Profile): Omit<ProfileRow, "user_id" | "timezone" | "onboarded_at" | "tour_seen_at"> {
  const r = { ...DEFAULT_RULES, ...p.rules };
  return {
    display_name: p.name,
    occupation: p.role,
    city: p.city,
    state: p.neighborhood,
    birth_year: p.birthYear ?? null,
    profile_type: p.profileType,
    runway_target_weeks: p.runwayTargetWeeks,
    range_confidence: p.rangeConfidence,
    savings_style: r.savingsStyle,
    predictability: r.predictability,
    clients_pay: r.clientsPay,
    cushion_weeks: r.cushionWeeks,
    min_weekly_spend_cents: r.minWeeklySpendCents,
    dismissed_gaps: r.dismissedGaps,
  };
}

export function planDataOf(p: Profile): PlanData {
  const { accounts, incomeStreams, recurringBills, plannedEvents, spending, goals, tax, retirement, history, payTaxes } = p;
  return { accounts, incomeStreams, recurringBills, plannedEvents, spending, goals, tax, retirement, history, payTaxes };
}

/**
 * Check a saved plan before the engine sees it: the expected lists exist and every
 * money field (anything named "...Cents") is a whole number of cents.
 */
export function validatePlanData(x: unknown): PlanData {
  if (!x || typeof x !== "object") return emptyPlanData();
  const data = { ...emptyPlanData(), ...(x as Partial<PlanData>) };
  for (const k of ["accounts", "incomeStreams", "recurringBills", "plannedEvents", "goals"] as const) {
    if (!Array.isArray(data[k])) throw new Error(`Saved plan is damaged: ${k} is not a list.`);
  }
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${path}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [key, val] of Object.entries(v)) {
        if (key.endsWith("Cents") && val !== undefined && val !== null && !Number.isInteger(val)) {
          throw new Error(`Saved plan is damaged: ${path}.${key} is not a whole number of cents.`);
        }
        walk(val, `${path}.${key}`);
      }
    }
  };
  walk(data, "plan");
  return data;
}

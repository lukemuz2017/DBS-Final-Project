// Prints the planning helpers for each persona:  npx tsx scripts/peek-plan.ts
import { DEMO_PROFILES } from "../src/lib/demo";
import { refundPlan, retirementPlan, safePay, windfallSplits } from "../src/lib/engine/plan";
import { usd } from "../src/lib/format";

for (const p of DEMO_PROFILES) {
  console.log(`\n== ${p.name} (${p.slug})`);
  const s = safePay(p);
  console.log(`  safe pay: ${s.feasible ? `${usd(s.weeklyCents)}/wk (${usd(s.paycheckCents)} per 2 wks), now ${usd(s.currentWeeklyCents)}/wk` : `none, short ${usd(s.gapCents)}`}`);
  for (const w of windfallSplits(p)) {
    console.log(`  windfall ${w.event.date.base} ${w.event.label} ${usd(w.amountCents)}: ${w.legs.map((l) => `${l.label} ${usd(l.amountCents)}`).join(" | ")}${w.note ? "  (" + w.note + ")" : ""}`);
  }
  const r = retirementPlan(p);
  console.log(`  retirement: ${JSON.stringify({ ...r, sep: usd(r.sepLimitCents), solo: usd(r.soloLimitCents), room: usd(r.roomCents) })}`);
  const rp = refundPlan(p);
  if (rp) console.log(`  refund: ${JSON.stringify(Object.fromEntries(Object.entries(rp).map(([k, v]) => [k, typeof v === "number" && k.endsWith("Cents") ? usd(v) : v])))}`);
}

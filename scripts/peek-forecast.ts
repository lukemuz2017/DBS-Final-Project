// Prints each demo persona's forecast in the terminal. Handy for checking the
// engine without opening the app:  npx tsx scripts/peek-forecast.ts
import { DEMO_PROFILES } from "../src/lib/demo";
import { forecastWithPlan } from "../src/lib/engine/plan";
import { usd } from "../src/lib/format";

for (const p of DEMO_PROFILES) {
  const f = forecastWithPlan(p); // what the dashboard shows: assumes the Payday Plan
  console.log(`\n== ${p.name} (${p.slug}): checking ${usd(f.operatingToday)}, savings ${usd(f.reserveToday)}, runway ${f.runway.weeks.toFixed(1)} wk at ${usd(f.runway.weeklyBurn)}/wk`);
  if (f.tax) console.log(`   estimated tax ${usd(f.tax.amount)} due ${f.tax.dueDate}; set aside ${usd(f.tax.setAside)} + ${usd(f.tax.plannedSetAside)} from upcoming payments`);
  for (const w of f.windows) {
    console.log(`   W${w.index} ${w.start}..${w.end}  low ${usd(w.low)}  base ${usd(w.base)}  high ${usd(w.high)}  ${w.status} (low point ${w.lowMinDate})`);
    if (w.reasons) console.log(`      why: ${w.reasons.sentence}`);
    if (w.fix) console.log(`      fix: ${w.fix.sentence}`);
  }
}

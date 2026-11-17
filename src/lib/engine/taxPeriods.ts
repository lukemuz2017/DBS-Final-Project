// US federal estimated-tax periods (IRS Form 1040-ES). The four "quarters" are
// uneven: Jan–Mar, Apr–May, Jun–Aug, Sep–Dec. Reminder dates only; due dates that
// land on a weekend or holiday move to the next business day, which we don't model.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface TaxPeriod {
  periodStart: string;
  periodEnd: string;
  periodLabel: string; // "Sep 1 – Dec 31, 2026"
  dueDate: string;
}

export function estimatedTaxPeriod(today: string): TaxPeriod {
  const year = Number(today.slice(0, 4));
  const md = today.slice(5);
  const periods: [string, string, string][] = [
    [`${year}-01-01`, `${year}-03-31`, `${year}-04-15`],
    [`${year}-04-01`, `${year}-05-31`, `${year}-06-15`],
    [`${year}-06-01`, `${year}-08-31`, `${year}-09-15`],
    [`${year}-09-01`, `${year}-12-31`, `${year + 1}-01-15`],
  ];
  const [periodStart, periodEnd, dueDate] = periods.find(([s, e]) => md >= s.slice(5) && md <= e.slice(5))!;
  const fmt = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}`;
  return { periodStart, periodEnd, periodLabel: `${fmt(periodStart)} – ${fmt(periodEnd)}, ${year}`, dueDate };
}

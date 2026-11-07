import { monthlyPayment, monthlyRate } from './annuity';
import { insuranceForMonth, type InsuranceSpec } from './insurance';

export interface MonthRow {
  /** 1-based month index. */
  month: number;
  /** Loan payment excluding insurance. */
  payment: number;
  interest: number;
  principal: number;
  insurance: number;
  /** Capital remaining after this month's payment. */
  crd: number;
}

export interface YearRow {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  insurance: number;
  /** Capital remaining at the end of the year. */
  crd: number;
}

export interface LoanSpec {
  principal: number;
  annualRate: number;
  months: number;
  insurance: InsuranceSpec;
}

/** Month-by-month schedule. The last month absorbs rounding so CRD ends at exactly 0. */
export function amortize(loan: LoanSpec): MonthRow[] {
  const { principal, annualRate, months } = loan;
  if (principal <= 0 || months <= 0) return [];
  const r = monthlyRate(annualRate);
  const m = monthlyPayment(principal, annualRate, months);
  const rows: MonthRow[] = [];
  let crd = principal;
  for (let k = 1; k <= months; k++) {
    const interest = crd * r;
    const insurance = insuranceForMonth(loan.insurance, principal, crd);
    const isLast = k === months;
    const princ = isLast ? crd : m - interest;
    const payment = isLast ? interest + crd : m;
    crd = isLast ? 0 : crd - princ;
    rows.push({ month: k, payment, interest, principal: princ, insurance, crd });
  }
  return rows;
}

/** Roll a monthly schedule up into calendar-agnostic loan years (months 1–12 = year 1). */
export function yearly(rows: MonthRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const row of rows) {
    const y = Math.ceil(row.month / 12);
    let yr = years[y - 1];
    if (!yr) {
      yr = { year: y, payment: 0, interest: 0, principal: 0, insurance: 0, crd: 0 };
      years[y - 1] = yr;
    }
    yr.payment += row.payment;
    yr.interest += row.interest;
    yr.principal += row.principal;
    yr.insurance += row.insurance;
    yr.crd = row.crd;
  }
  return years;
}

export interface ScheduleTotals {
  interest: number;
  insurance: number;
  principal: number;
}

export function totals(rows: MonthRow[]): ScheduleTotals {
  return rows.reduce(
    (t, r) => ({ interest: t.interest + r.interest, insurance: t.insurance + r.insurance, principal: t.principal + r.principal }),
    { interest: 0, insurance: 0, principal: 0 },
  );
}

/** Capital remaining after `month` payments (0 → full principal). */
export function crdAfter(rows: MonthRow[], principal: number, month: number): number {
  if (month <= 0) return principal;
  if (month > rows.length) return 0;
  return rows[month - 1]?.crd ?? 0;
}

import { annuityFactor } from './annuity';
import { monthlyIncome, countedExistingPayments } from './debtRatio';
import { buildFinancingPlan, type FinancingPlan } from './financingPlan';
import { insuranceFactor } from './insurance';
import { ptzPaymentInMonth } from './ptz';
import type { LoanInput } from './types';

export interface CapacityArgs {
  income: number;
  maxDebtRatio: number;
  existingCounted: number;
  /** Other new monthly payments counted at peak (e.g. PTZ after deferral). */
  otherNewPayments: number;
  annualRate: number;
  months: number;
  /** Monthly insurance per euro borrowed (month-1 value in CRD mode). */
  insurancePerEuro: number;
}

/**
 * Largest principal whose payment + insurance fits the debt-ratio budget:
 *   A = τ·I − existing − other new payments;  P_max = A / (annuity factor + insurance per €).
 */
export function maxPrincipal(a: CapacityArgs): number {
  const available = a.maxDebtRatio * a.income - a.existingCounted - a.otherNewPayments;
  if (available <= 0 || a.months <= 0) return 0;
  return available / (annuityFactor(a.annualRate, a.months) + a.insurancePerEuro);
}

/** Peak monthly PTZ payment that overlaps the main loan (0 when it starts after the main loan ends). */
export function ptzPeakOverlap(plan: FinancingPlan, mainMonths: number): number {
  if (plan.ptzAmount <= 0) return 0;
  const { totalMonths, deferralMonths } = plan.ptz;
  if (deferralMonths >= mainMonths) return 0;
  return ptzPaymentInMonth(plan.ptzAmount, totalMonths, deferralMonths, deferralMonths + 1);
}

export interface PriceCapacity {
  maxPrincipal: number;
  maxPrice: number;
  plan: FinancingPlan;
}

/**
 * Max purchase price at a given month offset (existing loans that ended by then are dropped).
 * Fees depend on price and PTZ depends on price, so the price is found by bisection:
 * the largest price whose required main loan still fits the capacity.
 */
export function capacityAt(input: LoanInput, atMonth: number): PriceCapacity {
  const income = monthlyIncome(input.household);
  const months = input.terms.years * 12;
  const existingCounted = countedExistingPayments(input.existingLoans, input.rules.ignoreLoansEndingWithinMonths, atMonth);
  const insurancePerEuro = insuranceFactor(input.terms.insurance.borrowers);

  const evaluate = (price: number) => {
    const plan = buildFinancingPlan({ ...input.project, price }, input.household, input.terms);
    const cap = maxPrincipal({
      income,
      maxDebtRatio: input.rules.maxDebtRatio,
      existingCounted,
      otherNewPayments: ptzPeakOverlap(plan, months),
      annualRate: input.terms.annualRate,
      months,
      insurancePerEuro,
    });
    return { plan, cap, fits: plan.mainLoan <= cap };
  };

  let lo = 0;
  let hi = 5_000_000;
  let best = evaluate(0);
  if (!best.fits) return { maxPrincipal: best.cap, maxPrice: 0, plan: best.plan };
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = evaluate(mid);
    if (r.fits) {
      lo = mid;
      best = r;
    } else hi = mid;
  }
  return { maxPrincipal: best.cap, maxPrice: lo, plan: best.plan };
}

export interface CapacityStep {
  /** Months from today. */
  atMonth: number;
  /** Labels of loans no longer counted from this point. */
  endedLoans: string[];
  maxPrincipal: number;
  maxPrice: number;
}

/** Capacity today, then once each existing loan stops being counted. */
export function capacityTimeline(input: LoanInput): CapacityStep[] {
  const ignore = Math.max(0, input.rules.ignoreLoansEndingWithinMonths);
  const today = capacityAt(input, 0);
  const steps: CapacityStep[] = [{ atMonth: 0, endedLoans: [], maxPrincipal: today.maxPrincipal, maxPrice: today.maxPrice }];
  // A loan stops counting `ignore` months before it ends.
  const dropMonths = [...new Set(input.existingLoans.map((l) => Math.max(0, l.monthsRemaining - ignore)))]
    .filter((m) => m > 0)
    .sort((a, b) => a - b);
  for (const m of dropMonths) {
    const c = capacityAt(input, m);
    steps.push({
      atMonth: m,
      endedLoans: input.existingLoans.filter((l) => Math.max(0, l.monthsRemaining - ignore) === m).map((l) => l.label),
      maxPrincipal: c.maxPrincipal,
      maxPrice: c.maxPrice,
    });
  }
  return steps;
}

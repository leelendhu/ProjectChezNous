import { hcsf } from '../config/defaults';
import { isNew } from '../config/types';
import { amortize, totals, yearly, type MonthRow, type YearRow } from './amortization';
import { capacityTimeline, ptzPeakOverlap, type CapacityStep } from './capacity';
import { activeExistingPayments, countedExistingPayments, debtRatio, monthlyIncome } from './debtRatio';
import { buildFinancingPlan, type FinancingPlan } from './financingPlan';
import { ptzPaymentInMonth } from './ptz';
import { taeg, usuryRate } from './taeg';
import type { LoanInput, Warning } from './types';

export interface DebtTimelinePoint {
  /** Months from today. */
  month: number;
  existing: number;
  mortgage: number;
  ptz: number;
}

export interface CostOfCredit {
  interest: number;
  insurance: number;
  /** Guarantee paid at signing. */
  guarantee: number;
  /** Part of the guarantee given back at the end (caution). */
  guaranteeRefund: number;
  fees: number;
  /** interest + insurance + guarantee − refund + fees. */
  total: number;
}

export interface LoanAnalysis {
  income: number;
  plan: FinancingPlan;
  months: number;
  schedule: MonthRow[];
  years: YearRow[];
  /** First-month loan payment excluding insurance. */
  payment: number;
  /** First-month insurance. */
  insurance: number;
  /** PTZ monthly payment once its deferral ends (0 if none). */
  ptzMonthly: number;
  /** Highest combined monthly payment of the new loans (main + insurance + PTZ). */
  peakNewPayment: number;
  existingCounted: number;
  existingAll: number;
  debtRatio: number;
  resteAVivre: number;
  cost: CostOfCredit;
  taeg: number;
  usury: number;
  capacity: CapacityStep[];
  debtTimeline: DebtTimelinePoint[];
  warnings: Warning[];
}

export function analyzeLoan(input: LoanInput, timelineMonths = 36): LoanAnalysis {
  const { household, project, terms, rules, existingLoans } = input;
  const income = monthlyIncome(household);
  const months = Math.round(terms.years * 12);
  const plan = buildFinancingPlan(project, household, terms);
  const schedule = amortize({ principal: plan.mainLoan, annualRate: terms.annualRate, months, insurance: terms.insurance });
  const sums = totals(schedule);
  const first = schedule[0];
  const payment = first?.payment ?? 0;
  const insurance = first?.insurance ?? 0;
  const ptzMonthly = plan.ptzAmount > 0 ? plan.ptzAmount / (plan.ptz.totalMonths - plan.ptz.deferralMonths) : 0;

  let peakNewPayment = 0;
  const horizon = Math.max(months, plan.ptz.totalMonths);
  for (let k = 1; k <= horizon; k++) {
    const row = schedule[k - 1];
    const p = (row ? row.payment + row.insurance : 0) + ptzPaymentInMonth(plan.ptzAmount, plan.ptz.totalMonths, plan.ptz.deferralMonths, k);
    if (p > peakNewPayment) peakNewPayment = p;
  }
  // The debt ratio uses the peak while both loans run (conservative; banks often smooth this, "lissage").
  const counted = payment + insurance + ptzPeakOverlap(plan, months);
  const existingCounted = countedExistingPayments(existingLoans, rules.ignoreLoansEndingWithinMonths, 0);
  const existingAll = activeExistingPayments(existingLoans, 0);
  const ratio = debtRatio(counted + existingCounted, income);
  const resteAVivre = income - peakNewPayment - existingAll;

  const fees = terms.bankFees + terms.brokerFees;
  const cost: CostOfCredit = {
    interest: sums.interest,
    insurance: sums.insurance,
    guarantee: plan.guarantee.upfront,
    guaranteeRefund: plan.guarantee.refund,
    fees,
    total: sums.interest + sums.insurance + plan.guarantee.upfront - plan.guarantee.refund + fees,
  };
  const loanTaeg = taeg(
    plan.mainLoan - fees - plan.guarantee.upfront,
    schedule.map((r) => r.payment + r.insurance),
  );
  const usury = usuryRate(months);

  const debtTimeline: DebtTimelinePoint[] = [];
  for (let m = 0; m < timelineMonths; m++) {
    const k = m - project.monthsUntilPurchase + 1; // mortgage month index
    const row = k >= 1 ? schedule[k - 1] : undefined;
    debtTimeline.push({
      month: m,
      existing: activeExistingPayments(existingLoans, m),
      mortgage: row ? row.payment + row.insurance : 0,
      ptz: k >= 1 ? ptzPaymentInMonth(plan.ptzAmount, plan.ptz.totalMonths, plan.ptz.deferralMonths, k) : 0,
    });
  }

  const analysis: LoanAnalysis = {
    income,
    plan,
    months,
    schedule,
    years: yearly(schedule),
    payment,
    insurance,
    ptzMonthly,
    peakNewPayment,
    existingCounted,
    existingAll,
    debtRatio: ratio,
    resteAVivre,
    cost,
    taeg: loanTaeg,
    usury,
    capacity: capacityTimeline(input),
    debtTimeline,
    warnings: [],
  };
  analysis.warnings = loanWarnings(input, analysis);
  return analysis;
}

/** Plain-language flags. Codes map to i18n strings; severity is never alarming. */
export function loanWarnings(input: LoanInput, a: LoanAnalysis): Warning[] {
  const w: Warning[] = [];
  const { terms, project, rules } = input;
  if (a.debtRatio > rules.maxDebtRatio) w.push({ code: 'dtiAbove', severity: 'caution', params: { ratio: a.debtRatio, max: rules.maxDebtRatio } });
  if (rules.maxDebtRatio > hcsf.maxDebtRatio.value) w.push({ code: 'dtiThresholdEdited', severity: 'info', params: { max: rules.maxDebtRatio } });
  if (terms.years > hcsf.maxYearsWithDeferral.value) w.push({ code: 'durationAbove27', severity: 'caution' });
  else if (terms.years > hcsf.maxYears.value) {
    const worksShare = project.price + project.works > 0 ? project.works / (project.price + project.works) : 0;
    const allowed = isNew(project.propertyType) || worksShare > 0.1;
    w.push({ code: allowed ? 'duration27Deferral' : 'duration27NotEligible', severity: allowed ? 'info' : 'caution' });
  }
  if (a.taeg > a.usury) w.push({ code: 'usuryExceeded', severity: 'caution', params: { taeg: a.taeg, usury: a.usury } });
  const upfrontCosts = a.plan.notary.total + a.plan.guarantee.upfront + a.plan.bankFees + a.plan.brokerFees;
  if (project.apport < upfrontCosts && a.plan.mainLoan > 0) w.push({ code: 'apportBelowFees', severity: 'info', params: { fees: upfrontCosts } });
  if (terms.guaranteeType === 'ippd' && isNew(project.propertyType)) w.push({ code: 'ippdNotForNew', severity: 'info' });
  if (a.plan.mainLoan === 0) w.push({ code: 'noLoanNeeded', severity: 'info' });
  if (terms.includePtz && !a.plan.ptz.eligible) {
    for (const reason of a.plan.ptz.reasons) w.push({ code: `ptz.${reason}`, severity: 'info' });
  }
  if (a.plan.ptzAmount > 0 && a.plan.ptzAmount < a.plan.ptz.amount) w.push({ code: 'ptzCapped', severity: 'info' });
  if (a.plan.ptzAmount > 0 && ptzPeakOverlap(a.plan, a.months) > 0) w.push({ code: 'ptzPeak', severity: 'info' });
  if (a.resteAVivre < 0) w.push({ code: 'resteNegative', severity: 'caution' });
  return w;
}

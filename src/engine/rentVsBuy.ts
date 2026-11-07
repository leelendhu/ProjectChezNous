import type { GainsTaxMode } from '../config/types';
import { amortize, type MonthRow } from './amortization';
import { buildFinancingPlan, type FinancingPlan } from './financingPlan';
import type { InsuranceSpec } from './insurance';
import { afterTax } from './investmentTax';
import { ptzCrdAfter, ptzPaymentInMonth } from './ptz';
import type { ExistingLoan, LoanInput } from './types';
import { activeExistingPayments } from './debtRatio';

/** Assumptions specific to the rent-vs-buy comparison. Rates are annual fractions. */
export interface RentVsBuyAssumptions {
  horizonYears: number;
  rentMonthly: number;
  rentGrowth: number;
  appreciation: number;
  investmentReturn: number;
  gainsTax: GainsTaxMode;
  inflation: number;
  taxeFonciereYear: number;
  coproMonthly: number;
  /** Share of property value per year. */
  maintenanceRate: number;
  ownerInsuranceYear: number;
  renterInsuranceYear: number;
  sellingCostRate: number;
  earlyRepaymentPenalty: boolean;
  /** Share of the works budget that adds to the property's value. */
  worksValueShare: number;
}

/** Fully explicit inputs for the month-by-month simulation (no defaults, no fee logic). */
export interface SimulationInput extends RentVsBuyAssumptions {
  /** Cash the buyer spends at t0; the renter invests the same amount instead. */
  upfrontCash: number;
  propertyValue0: number;
  loan: { principal: number; annualRate: number; months: number; insurance: InsuranceSpec };
  ptz: { amount: number; totalMonths: number; deferralMonths: number };
  /** One-off purchase costs (notary, guarantee net of refund, fees) for the unrecoverable view. */
  entryCosts: number;
  guaranteeRefund: number;
  earlyReleaseCost: number;
  existingLoans: ExistingLoan[];
  /** Simulated length in years (≥ horizon) so breakeven can be found beyond the horizon. */
  simulateYears: number;
}

export interface MonthPoint {
  month: number;
  propertyValue: number;
  crd: number;
  ptzCrd: number;
  buyCost: number;
  rentCost: number;
  renterPortfolio: number;
  ownerPortfolio: number;
  netWorthBuy: number;
  netWorthRent: number;
  /** netWorthBuy − netWorthRent. */
  gap: number;
  /** Divide by this to show today's euros. */
  deflator: number;
}

export interface UnrecoverableYear {
  year: number;
  rent: { rent: number; insurance: number; total: number };
  buy: {
    interest: number;
    insurance: number;
    taxeFonciere: number;
    maintenance: number;
    copro: number;
    homeInsurance: number;
    opportunityCost: number;
    entryExit: number;
    total: number;
  };
  /** Price growth that year; offsets the owner's costs. */
  appreciation: number;
}

export interface CashflowYear {
  year: number;
  buyHousing: number;
  rentHousing: number;
  /** Existing loans, identical in both paths. */
  existing: number;
}

export interface Breakeven {
  /** Years until buying first overtakes renting; null if it never does within the simulation. */
  years: number | null;
  buyAheadFromStart: boolean;
  /** Renting pulls ahead again after the breakeven. */
  crossesBack: boolean;
}

export interface SimulationResult {
  months: MonthPoint[];
  /** Points at month 0, 12, 24… up to the horizon. */
  yearly: MonthPoint[];
  atHorizon: MonthPoint;
  breakeven: Breakeven;
  unrecoverable: UnrecoverableYear[];
  cashflow: CashflowYear[];
}

/**
 * Month-by-month comparison. Each month:
 *   buy cost B = loan payment + insurance + PTZ + taxe foncière/12 + copro + maintenance + owner insurance
 *   rent cost R = rent + renter insurance
 * The cheaper path invests the difference at the investment return. Net worth if sold now:
 *   buy  = value × (1 − selling costs) − CRD − PTZ CRD − early-repayment costs + guarantee refund + owner portfolio
 *   rent = renter portfolio (after tax on gains)
 * Existing loans are paid in both paths, so they are left out of the difference.
 */
export function simulate(input: SimulationInput): SimulationResult {
  const totalMonths = Math.max(1, Math.round(input.simulateYears * 12));
  const horizonMonths = Math.min(totalMonths, Math.max(12, Math.round(input.horizonYears * 12)));
  const schedule: MonthRow[] = amortize(input.loan);
  const j = Math.pow(1 + input.investmentReturn, 1 / 12) - 1;
  const r = input.loan.annualRate / 12;

  let renter = input.upfrontCash;
  let renterContrib = input.upfrontCash;
  let owner = 0;
  let ownerContrib = 0;

  const value = (m: number) => input.propertyValue0 * Math.pow(1 + input.appreciation, m / 12);
  const crdAt = (m: number) => (m <= 0 ? input.loan.principal : m > schedule.length ? 0 : schedule[m - 1]!.crd);

  const pointAt = (m: number, buyCost: number, rentCost: number): MonthPoint => {
    const v = value(m);
    const crd = crdAt(m);
    const ptzCrd = ptzCrdAfter(input.ptz.amount, input.ptz.totalMonths, input.ptz.deferralMonths, m);
    const loanOpen = crd > 0;
    const ira = input.earlyRepaymentPenalty && loanOpen ? Math.min(6 * crd * r, 0.03 * crd) : 0;
    const release = loanOpen ? input.earlyReleaseCost : 0;
    const years = m / 12;
    const nwBuy =
      v * (1 - input.sellingCostRate) - crd - ptzCrd - ira - release + input.guaranteeRefund +
      afterTax(owner, ownerContrib, input.gainsTax, years);
    const nwRent = afterTax(renter, renterContrib, input.gainsTax, years);
    return {
      month: m,
      propertyValue: v,
      crd,
      ptzCrd,
      buyCost,
      rentCost,
      renterPortfolio: renter,
      ownerPortfolio: owner,
      netWorthBuy: nwBuy,
      netWorthRent: nwRent,
      gap: nwBuy - nwRent,
      deflator: Math.pow(1 + input.inflation, m / 12),
    };
  };

  const months: MonthPoint[] = [pointAt(0, 0, 0)];
  const unrecoverable: UnrecoverableYear[] = [];
  const cashflow: CashflowYear[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    const yearIndex = Math.floor((m - 1) / 12); // 0-based year
    const index = Math.pow(1 + input.inflation, yearIndex);
    const row = schedule[m - 1];
    const vStart = value(m - 1);

    const loanPay = row ? row.payment : 0;
    const loanIns = row ? row.insurance : 0;
    const ptzPay = ptzPaymentInMonth(input.ptz.amount, input.ptz.totalMonths, input.ptz.deferralMonths, m);
    const tf = (input.taxeFonciereYear * index) / 12;
    const copro = input.coproMonthly * index;
    const maint = (input.maintenanceRate * vStart) / 12;
    const homeIns = (input.ownerInsuranceYear * index) / 12;
    const buyCost = loanPay + loanIns + ptzPay + tf + copro + maint + homeIns;

    const rent = input.rentMonthly * Math.pow(1 + input.rentGrowth, yearIndex);
    const rentIns = (input.renterInsuranceYear * index) / 12;
    const rentCost = rent + rentIns;

    renter *= 1 + j;
    owner *= 1 + j;
    const diff = buyCost - rentCost;
    if (diff > 0) {
      renter += diff;
      renterContrib += diff;
    } else {
      owner -= diff;
      ownerContrib -= diff;
    }

    // Unrecoverable costs and cash flow, per year, up to the horizon.
    if (m <= horizonMonths) {
      let u = unrecoverable[yearIndex];
      let c = cashflow[yearIndex];
      if (!u || !c) {
        u = {
          year: yearIndex + 1,
          rent: { rent: 0, insurance: 0, total: 0 },
          buy: { interest: 0, insurance: 0, taxeFonciere: 0, maintenance: 0, copro: 0, homeInsurance: 0, opportunityCost: 0, entryExit: 0, total: 0 },
          appreciation: 0,
        };
        c = { year: yearIndex + 1, buyHousing: 0, rentHousing: 0, existing: 0 };
        unrecoverable[yearIndex] = u;
        cashflow[yearIndex] = c;
      }
      const equityStart = vStart - crdAt(m - 1) - ptzCrdAfter(input.ptz.amount, input.ptz.totalMonths, input.ptz.deferralMonths, m - 1);
      u.rent.rent += rent;
      u.rent.insurance += rentIns;
      u.buy.interest += row ? row.interest : 0;
      u.buy.insurance += loanIns;
      u.buy.taxeFonciere += tf;
      u.buy.maintenance += maint;
      u.buy.copro += copro;
      u.buy.homeInsurance += homeIns;
      u.buy.opportunityCost += Math.max(0, equityStart) * j;
      u.appreciation += value(m) - vStart;
      c.buyHousing += buyCost;
      c.rentHousing += rentCost;
      c.existing += activeExistingPayments(input.existingLoans, m - 1);
    }

    months.push(pointAt(m, buyCost, rentCost));
  }

  // Spread one-off entry and exit costs evenly over the years held.
  const horizonYears = horizonMonths / 12;
  const atHorizon = months[horizonMonths]!;
  const exitCosts = atHorizon.propertyValue * input.sellingCostRate +
    (atHorizon.crd > 0 && input.earlyRepaymentPenalty ? Math.min(6 * atHorizon.crd * r, 0.03 * atHorizon.crd) : 0) +
    (atHorizon.crd > 0 ? input.earlyReleaseCost : 0) -
    (input.guaranteeRefund);
  const perYear = (input.entryCosts + exitCosts) / horizonYears;
  for (const u of unrecoverable) {
    const share = Math.min(1, horizonYears - (u.year - 1));
    u.buy.entryExit = perYear * share;
    u.rent.total = u.rent.rent + u.rent.insurance;
    const b = u.buy;
    b.total = b.interest + b.insurance + b.taxeFonciere + b.maintenance + b.copro + b.homeInsurance + b.opportunityCost + b.entryExit;
  }

  const yearly: MonthPoint[] = [];
  for (let m = 0; m <= horizonMonths; m += 12) yearly.push(months[m]!);
  if (horizonMonths % 12 !== 0) yearly.push(atHorizon);

  return { months, yearly, atHorizon, breakeven: findBreakeven(months), unrecoverable, cashflow };
}

/** First month where the gap turns from negative to ≥ 0, linearly interpolated, in years. */
export function findBreakeven(points: { month: number; gap: number }[]): Breakeven {
  const first = points[0];
  if (!first) return { years: null, buyAheadFromStart: false, crossesBack: false };
  if (first.gap >= 0) {
    const later = points.some((p) => p.gap < 0);
    return { years: 0, buyAheadFromStart: true, crossesBack: later };
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.gap < 0 && b.gap >= 0) {
      const t = a.gap / (a.gap - b.gap);
      const month = a.month + t * (b.month - a.month);
      const crossesBack = points.slice(i + 1).some((p) => p.gap < 0);
      return { years: month / 12, buyAheadFromStart: false, crossesBack };
    }
  }
  return { years: null, buyAheadFromStart: false, crossesBack: false };
}

/** Scenario = the loan from Tab 1 (possibly overridden) + rent-vs-buy assumptions. */
export interface Scenario {
  loan: LoanInput;
  rvb: RentVsBuyAssumptions;
}

/** Longest period simulated, so breakeven can be reported beyond the chosen horizon. */
export const MAX_SIMULATION_YEARS = 30;

export function simulationInputFor(s: Scenario, plan: FinancingPlan = buildFinancingPlan(s.loan.project, s.loan.household, s.loan.terms)): SimulationInput {
  const { project, terms } = s.loan;
  const upfrontCash = Math.max(0, project.apport - plan.surplusApport);
  return {
    ...s.rvb,
    upfrontCash,
    propertyValue0: project.price + project.works * s.rvb.worksValueShare,
    loan: { principal: plan.mainLoan, annualRate: terms.annualRate, months: Math.round(terms.years * 12), insurance: terms.insurance },
    ptz: { amount: plan.ptzAmount, totalMonths: plan.ptz.totalMonths, deferralMonths: plan.ptz.deferralMonths },
    entryCosts: plan.notary.total + plan.guarantee.upfront + plan.bankFees + plan.brokerFees,
    guaranteeRefund: plan.guarantee.refund,
    earlyReleaseCost: plan.guarantee.earlyReleaseCost,
    existingLoans: s.loan.existingLoans,
    simulateYears: Math.max(MAX_SIMULATION_YEARS, s.rvb.horizonYears),
  };
}

export function runScenario(s: Scenario): SimulationResult {
  return simulate(simulationInputFor(s));
}

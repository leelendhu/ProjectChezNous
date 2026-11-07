import { investment, market, rates, rentVsBuy } from '../config/defaults';
import { isHouse, isNew, type GainsTaxMode, type InvestmentPreset } from '../config/types';
import { rateForDuration } from '../engine/annuity';
import type { RentVsBuyAssumptions, Scenario } from '../engine/rentVsBuy';
import type { LoanInput } from '../engine/types';
import type { ScenarioState } from './schema';

// Turn stored inputs (with "auto" nulls) into concrete engine inputs.

export const autoPricePerM2 = (s: ScenarioState): number => market.pricePerM2.value[s.project.propertyType];

export const pricePerM2 = (s: ScenarioState): number => s.project.pricePerM2 ?? autoPricePerM2(s);

export function resolvePrice(s: ScenarioState): number {
  return s.project.priceMode === 'surface' ? Math.round(s.project.surface * pricePerM2(s)) : s.project.price;
}

export const autoRate = (years: number): number => rateForDuration(years, rates.byDuration.value);

export const resolveRate = (s: ScenarioState): number => s.loan.customRate ?? autoRate(s.loan.years);

export const autoRentPerM2 = (s: ScenarioState): number =>
  isHouse(s.project.propertyType) ? market.rentPerM2.value.house : market.rentPerM2.value.apartment;

export const rentPerM2 = (s: ScenarioState): number => s.rvb.rentPerM2 ?? autoRentPerM2(s);

export function resolveRent(s: ScenarioState): number {
  return s.rvb.rentMode === 'surface' ? Math.round(s.project.surface * rentPerM2(s)) : s.rvb.rentMonthly;
}

export const autoTaxeFonciere = (s: ScenarioState): number => Math.round(s.project.surface * market.taxeFoncierePerM2.value);
export const autoCopro = (s: ScenarioState): number =>
  isHouse(s.project.propertyType) ? 0 : Math.round((s.project.surface * market.coproPerM2Year.value) / 12);
export const autoMaintenance = (s: ScenarioState): number =>
  isNew(s.project.propertyType) ? rentVsBuy.maintenance.value.neuf : rentVsBuy.maintenance.value.ancien;

export const presetReturn: Record<Exclude<InvestmentPreset, 'custom'>, number> = {
  livretA: investment.livretA.value,
  fondsEuros: investment.fondsEuros.value,
  etfPea: investment.etfPea.value,
};

export const presetTax: Record<InvestmentPreset, GainsTaxMode> = {
  livretA: 'none',
  fondsEuros: 'assuranceVie',
  etfPea: 'pea',
  custom: 'pfu',
};

export const resolveReturn = (s: ScenarioState): number =>
  s.rvb.investmentPreset === 'custom' ? s.rvb.customReturn : presetReturn[s.rvb.investmentPreset];

export const resolveTaxMode = (s: ScenarioState): GainsTaxMode =>
  s.rvb.gainsTaxMode === 'auto' ? presetTax[s.rvb.investmentPreset] : s.rvb.gainsTaxMode;

/** The loan as designed in Tab 1. */
export function toLoanInput(s: ScenarioState): LoanInput {
  return {
    household: {
      borrowers: s.household.borrowers,
      otherMonthlyIncome: s.household.otherMonthlyIncome,
      householdSize: s.household.householdSize,
      rfr: s.household.rfr,
      firstTimeBuyer: s.household.firstTimeBuyer,
    },
    existingLoans: s.existingLoans.map(({ label, monthlyPayment, monthsRemaining }) => ({ label, monthlyPayment, monthsRemaining })),
    project: {
      propertyType: s.project.propertyType,
      zone: s.project.zone,
      price: resolvePrice(s),
      works: s.project.works,
      apport: s.project.apport,
      monthsUntilPurchase: s.project.monthsUntilPurchase,
    },
    terms: {
      years: s.loan.years,
      annualRate: resolveRate(s),
      insurance: { mode: s.loan.insuranceMode, borrowers: s.loan.insurance.slice(0, s.household.borrowers.length) },
      guaranteeType: s.loan.guaranteeType,
      bankFees: s.loan.bankFees,
      brokerFees: s.loan.brokerFees,
      includePtz: s.loan.includePtz,
    },
    rules: { maxDebtRatio: s.rules.maxDebtRatio, ignoreLoansEndingWithinMonths: s.rules.ignoreLoansEndingWithinMonths },
  };
}

/** The Tab 1 loan with Tab 2 what-if overrides applied. */
export function toLoanInputWithOverrides(s: ScenarioState): LoanInput {
  const base = toLoanInput(s);
  const o = s.overrides;
  return {
    ...base,
    project: { ...base.project, price: o.price ?? base.project.price, apport: o.apport ?? base.project.apport },
    terms: {
      ...base.terms,
      years: o.years ?? base.terms.years,
      annualRate: o.annualRate ?? base.terms.annualRate,
      includePtz: o.includePtz ?? base.terms.includePtz,
      insurance:
        o.insuranceRate === undefined
          ? base.terms.insurance
          : { ...base.terms.insurance, borrowers: base.terms.insurance.borrowers.map((b) => ({ ...b, rate: o.insuranceRate! })) },
    },
  };
}

export function toRvbAssumptions(s: ScenarioState): RentVsBuyAssumptions {
  const r = s.rvb;
  return {
    horizonYears: r.horizonYears,
    rentMonthly: resolveRent(s),
    rentGrowth: r.rentGrowth,
    appreciation: r.appreciation,
    investmentReturn: resolveReturn(s),
    gainsTax: resolveTaxMode(s),
    inflation: r.inflation,
    taxeFonciereYear: r.taxeFonciereYear ?? autoTaxeFonciere(s),
    coproMonthly: r.coproMonthly ?? autoCopro(s),
    maintenanceRate: r.maintenanceRate ?? autoMaintenance(s),
    ownerInsuranceYear: r.ownerInsuranceYear,
    renterInsuranceYear: r.renterInsuranceYear,
    sellingCostRate: r.sellingCostRate,
    earlyRepaymentPenalty: r.earlyRepaymentPenalty,
    worksValueShare: r.worksValueShare,
  };
}

export function toScenario(s: ScenarioState): Scenario {
  return { loan: toLoanInputWithOverrides(s), rvb: toRvbAssumptions(s) };
}

/** Value Tab 2 shows for an overridable field, and whether it differs from Tab 1. */
export function overrideView(s: ScenarioState) {
  const base = toLoanInput(s);
  const inherited = {
    price: base.project.price,
    apport: base.project.apport,
    years: base.terms.years,
    annualRate: base.terms.annualRate,
    insuranceRate: base.terms.insurance.borrowers[0]?.rate ?? 0,
    includePtz: base.terms.includePtz,
  };
  return { inherited, overridden: s.overrides };
}

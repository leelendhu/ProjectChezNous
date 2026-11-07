import { z } from 'zod';
import { fees, hcsf, insurance, ptz, rentVsBuy } from '../config/defaults';

// Inputs shared by both tabs. `null` on an optional figure means "auto":
// derived from defaults, property type and surface, and shown with an "auto" badge.

export const PROPERTY_TYPES = ['ancienApartment', 'neufApartment', 'neufHouse', 'ancienHouse'] as const;
export const ZONES = ['Abis', 'A', 'B1', 'B2', 'C'] as const;
export const GUARANTEES = ['caution', 'hypotheque', 'ippd'] as const;
export const PRESETS = ['livretA', 'fondsEuros', 'etfPea', 'custom'] as const;
export const TAX_MODES = ['auto', 'none', 'assuranceVie', 'pea', 'pfu'] as const;
export const OVERRIDE_KEYS = ['price', 'apport', 'years', 'annualRate', 'insuranceRate', 'includePtz'] as const;

export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export const SCHEMA_VERSION = 1;

export const defaultState = {
  v: SCHEMA_VERSION,
  household: {
    borrowers: [
      { netMonthly: 2500, monthsPerYear: 12, age: 32 },
      { netMonthly: 2500, monthsPerYear: 12, age: 32 },
    ],
    otherMonthlyIncome: 0,
    householdSize: 2,
    rfr: null as number | null,
    firstTimeBuyer: true,
  },
  existingLoans: [] as { id: string; label: string; monthlyPayment: number; monthsRemaining: number }[],
  project: {
    propertyType: 'ancienApartment' as (typeof PROPERTY_TYPES)[number],
    zone: ptz.toulouseZone.value as (typeof ZONES)[number],
    priceMode: 'surface' as 'surface' | 'price',
    price: 200000,
    surface: 63,
    pricePerM2: null as number | null,
    works: 0,
    apport: 20000,
    monthsUntilPurchase: 3,
  },
  loan: {
    years: 20,
    customRate: null as number | null,
    insuranceMode: 'initial' as 'initial' | 'crd',
    insurance: [
      { rate: insurance.ratePerBorrower.value, quotite: 0.5 },
      { rate: insurance.ratePerBorrower.value, quotite: 0.5 },
    ],
    guaranteeType: 'caution' as (typeof GUARANTEES)[number],
    bankFees: fees.bankFileFees.value,
    brokerFees: fees.brokerFees.value,
    includePtz: true,
  },
  rules: {
    maxDebtRatio: hcsf.maxDebtRatio.value,
    ignoreLoansEndingWithinMonths: 0,
  },
  rvb: {
    horizonYears: rentVsBuy.horizonYears.value,
    rentMode: 'surface' as 'surface' | 'rent',
    rentMonthly: 950,
    rentPerM2: null as number | null,
    rentGrowth: rentVsBuy.rentGrowth.value,
    appreciation: rentVsBuy.appreciation.value,
    investmentPreset: 'etfPea' as (typeof PRESETS)[number],
    customReturn: 0.04,
    gainsTaxMode: 'auto' as (typeof TAX_MODES)[number],
    inflation: rentVsBuy.inflation.value,
    realTerms: false,
    taxeFonciereYear: null as number | null,
    coproMonthly: null as number | null,
    maintenanceRate: null as number | null,
    ownerInsuranceYear: rentVsBuy.ownerHomeInsurance.value,
    renterInsuranceYear: rentVsBuy.renterHomeInsurance.value,
    sellingCostRate: rentVsBuy.sellingCosts.value,
    earlyRepaymentPenalty: true,
    worksValueShare: rentVsBuy.worksValueShare.value,
  },
  /** Tab 2 what-if values that replace the Tab 1 loan design. */
  overrides: {} as Partial<{ price: number; apport: number; years: number; annualRate: number; insuranceRate: number; includePtz: boolean }>,
};

export type ScenarioState = typeof defaultState;

// --- Validation for data read back from localStorage or a shared URL. -------------
// Each field falls back to its default on its own, so one bad value never wipes a scenario.

const num = (min: number, max: number, fallback: number) => z.number().finite().min(min).max(max).catch(fallback);
const nullableNum = (min: number, max: number) => z.number().finite().min(min).max(max).nullable().catch(null);
const bool = (fallback: boolean) => z.boolean().catch(fallback);
const oneOf = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) => z.enum(values).catch(fallback);

const d = defaultState;
const MONEY = 1e8;

export const stateSchema = z.object({
  v: z.literal(SCHEMA_VERSION).catch(SCHEMA_VERSION),
  household: z
    .object({
      borrowers: z
        .array(z.object({ netMonthly: num(0, 1e6, 0), monthsPerYear: num(12, 16, 12), age: num(18, 90, 32) }))
        .min(1)
        .max(2)
        .catch(d.household.borrowers),
      otherMonthlyIncome: num(0, 1e6, 0),
      householdSize: num(1, 12, d.household.householdSize),
      rfr: nullableNum(0, 1e7),
      firstTimeBuyer: bool(d.household.firstTimeBuyer),
    })
    .catch(d.household),
  existingLoans: z
    .array(
      z.object({
        id: z.string().max(40),
        label: z.string().max(60).catch(''),
        monthlyPayment: num(0, 1e6, 0),
        monthsRemaining: num(0, 600, 0),
      }),
    )
    .max(10)
    .catch([]),
  project: z
    .object({
      propertyType: oneOf(PROPERTY_TYPES, d.project.propertyType),
      zone: oneOf(ZONES, d.project.zone),
      priceMode: oneOf(['surface', 'price'] as const, d.project.priceMode),
      price: num(0, MONEY, d.project.price),
      surface: num(1, 2000, d.project.surface),
      pricePerM2: nullableNum(0, 1e6),
      works: num(0, MONEY, 0),
      apport: num(0, MONEY, d.project.apport),
      monthsUntilPurchase: num(0, 120, d.project.monthsUntilPurchase),
    })
    .catch(d.project),
  loan: z
    .object({
      years: num(5, 30, d.loan.years),
      customRate: nullableNum(0, 0.2),
      insuranceMode: oneOf(['initial', 'crd'] as const, d.loan.insuranceMode),
      insurance: z
        .array(z.object({ rate: num(0, 0.05, insurance.ratePerBorrower.value), quotite: num(0, 1, 0.5) }))
        .min(1)
        .max(2)
        .catch(d.loan.insurance),
      guaranteeType: oneOf(GUARANTEES, d.loan.guaranteeType),
      bankFees: num(0, 1e6, d.loan.bankFees),
      brokerFees: num(0, 1e6, d.loan.brokerFees),
      includePtz: bool(d.loan.includePtz),
    })
    .catch(d.loan),
  rules: z
    .object({
      maxDebtRatio: num(0.05, 0.8, d.rules.maxDebtRatio),
      ignoreLoansEndingWithinMonths: num(0, 60, 0),
    })
    .catch(d.rules),
  rvb: z
    .object({
      horizonYears: num(1, 30, d.rvb.horizonYears),
      rentMode: oneOf(['surface', 'rent'] as const, d.rvb.rentMode),
      rentMonthly: num(0, 1e5, d.rvb.rentMonthly),
      rentPerM2: nullableNum(0, 1000),
      rentGrowth: num(-0.1, 0.2, d.rvb.rentGrowth),
      appreciation: num(-0.2, 0.2, d.rvb.appreciation),
      investmentPreset: oneOf(PRESETS, d.rvb.investmentPreset),
      customReturn: num(-0.2, 0.3, d.rvb.customReturn),
      gainsTaxMode: oneOf(TAX_MODES, d.rvb.gainsTaxMode),
      inflation: num(-0.05, 0.2, d.rvb.inflation),
      realTerms: bool(false),
      taxeFonciereYear: nullableNum(0, 1e5),
      coproMonthly: nullableNum(0, 1e4),
      maintenanceRate: nullableNum(0, 0.1),
      ownerInsuranceYear: num(0, 1e4, d.rvb.ownerInsuranceYear),
      renterInsuranceYear: num(0, 1e4, d.rvb.renterInsuranceYear),
      sellingCostRate: num(0, 0.2, d.rvb.sellingCostRate),
      earlyRepaymentPenalty: bool(true),
      worksValueShare: num(0, 1.5, d.rvb.worksValueShare),
    })
    .catch(d.rvb),
  overrides: z
    .object({
      price: num(0, MONEY, d.project.price).optional(),
      apport: num(0, MONEY, d.project.apport).optional(),
      years: num(5, 30, d.loan.years).optional(),
      annualRate: num(0, 0.2, 0.0376).optional(),
      insuranceRate: num(0, 0.05, insurance.ratePerBorrower.value).optional(),
      includePtz: z.boolean().optional(),
    })
    .catch({}),
});

/** Parse untrusted data into a valid state; anything missing or invalid takes its default. */
export function parseState(raw: unknown): ScenarioState {
  const merged = deepMerge(structuredClone(defaultState), raw);
  return stateSchema.parse(merged) as ScenarioState;
}

/** Overlay `patch` on `base`: objects merge key by key, arrays and scalars replace. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = k in base ? deepMerge((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

/** Only the parts of `value` that differ from `base` (arrays compared whole). */
export function deepDiff(base: unknown, value: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const d = deepDiff(base[k], v);
      if (d !== undefined) out[k] = d;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return JSON.stringify(base) === JSON.stringify(value) ? undefined : value;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

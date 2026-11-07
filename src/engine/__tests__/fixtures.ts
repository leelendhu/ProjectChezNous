import type { LoanInput } from '../types';

/** A 2-borrower household buying an ancien apartment; no PTZ, no existing loans. */
export function baseLoanInput(overrides: Partial<LoanInput> = {}): LoanInput {
  return {
    household: {
      borrowers: [
        { netMonthly: 2500, monthsPerYear: 12, age: 32 },
        { netMonthly: 2500, monthsPerYear: 12, age: 32 },
      ],
      otherMonthlyIncome: 0,
      householdSize: 2,
      rfr: null,
      firstTimeBuyer: false,
    },
    existingLoans: [],
    project: { propertyType: 'ancienApartment', zone: 'A', price: 200000, works: 0, apport: 20000, monthsUntilPurchase: 0 },
    terms: {
      years: 20,
      annualRate: 0.0376,
      insurance: { mode: 'initial', borrowers: [] },
      guaranteeType: 'caution',
      bankFees: 0,
      brokerFees: 0,
      includePtz: false,
    },
    rules: { maxDebtRatio: 0.35, ignoreLoansEndingWithinMonths: 0 },
    ...overrides,
  };
}

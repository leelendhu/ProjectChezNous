import type { InsuranceMode } from '../config/types';

export interface BorrowerCover {
  /** Annual rate as a share of capital, e.g. 0.0013. */
  rate: number;
  /** Share of the loan this borrower covers, e.g. 0.5 or 1. */
  quotite: number;
}

export interface InsuranceSpec {
  mode: InsuranceMode;
  borrowers: BorrowerCover[];
}

/** Monthly insurance per euro of base capital: Σ rate·quotité / 12. */
export function insuranceFactor(borrowers: BorrowerCover[]): number {
  return borrowers.reduce((sum, b) => sum + b.rate * b.quotite, 0) / 12;
}

/**
 * Insurance for one month. Initial-capital mode charges on the amount borrowed
 * (constant); CRD mode charges on the capital still owed at the start of the month.
 */
export function insuranceForMonth(spec: InsuranceSpec, initialCapital: number, crdStartOfMonth: number): number {
  const base = spec.mode === 'initial' ? initialCapital : crdStartOfMonth;
  return base * insuranceFactor(spec.borrowers);
}

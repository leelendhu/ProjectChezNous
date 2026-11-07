import type { GuaranteeType, PropertyType, Zone } from '../config/types';
import type { InsuranceSpec } from './insurance';

export interface Borrower {
  /** Net monthly salary before income tax (the figure banks use). */
  netMonthly: number;
  /** 12, 13 or 14 salaries per year. */
  monthsPerYear: number;
  age: number;
}

export interface Household {
  borrowers: Borrower[];
  otherMonthlyIncome: number;
  householdSize: number;
  /** Revenu fiscal de référence N-2 for the whole future household; null if unknown. */
  rfr: number | null;
  firstTimeBuyer: boolean;
}

export interface ExistingLoan {
  label: string;
  monthlyPayment: number;
  monthsRemaining: number;
}

export interface Project {
  propertyType: PropertyType;
  zone: Zone;
  price: number;
  works: number;
  apport: number;
  /** Months from today until the purchase is signed and the mortgage starts. */
  monthsUntilPurchase: number;
}

export interface LoanTerms {
  years: number;
  annualRate: number;
  insurance: InsuranceSpec;
  guaranteeType: GuaranteeType;
  bankFees: number;
  brokerFees: number;
  includePtz: boolean;
}

export interface BankRules {
  maxDebtRatio: number;
  /** Banks may ignore existing loans that end within this many months (0 = always counted). */
  ignoreLoansEndingWithinMonths: number;
}

export interface LoanInput {
  household: Household;
  existingLoans: ExistingLoan[];
  project: Project;
  terms: LoanTerms;
  rules: BankRules;
}

export type Severity = 'info' | 'caution';

export interface Warning {
  code: string;
  severity: Severity;
  params?: Record<string, number | string>;
}

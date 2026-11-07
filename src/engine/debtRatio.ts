import type { ExistingLoan, Household } from './types';

/** Average net monthly income: Σ salary × months-per-year / 12 + other stable income. */
export function monthlyIncome(h: Household): number {
  const salaries = h.borrowers.reduce((sum, b) => sum + (b.netMonthly * b.monthsPerYear) / 12, 0);
  return salaries + h.otherMonthlyIncome;
}

/** True when the loan is still running `atMonth` months from now. */
export const isActive = (loan: ExistingLoan, atMonth: number): boolean => loan.monthsRemaining > atMonth;

/**
 * Existing payments a bank counts `atMonth` months from now. Loans ending within
 * `ignoreWithinMonths` of that date are left out (bank-dependent; 0 = all counted).
 */
export function countedExistingPayments(loans: ExistingLoan[], ignoreWithinMonths: number, atMonth = 0): number {
  return loans
    .filter((l) => l.monthsRemaining - atMonth > Math.max(0, ignoreWithinMonths))
    .reduce((sum, l) => sum + l.monthlyPayment, 0);
}

/** All existing payments still running at `atMonth`. */
export function activeExistingPayments(loans: ExistingLoan[], atMonth = 0): number {
  return loans.filter((l) => isActive(l, atMonth)).reduce((sum, l) => sum + l.monthlyPayment, 0);
}

/** Debt ratio = all monthly loan payments incl. insurance ÷ net monthly income. */
export function debtRatio(monthlyLoanPayments: number, income: number): number {
  if (income <= 0) return monthlyLoanPayments > 0 ? Infinity : 0;
  return monthlyLoanPayments / income;
}

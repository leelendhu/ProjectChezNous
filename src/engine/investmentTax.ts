import { investment as I } from '../config/defaults';
import type { GainsTaxMode } from '../config/types';

/**
 * Tax rate on gains if the portfolio were cashed in after `years`.
 * - none: tax-free savings (Livret A) or gross view.
 * - assuranceVie: 30 % before 8 years, 24.7 % after (yearly allowance ignored).
 * - pea: flat tax before 5 years (and the plan closes), social charges only after.
 * - pfu: flat tax 31.4 %.
 */
export function gainsTaxRate(mode: GainsTaxMode, years: number): number {
  switch (mode) {
    case 'none':
      return 0;
    case 'assuranceVie':
      return years < 8 ? I.assuranceVieBefore8y.value : I.assuranceVieAfter8y.value;
    case 'pea':
      return years < I.peaMinYears.value ? I.pfu.value : I.socialCharges.value;
    case 'pfu':
      return I.pfu.value;
  }
}

/** Value after tax on the positive part of (value − contributions). */
export function afterTax(value: number, contributions: number, mode: GainsTaxMode, years: number): number {
  const gain = value - contributions;
  return gain > 0 ? value - gain * gainsTaxRate(mode, years) : value;
}

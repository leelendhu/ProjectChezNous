import { rates } from '../config/defaults';

/**
 * TAEG: annual equivalent rate i_a = (1 + i)^12 − 1, where the monthly rate i solves
 *   netReceived = Σ outflow_k / (1 + i)^k
 * netReceived = loan − upfront costs (fees, guarantee); outflows = payment + insurance.
 */
export function taeg(netReceived: number, monthlyOutflows: number[]): number {
  if (netReceived <= 0 || monthlyOutflows.length === 0) return 0;
  const pv = (i: number) => monthlyOutflows.reduce((sum, c, k) => sum + c / Math.pow(1 + i, k + 1), 0);
  // pv is decreasing in i; bisection on [0, 5 %/month].
  let lo = 0;
  let hi = 0.05;
  if (pv(lo) <= netReceived) return 0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > netReceived) lo = mid;
    else hi = mid;
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}

/** Banque de France usury ceiling for a fixed-rate property loan of this length. */
export function usuryRate(months: number): number {
  if (months < 120) return rates.usuryUnder10y.value;
  if (months < 240) return rates.usury10to20y.value;
  return rates.usury20yPlus.value;
}

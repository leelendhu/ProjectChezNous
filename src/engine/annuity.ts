/** Monthly rate from an annual nominal rate (French convention: annual / 12). */
export const monthlyRate = (annualRate: number): number => annualRate / 12;

/**
 * Constant monthly payment of a fully amortizing loan:
 * M = P·r / (1 − (1+r)^−n), with r = annual rate / 12. Zero rate → P / n.
 */
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  const r = monthlyRate(annualRate);
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Annuity factor: payment per euro borrowed. */
export function annuityFactor(annualRate: number, months: number): number {
  return monthlyPayment(1, annualRate, months);
}

/** Inverse of monthlyPayment: the principal a given payment repays. */
export function principalFromPayment(payment: number, annualRate: number, months: number): number {
  if (months <= 0 || payment <= 0) return 0;
  return payment / annuityFactor(annualRate, months);
}

/**
 * Rate for a duration from a table of {years: rate}: linear interpolation
 * between known points, flat beyond the ends.
 */
export function rateForDuration(years: number, table: Record<number, number>): number {
  const points = Object.entries(table)
    .map(([y, r]) => [Number(y), r] as const)
    .sort((a, b) => a[0] - b[0]);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) throw new Error('empty rate table');
  if (years <= first[0]) return first[1];
  if (years >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [y1, r1] = points[i - 1]!;
    const [y2, r2] = points[i]!;
    if (years <= y2) return r1 + ((r2 - r1) * (years - y1)) / (y2 - y1);
  }
  return last[1];
}

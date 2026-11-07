import { describe, expect, it } from 'vitest';
import { afterTax, gainsTaxRate } from '../investmentTax';
import { findBreakeven, runScenario, simulate, type RentVsBuyAssumptions, type Scenario, type SimulationInput } from '../rentVsBuy';
import { heatmap, linspace, tornado } from '../sensitivity';
import { baseLoanInput } from './fixtures';

/** 180 000 € at 0 % over 15 years → 1 000 €/month; taxe foncière 100 €/month; everything else 0. */
function handCase(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    horizonYears: 10,
    rentMonthly: 800,
    rentGrowth: 0,
    appreciation: 0,
    investmentReturn: 0,
    gainsTax: 'none',
    inflation: 0,
    taxeFonciereYear: 1200,
    coproMonthly: 0,
    maintenanceRate: 0,
    ownerInsuranceYear: 0,
    renterInsuranceYear: 0,
    sellingCostRate: 0.05,
    earlyRepaymentPenalty: false,
    worksValueShare: 0,
    upfrontCash: 20000,
    propertyValue0: 200000,
    loan: { principal: 180000, annualRate: 0, months: 180, insurance: { mode: 'initial', borrowers: [] } },
    ptz: { amount: 0, totalMonths: 0, deferralMonths: 0 },
    entryCosts: 0,
    guaranteeRefund: 0,
    earlyReleaseCost: 0,
    existingLoans: [],
    simulateYears: 30,
    ...overrides,
  };
}

describe('rent vs buy: hand-computed case (0 % appreciation, returns, rent growth)', () => {
  const r = simulate(handCase());

  it('net worth at 5 years', () => {
    const p = r.months[60]!;
    // buy: 200 000 × 95 % − (180 000 − 60 × 1 000) = 70 000
    expect(p.netWorthBuy).toBeCloseTo(70000, 6);
    // rent: 20 000 + 60 × (1 100 − 800) = 38 000
    expect(p.netWorthRent).toBeCloseTo(38000, 6);
    expect(p.gap).toBeCloseTo(32000, 6);
  });

  it('breakeven where −10 000 + 700·m = 0 → m = 14.29 months', () => {
    expect(r.breakeven.years).toBeCloseTo(10000 / 700 / 12, 9);
    expect(r.breakeven.crossesBack).toBe(false);
  });

  it('after the loan ends the owner invests the difference', () => {
    const p = r.months[181]!;
    expect(p.ownerPortfolio).toBeCloseTo(700, 6);
    expect(p.netWorthBuy).toBeCloseTo(190700, 6);
    expect(p.renterPortfolio).toBeCloseTo(20000 + 300 * 180, 6);
  });

  it('unrecoverable costs, year 1', () => {
    const u = r.unrecoverable[0]!;
    expect(u.rent.total).toBeCloseTo(9600, 6);
    expect(u.buy.interest).toBe(0);
    expect(u.buy.taxeFonciere).toBeCloseTo(1200, 6);
    // Exit cost 5 % × 200 000 spread over 10 years.
    expect(u.buy.entryExit).toBeCloseTo(1000, 6);
    expect(u.buy.total).toBeCloseTo(2200, 6);
    expect(r.unrecoverable).toHaveLength(10);
  });

  it('yearly points cover the horizon', () => {
    expect(r.yearly).toHaveLength(11);
    expect(r.atHorizon.month).toBe(120);
  });
});

describe('investing the difference', () => {
  it('renter invests when renting is cheaper', () => {
    const p = simulate(handCase()).months[12]!;
    expect(p.renterPortfolio).toBeCloseTo(20000 + 3600, 6);
    expect(p.ownerPortfolio).toBe(0);
  });

  it('owner invests when buying is cheaper', () => {
    const p = simulate(handCase({ rentMonthly: 1500 })).months[12]!;
    expect(p.ownerPortfolio).toBeCloseTo(4800, 6);
    expect(p.renterPortfolio).toBeCloseTo(20000, 6);
  });

  it('flips direction when rent growth overtakes the owner’s cost', () => {
    const r = simulate(handCase({ rentMonthly: 1000, rentGrowth: 0.1 }));
    expect(r.months[12]!.renterPortfolio).toBeCloseTo(21200, 6); // year 1: +100/month
    expect(r.months[24]!.renterPortfolio).toBeCloseTo(21200, 6); // year 2: equal costs
    expect(r.months[36]!.ownerPortfolio).toBeCloseTo(1320, 6); // year 3: rent 1 210, owner +110/month
    expect(r.months[36]!.renterPortfolio).toBeCloseTo(21200, 6);
  });

  it('compounds at the annual return', () => {
    const r = simulate(handCase({ rentMonthly: 1100, investmentReturn: 0.12 }));
    expect(r.months[12]!.renterPortfolio).toBeCloseTo(22400, 6);
  });

  it('taxes only the gains', () => {
    const r = simulate(handCase({ rentMonthly: 1100, investmentReturn: 0.12, gainsTax: 'pfu' }));
    expect(r.months[12]!.netWorthRent).toBeCloseTo(22400 - 2400 * 0.314, 6);
  });
});

describe('investment tax', () => {
  it('follows wrapper rules', () => {
    expect(gainsTaxRate('none', 3)).toBe(0);
    expect(gainsTaxRate('pea', 4)).toBe(0.314);
    expect(gainsTaxRate('pea', 6)).toBe(0.186);
    expect(gainsTaxRate('assuranceVie', 9)).toBeCloseTo(0.247, 9);
    expect(afterTax(900, 1000, 'pfu', 3)).toBe(900);
  });
});

describe('breakeven detection', () => {
  const pts = (gaps: number[]) => gaps.map((gap, month) => ({ month, gap }));

  it('interpolates between months', () => {
    expect(findBreakeven(pts([-10, -4, 2])).years).toBeCloseTo((1 + 4 / 6) / 12, 9);
  });

  it('reports never', () => {
    expect(findBreakeven(pts([-3, -2, -1])).years).toBeNull();
  });

  it('reports ahead from the start and crossing back', () => {
    expect(findBreakeven(pts([1, 2])).buyAheadFromStart).toBe(true);
    expect(findBreakeven(pts([-1, 1, -1])).crossesBack).toBe(true);
  });
});

const rvb: RentVsBuyAssumptions = {
  horizonYears: 10,
  rentMonthly: 950,
  rentGrowth: 0.015,
  appreciation: 0.015,
  investmentReturn: 0.05,
  gainsTax: 'none',
  inflation: 0.02,
  taxeFonciereYear: 1500,
  coproMonthly: 130,
  maintenanceRate: 0.01,
  ownerInsuranceYear: 250,
  renterInsuranceYear: 170,
  sellingCostRate: 0.05,
  earlyRepaymentPenalty: true,
  worksValueShare: 0.5,
};
const scenario: Scenario = { loan: baseLoanInput(), rvb };

describe('scenario from the loan', () => {
  it('renter starts with the buyer’s cash; buyer starts behind by the purchase costs', () => {
    const r = runScenario(scenario);
    expect(r.months[0]!.netWorthRent).toBe(20000);
    expect(r.months[0]!.gap).toBeLessThan(0);
    expect(r.months).toHaveLength(361);
  });
});

describe('sensitivity', () => {
  it('tornado rows are sorted by impact', () => {
    const t = tornado(scenario, 'gap');
    expect(t.rows).toHaveLength(10);
    for (let i = 1; i < t.rows.length; i++) expect(t.rows[i - 1]!.span).toBeGreaterThanOrEqual(t.rows[i]!.span);
  });

  it('moves in the expected direction', () => {
    const byKey = Object.fromEntries(tornado(scenario, 'gap').rows.map((r) => [r.key, r]));
    expect(byKey.appreciation!.deltaHigh).toBeGreaterThan(0);
    expect(byKey.appreciation!.deltaLow).toBeLessThan(0);
    expect(byKey.rent!.deltaHigh).toBeGreaterThan(0);
    expect(byKey.taxeFonciere!.deltaHigh).toBeLessThan(0);
    expect(byKey.interestRate!.deltaHigh).toBeLessThan(0);
  });

  it('a symmetric ±30 % on a linear cost gives symmetric deltas (0 % return)', () => {
    const flat: Scenario = { ...scenario, rvb: { ...rvb, investmentReturn: 0, inflation: 0 } };
    const row = tornado(flat, 'gap', ['taxeFonciere']).rows[0]!;
    expect(row.deltaLow).toBeCloseTo(-row.deltaHigh, 6);
  });

  it('heatmap with a years axis reuses one run per column', () => {
    const xs = linspace(-0.03, 0.05, 5);
    const ys = [1, 5, 10];
    const h = heatmap(scenario, 'appreciation', 'yearsStayed', xs, ys);
    expect(h.gap).toHaveLength(3);
    expect(h.gap[0]).toHaveLength(5);
    const direct = runScenario({ ...scenario, rvb: { ...rvb, appreciation: xs[2]! } }).months[60]!.gap;
    expect(h.gap[1]![2]).toBeCloseTo(direct, 6);
    // More appreciation → buying looks better.
    expect(h.gap[2]![4]).toBeGreaterThan(h.gap[2]![0]!);
  });

  it('heatmap over two scenario variables', () => {
    const h = heatmap(scenario, 'interestRate', 'price', [0.03, 0.045], [180000, 240000]);
    expect(h.gap[0]![0]).toBeGreaterThan(h.gap[0]![1]!);
  });
});

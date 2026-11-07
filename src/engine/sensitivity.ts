import { MAX_SIMULATION_YEARS, runScenario, type Scenario, type SimulationResult } from './rentVsBuy';

export type SensitivityKey =
  | 'appreciation'
  | 'interestRate'
  | 'investmentReturn'
  | 'rentGrowth'
  | 'rent'
  | 'price'
  | 'horizon'
  | 'maintenance'
  | 'taxeFonciere'
  | 'sellingCosts';

export interface SensitivityVariable {
  key: SensitivityKey;
  /** Current value in the scenario. */
  get: (s: Scenario) => number;
  /** Returns a copy of the scenario with the variable set. */
  set: (s: Scenario, v: number) => Scenario;
  /** Low/high values to test around the current value. */
  range: (base: number) => [number, number];
  /** Bounds for heatmap axes. */
  axis: { min: number; max: number };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const rvb = <K extends keyof Scenario['rvb']>(key: K) => ({
  get: (s: Scenario) => s.rvb[key] as number,
  set: (s: Scenario, v: number): Scenario => ({ ...s, rvb: { ...s.rvb, [key]: v } }),
});

export const sensitivityVariables: Record<SensitivityKey, SensitivityVariable> = {
  appreciation: { key: 'appreciation', ...rvb('appreciation'), range: (b) => [b - 0.02, b + 0.02], axis: { min: -0.03, max: 0.05 } },
  interestRate: {
    key: 'interestRate',
    get: (s) => s.loan.terms.annualRate,
    set: (s, v) => ({ ...s, loan: { ...s.loan, terms: { ...s.loan.terms, annualRate: v } } }),
    range: (b) => [Math.max(0, b - 0.01), b + 0.01],
    axis: { min: 0.02, max: 0.06 },
  },
  investmentReturn: { key: 'investmentReturn', ...rvb('investmentReturn'), range: (b) => [b - 0.02, b + 0.02], axis: { min: 0, max: 0.08 } },
  rentGrowth: { key: 'rentGrowth', ...rvb('rentGrowth'), range: (b) => [b - 0.01, b + 0.01], axis: { min: -0.01, max: 0.04 } },
  rent: { key: 'rent', ...rvb('rentMonthly'), range: (b) => [b * 0.8, b * 1.2], axis: { min: 400, max: 2500 } },
  price: {
    key: 'price',
    get: (s) => s.loan.project.price,
    set: (s, v) => ({ ...s, loan: { ...s.loan, project: { ...s.loan.project, price: v } } }),
    range: (b) => [b * 0.85, b * 1.15],
    axis: { min: 100000, max: 500000 },
  },
  horizon: {
    key: 'horizon',
    ...rvb('horizonYears'),
    range: (b) => [clamp(b - 5, 1, MAX_SIMULATION_YEARS), clamp(b + 5, 1, MAX_SIMULATION_YEARS)],
    axis: { min: 1, max: MAX_SIMULATION_YEARS },
  },
  maintenance: { key: 'maintenance', ...rvb('maintenanceRate'), range: (b) => [Math.max(0, b - 0.005), b + 0.005], axis: { min: 0, max: 0.025 } },
  taxeFonciere: { key: 'taxeFonciere', ...rvb('taxeFonciereYear'), range: (b) => [b * 0.7, b * 1.3], axis: { min: 0, max: 4000 } },
  sellingCosts: { key: 'sellingCosts', ...rvb('sellingCostRate'), range: (b) => [Math.max(0, b - 0.02), b + 0.02], axis: { min: 0, max: 0.1 } },
};

export type Metric = 'gap' | 'breakeven';

/** Breakeven in years; "never within 30 years" is reported as 30 so it can be plotted. */
export function metricOf(r: SimulationResult, metric: Metric): number {
  if (metric === 'gap') return r.atHorizon.gap;
  return r.breakeven.years ?? MAX_SIMULATION_YEARS;
}

export interface TornadoRow {
  key: SensitivityKey;
  low: number;
  high: number;
  /** Metric when the variable is at its low / high value. */
  atLow: number;
  atHigh: number;
  /** Change versus the base metric. */
  deltaLow: number;
  deltaHigh: number;
  /** |atHigh − atLow|; rows are sorted by this. */
  span: number;
}

export interface TornadoResult {
  base: number;
  rows: TornadoRow[];
}

export function tornado(s: Scenario, metric: Metric, keys: SensitivityKey[] = Object.keys(sensitivityVariables) as SensitivityKey[]): TornadoResult {
  const base = metricOf(runScenario(s), metric);
  const rows = keys.map((key): TornadoRow => {
    const v = sensitivityVariables[key];
    const [low, high] = v.range(v.get(s));
    const atLow = metricOf(runScenario(v.set(s, low)), metric);
    const atHigh = metricOf(runScenario(v.set(s, high)), metric);
    return { key, low, high, atLow, atHigh, deltaLow: atLow - base, deltaHigh: atHigh - base, span: Math.abs(atHigh - atLow) };
  });
  rows.sort((a, b) => b.span - a.span);
  return { base, rows };
}

/** Evenly spaced values. */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

export type HeatmapAxis = SensitivityKey | 'yearsStayed';

export interface HeatmapResult {
  xKey: HeatmapAxis;
  yKey: HeatmapAxis;
  xs: number[];
  ys: number[];
  /** gap[yIndex][xIndex] = buy − rent net worth. */
  gap: number[][];
}

/**
 * Grid of the buy − rent gap. When one axis is "years stayed", a single simulation
 * per value of the other axis gives every row, since net worth is computed as if sold each month.
 */
export function heatmap(s: Scenario, xKey: HeatmapAxis, yKey: HeatmapAxis, xs: number[], ys: number[]): HeatmapResult {
  const gapAt = (r: SimulationResult, years: number) => r.months[Math.min(r.months.length - 1, Math.round(years * 12))]!.gap;
  const apply = (sc: Scenario, key: HeatmapAxis, v: number) => (key === 'yearsStayed' ? sc : sensitivityVariables[key].set(sc, v));

  const gap: number[][] = ys.map(() => new Array<number>(xs.length).fill(0));
  if (yKey === 'yearsStayed' || xKey === 'yearsStayed') {
    const yearsOnY = yKey === 'yearsStayed';
    const other = yearsOnY ? xs : ys;
    const years = yearsOnY ? ys : xs;
    const otherKey = yearsOnY ? xKey : yKey;
    other.forEach((v, oi) => {
      const r = runScenario(apply(s, otherKey, v));
      years.forEach((y, yi) => {
        if (yearsOnY) gap[yi]![oi] = gapAt(r, y);
        else gap[oi]![yi] = gapAt(r, y);
      });
    });
  } else {
    ys.forEach((y, yi) => {
      xs.forEach((x, xi) => {
        const r = runScenario(apply(apply(s, xKey, x), yKey, y));
        gap[yi]![xi] = r.atHorizon.gap;
      });
    });
  }
  return { xKey, yKey, xs, ys, gap };
}

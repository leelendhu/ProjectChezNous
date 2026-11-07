import { beforeEach, describe, expect, it } from 'vitest';
import { loadSaved, save } from './persistence';
import { deepDiff, defaultState, parseState } from './schema';
import { resolvePrice, resolveRate, resolveRent, resolveTaxMode, toLoanInput, toLoanInputWithOverrides, toRvbAssumptions } from './selectors';
import { hydrate, useStore } from './store';
import { decodeHash, encodeHash } from './urlHash';

const fresh = () => structuredClone(defaultState);

describe('URL hash', () => {
  it('defaults encode to a bare route', () => {
    expect(encodeHash('loan', fresh())).toBe('#/loan');
  });

  it('round-trips a modified scenario and the tab', () => {
    const s = fresh();
    s.project.price = 245000;
    s.project.priceMode = 'price';
    s.existingLoans = [{ id: 'a', label: 'Car', monthlyPayment: 280, monthsRemaining: 14 }];
    s.overrides = { annualRate: 0.035 };
    s.rvb.appreciation = 0.03;
    const hash = encodeHash('rent-vs-buy', s);
    const back = decodeHash(hash);
    expect(back.tab).toBe('rent-vs-buy');
    expect(back.state).toEqual(s);
  });

  it('only the differences are encoded', () => {
    const s = fresh();
    s.rvb.horizonYears = 15;
    expect(deepDiff(defaultState, s)).toEqual({ rvb: { horizonYears: 15 } });
  });

  it('reports unreadable links instead of crashing', () => {
    expect(decodeHash('#/loan?s=notvalid$$').invalid).toBe(true);
    expect(decodeHash('#/loan?s=' + 'A'.repeat(9000)).invalid).toBe(true);
    expect(decodeHash('').tab).toBe('loan');
  });
});

describe('schema', () => {
  it('replaces invalid fields one by one with defaults', () => {
    const s = parseState({ project: { price: -5, surface: 70 }, rvb: { horizonYears: 'ten' }, junk: 1 });
    expect(s.project.price).toBe(defaultState.project.price);
    expect(s.project.surface).toBe(70);
    expect(s.rvb.horizonYears).toBe(defaultState.rvb.horizonYears);
    expect('junk' in s).toBe(false);
  });

  it('ignores prototype-pollution keys', () => {
    const s = parseState(JSON.parse('{"__proto__":{"polluted":1},"project":{"surface":50}}'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(s.project.surface).toBe(50);
  });
});

describe('selectors', () => {
  it('derives price, rate and rent from defaults', () => {
    const s = fresh();
    expect(resolvePrice(s)).toBe(Math.round(63 * 3179));
    expect(resolveRate(s)).toBe(0.0376);
    expect(resolveRent(s)).toBe(Math.round(63 * 15.2));
  });

  it('a house has no copro and the house rent per m²', () => {
    const s = fresh();
    s.project.propertyType = 'ancienHouse';
    expect(toRvbAssumptions(s).coproMonthly).toBe(0);
    expect(resolveRent(s)).toBe(Math.round(63 * 12.6));
  });

  it('new builds default to lower maintenance', () => {
    const s = fresh();
    s.project.propertyType = 'neufApartment';
    expect(toRvbAssumptions(s).maintenanceRate).toBe(0.005);
  });

  it('tax mode follows the investment preset unless set', () => {
    const s = fresh();
    expect(resolveTaxMode(s)).toBe('pea');
    s.rvb.investmentPreset = 'livretA';
    expect(resolveTaxMode(s)).toBe('none');
    s.rvb.gainsTaxMode = 'pfu';
    expect(resolveTaxMode(s)).toBe('pfu');
  });

  it('Tab 2 overrides replace Tab 1 values only in the scenario', () => {
    const s = fresh();
    s.overrides = { price: 300000, annualRate: 0.03, insuranceRate: 0.002 };
    expect(toLoanInput(s).project.price).toBe(resolvePrice(s));
    const o = toLoanInputWithOverrides(s);
    expect(o.project.price).toBe(300000);
    expect(o.terms.annualRate).toBe(0.03);
    expect(o.terms.insurance.borrowers.every((b) => b.rate === 0.002)).toBe(true);
  });
});

describe('store', () => {
  beforeEach(() => useStore.setState({ state: fresh(), tab: 'loan', linkError: false }));

  it('sets and clears overrides', () => {
    const { setOverride, resetOverrides } = useStore.getState();
    setOverride('years', 25);
    expect(useStore.getState().state.overrides).toEqual({ years: 25 });
    setOverride('years', undefined);
    expect(useStore.getState().state.overrides).toEqual({});
    setOverride('price', 1);
    resetOverrides();
    expect(useStore.getState().state.overrides).toEqual({});
  });

  it('manages existing loans', () => {
    const st = useStore.getState();
    st.addExistingLoan();
    const id = useStore.getState().state.existingLoans[0]!.id;
    useStore.getState().updateExistingLoan(id, { monthlyPayment: 350 });
    expect(useStore.getState().state.existingLoans[0]!.monthlyPayment).toBe(350);
    useStore.getState().removeExistingLoan(id);
    expect(useStore.getState().state.existingLoans).toEqual([]);
  });

  it('switching to one borrower covers them at 100 %', () => {
    useStore.getState().setBorrowerCount(1);
    const s = useStore.getState().state;
    expect(s.household.borrowers).toHaveLength(1);
    expect(s.loan.insurance).toEqual([{ rate: 0.0013, quotite: 1 }]);
  });

  it('a shared link wins over saved data', () => {
    const s = fresh();
    s.project.surface = 80;
    hydrate(encodeHash('rent-vs-buy', s));
    expect(useStore.getState().tab).toBe('rent-vs-buy');
    expect(useStore.getState().state.project.surface).toBe(80);
  });
});

describe('persistence', () => {
  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadSaved(throwing)).toBeNull();
    expect(() => save(fresh(), throwing)).not.toThrow();
  });

  it('round-trips through storage', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s = fresh();
    s.household.rfr = 41000;
    save(s, storage);
    expect(loadSaved(storage)).toEqual(s);
  });
});

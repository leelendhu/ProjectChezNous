import { useMemo } from 'react';
import { analyzeLoan } from '../engine/loan';
import { intlLocale, translate, type MessageKey, type Params } from '../i18n';
import { formatEuro, formatNumber, formatPercent } from '../i18n/format';
import { toLoanInput, toScenario } from '../state/selectors';
import { useStore } from '../state/store';

export type T = (key: MessageKey, params?: Params) => string;

const tEn: T = (key, params) => translate('en', key, params);

export function useT(): T {
  return tEn;
}

/** Locale-aware formatters. */
export function useFmt() {
  const locale = intlLocale.en;
  return useMemo(
    () => ({
      locale,
      eur: (v: number, digits = 0) => formatEuro(v, locale, digits),
      pct: (v: number, digits = 2) => formatPercent(v, locale, digits),
      num: (v: number, digits = 0) => formatNumber(v, locale, digits),
      /** "MM/YYYY", `monthsFromNow` months after today. */
      monthYear: (monthsFromNow: number) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + monthsFromNow);
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      },
    }),
    [locale],
  );
}

export const useScenarioState = () => useStore((s) => s.state);

export function useLoanAnalysis() {
  const state = useScenarioState();
  return useMemo(() => analyzeLoan(toLoanInput(state)), [state]);
}

export function useScenario() {
  const state = useScenarioState();
  return useMemo(() => toScenario(state), [state]);
}

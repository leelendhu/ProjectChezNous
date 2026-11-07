import type { ReactNode } from 'react';
import type { OverrideKey } from '../../state/schema';
import { overrideView } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useFmt, useScenarioState, useT } from '../hooks';
import { Section, Toggle } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

/** Tab 2 what-ifs on the loan designed in Tab 1, clearly marked and resettable. */
export function OverridesBar() {
  const t = useT();
  const { eur, pct } = useFmt();
  const s = useScenarioState();
  const { setOverride, resetOverrides } = useStore.getState();
  const { inherited, overridden } = overrideView(s);
  const any = Object.keys(overridden).length > 0;

  const wrap = (key: OverrideKey, from: string, node: ReactNode) => (
    <div className={key in overridden ? 'override is-edited' : 'override'} key={key}>
      {node}
      <p className="field-hint">
        {key in overridden && <span className="badge badge-edited">{t('override.edited')}</span>} {t('override.from', { value: from })}
      </p>
    </div>
  );

  return (
    <Section title={t('override.title')}>
      <p className="muted small">{t('override.intro')}</p>
      <div className="grid-2">
        {wrap(
          'price',
          eur(inherited.price),
          <NumberField label={t('override.price')} suffix="€" value={overridden.price ?? inherited.price} min={0} max={1e8} step={1000} onChange={(v) => setOverride('price', v)} />,
        )}
        {wrap(
          'apport',
          eur(inherited.apport),
          <NumberField label={t('override.apport')} suffix="€" value={overridden.apport ?? inherited.apport} min={0} max={1e8} step={1000} onChange={(v) => setOverride('apport', v)} />,
        )}
        {wrap(
          'years',
          `${inherited.years} ${t('unit.years')}`,
          <NumberField label={t('override.years')} suffix={t('unit.years')} value={overridden.years ?? inherited.years} min={5} max={30} onChange={(v) => setOverride('years', Math.round(v))} />,
        )}
        {wrap(
          'annualRate',
          pct(inherited.annualRate),
          <NumberField label={t('override.rate')} help={t('why.interestRate')} percent value={overridden.annualRate ?? inherited.annualRate} min={0} max={0.2} onChange={(v) => setOverride('annualRate', v)} />,
        )}
        {wrap(
          'insuranceRate',
          pct(inherited.insuranceRate, 3),
          <NumberField label={t('override.insurance')} percent decimals={3} value={overridden.insuranceRate ?? inherited.insuranceRate} min={0} max={0.05} onChange={(v) => setOverride('insuranceRate', v)} />,
        )}
        {wrap(
          'includePtz',
          inherited.includePtz ? '✓' : '—',
          <Toggle label={t('override.ptz')} checked={overridden.includePtz ?? inherited.includePtz} onChange={(v) => setOverride('includePtz', v)} />,
        )}
      </div>
      <button type="button" className="btn" disabled={!any} onClick={resetOverrides}>
        {t('override.reset')}
      </button>
    </Section>
  );
}

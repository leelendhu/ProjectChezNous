import { resolveRent, resolveReturn, toLoanInputWithOverrides } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useScenarioState, useT } from '../hooks';
import { NumberField } from '../inputs/NumberField';

/** The five assumptions that usually move the answer most, right above the chart. */
export function TopSliders() {
  const t = useT();
  const s = useScenarioState();
  const { setRvb, setOverride } = useStore.getState();
  const rate = toLoanInputWithOverrides(s).terms.annualRate;

  return (
    <section className="top-sliders no-print" aria-labelledby="sliders-title">
      <h2 id="sliders-title" className="eyebrow">
        {t('sliders.title')}
      </h2>
      <div className="slider-grid">
        <NumberField label={t('rvb.horizon')} help={t('why.horizon')} suffix={t('unit.years')} value={s.rvb.horizonYears} min={1} max={30} slider onChange={(v) => setRvb({ horizonYears: Math.round(v) })} />
        <NumberField label={t('var.appreciation')} help={t('why.appreciation')} percent value={s.rvb.appreciation} min={-0.2} max={0.2} slider sliderMin={-0.03} sliderMax={0.05} onChange={(v) => setRvb({ appreciation: v })} />
        <NumberField
          label={t('var.investmentReturn')}
          help={t('why.investmentReturn')}
          percent
          value={resolveReturn(s)}
          min={-0.2}
          max={0.3}
          slider
          sliderMin={0}
          sliderMax={0.08}
          onChange={(v) => setRvb({ investmentPreset: 'custom', customReturn: v })}
        />
        <NumberField
          label={t('var.rent')}
          help={t('why.rent')}
          suffix="€"
          value={resolveRent(s)}
          min={0}
          max={1e5}
          step={10}
          slider
          sliderMin={300}
          sliderMax={3000}
          onChange={(v) => setRvb({ rentMode: 'rent', rentMonthly: v })}
        />
        <NumberField label={t('var.interestRate')} help={t('why.interestRate')} percent value={rate} min={0} max={0.2} slider sliderMin={0.01} sliderMax={0.07} onChange={(v) => setOverride('annualRate', v)} />
      </div>
    </section>
  );
}

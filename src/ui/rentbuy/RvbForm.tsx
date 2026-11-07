import type { MessageKey } from '../../i18n';
import { PRESETS, TAX_MODES } from '../../state/schema';
import { autoCopro, autoMaintenance, autoRentPerM2, autoTaxeFonciere, presetReturn, presetTax, resolveRent } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useFmt, useScenarioState, useT } from '../hooks';
import { Section, Segmented, Select, Toggle } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

export function RvbForm() {
  const t = useT();
  const { eur, pct } = useFmt();
  const s = useScenarioState();
  const { setRvb } = useStore.getState();
  const r = s.rvb;

  const presetLabel = (p: (typeof PRESETS)[number]) =>
    p === 'custom' ? t('rvb.preset.custom') : t(`rvb.preset.${p}`, { rate: pct(presetReturn[p], 2) });
  const taxLabel = (m: (typeof TAX_MODES)[number]) =>
    m === 'auto'
      ? t('rvb.taxMode.auto', { mode: t(`rvb.taxMode.${presetTax[r.investmentPreset]}` as MessageKey) })
      : t(`rvb.taxMode.${m}`);

  return (
    <>
      <Section title={t('rvb.renting')}>
        <Segmented
          label={t('rvb.rentMode')}
          value={r.rentMode}
          options={[
            { value: 'surface', label: t('rvb.rentMode.surface') },
            { value: 'rent', label: t('rvb.rentMode.rent') },
          ]}
          onChange={(v) => setRvb(v === 'rent' ? { rentMode: v, rentMonthly: resolveRent(s) } : { rentMode: v })}
        />
        {r.rentMode === 'surface' ? (
          <NumberField
            label={t('rvb.rentPerM2')}
            help={t('why.rent')}
            suffix={t('unit.eurM2')}
            decimals={1}
            value={r.rentPerM2}
            autoValue={autoRentPerM2(s)}
            min={0}
            max={1000}
            step={0.1}
            onChange={(v) => setRvb({ rentPerM2: v })}
            onAuto={() => setRvb({ rentPerM2: null })}
            hint={t('rvb.rentResult', { rent: eur(resolveRent(s)), surface: s.project.surface })}
          />
        ) : (
          <NumberField label={t('rvb.rent')} help={t('why.rent')} suffix="€" value={r.rentMonthly} min={0} max={1e5} slider sliderMin={300} sliderMax={3000} step={10} onChange={(v) => setRvb({ rentMonthly: v })} />
        )}
        <NumberField label={t('rvb.rentGrowth')} help={t('why.rentGrowth')} percent value={r.rentGrowth} min={-0.1} max={0.2} slider sliderMin={-0.01} sliderMax={0.05} onChange={(v) => setRvb({ rentGrowth: v })} />
        <NumberField label={t('rvb.renterIns')} suffix={t('unit.eurYear')} value={r.renterInsuranceYear} min={0} max={1e4} onChange={(v) => setRvb({ renterInsuranceYear: v })} />
      </Section>

      <Section title={t('rvb.owning')}>
        <NumberField label={t('rvb.appreciation')} help={t('why.appreciation')} percent value={r.appreciation} min={-0.2} max={0.2} slider sliderMin={-0.03} sliderMax={0.05} onChange={(v) => setRvb({ appreciation: v })} />
        <div className="grid-2">
          <NumberField
            label={t('rvb.taxeFonciere')}
            help={t('why.taxeFonciere')}
            suffix={t('unit.eurYear')}
            value={r.taxeFonciereYear}
            autoValue={autoTaxeFonciere(s)}
            min={0}
            max={1e5}
            onChange={(v) => setRvb({ taxeFonciereYear: v })}
            onAuto={() => setRvb({ taxeFonciereYear: null })}
          />
          <NumberField
            label={t('rvb.copro')}
            suffix={t('unit.eurMonth')}
            value={r.coproMonthly}
            autoValue={autoCopro(s)}
            min={0}
            max={1e4}
            onChange={(v) => setRvb({ coproMonthly: v })}
            onAuto={() => setRvb({ coproMonthly: null })}
          />
        </div>
        <div className="grid-2">
          <NumberField
            label={t('rvb.maintenance')}
            help={t('why.maintenance')}
            percent
            value={r.maintenanceRate}
            autoValue={autoMaintenance(s)}
            min={0}
            max={0.1}
            onChange={(v) => setRvb({ maintenanceRate: v })}
            onAuto={() => setRvb({ maintenanceRate: null })}
          />
          <NumberField label={t('rvb.ownerIns')} suffix={t('unit.eurYear')} value={r.ownerInsuranceYear} min={0} max={1e4} onChange={(v) => setRvb({ ownerInsuranceYear: v })} />
        </div>
        <div className="grid-2">
          <NumberField label={t('rvb.selling')} help={t('why.sellingCosts')} percent value={r.sellingCostRate} min={0} max={0.2} onChange={(v) => setRvb({ sellingCostRate: v })} />
          {s.project.works > 0 && (
            <NumberField label={t('rvb.worksValue')} percent decimals={0} value={r.worksValueShare} min={0} max={1.5} onChange={(v) => setRvb({ worksValueShare: v })} />
          )}
        </div>
        <Toggle label={t('rvb.ira')} checked={r.earlyRepaymentPenalty} onChange={(v) => setRvb({ earlyRepaymentPenalty: v })} />
        <p className="muted small">{t('rvb.taxeHabitation')}</p>
      </Section>

      <Section title={t('rvb.investing')}>
        <Select label={t('rvb.preset')} help={t('why.investmentReturn')} value={r.investmentPreset} options={PRESETS.map((p) => ({ value: p, label: presetLabel(p) }))} onChange={(v) => setRvb({ investmentPreset: v })} />
        {r.investmentPreset === 'custom' && (
          <NumberField label={t('rvb.customReturn')} percent value={r.customReturn} min={-0.2} max={0.3} slider sliderMin={0} sliderMax={0.08} onChange={(v) => setRvb({ customReturn: v })} />
        )}
        <Select label={t('rvb.taxMode')} value={r.gainsTaxMode} options={TAX_MODES.map((m) => ({ value: m, label: taxLabel(m) }))} onChange={(v) => setRvb({ gainsTaxMode: v })} />
        <NumberField label={t('rvb.inflation')} percent value={r.inflation} min={-0.05} max={0.2} onChange={(v) => setRvb({ inflation: v })} />
        <Toggle label={t('rvb.realTerms')} checked={r.realTerms} onChange={(v) => setRvb({ realTerms: v })} />
      </Section>
    </>
  );
}

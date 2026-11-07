import { ptz } from '../../config/defaults';
import { PROPERTY_TYPES, ZONES } from '../../state/schema';
import { autoPricePerM2, resolvePrice } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useFmt, useScenarioState, useT } from '../hooks';
import { Segmented, Section, Select } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

export function ProjectForm() {
  const t = useT();
  const { eur } = useFmt();
  const s = useScenarioState();
  const { setProject } = useStore.getState();
  const p = s.project;

  return (
    <Section title={t('project.title')}>
      <Select
        label={t('project.type')}
        value={p.propertyType}
        options={PROPERTY_TYPES.map((v) => ({ value: v, label: t(`project.type.${v}`) }))}
        onChange={(v) => setProject({ propertyType: v })}
      />
      <Segmented
        label={t('project.priceMode')}
        value={p.priceMode}
        options={[
          { value: 'surface', label: t('project.priceMode.surface') },
          { value: 'price', label: t('project.priceMode.price') },
        ]}
        onChange={(v) => setProject(v === 'price' ? { priceMode: v, price: resolvePrice(s) } : { priceMode: v })}
      />
      <div className="grid-2">
        <NumberField
          label={t('project.surface')}
          help={t('project.surface.help')}
          suffix={t('unit.m2')}
          value={p.surface}
          min={1}
          max={2000}
          slider
          sliderMin={15}
          sliderMax={200}
          onChange={(v) => setProject({ surface: v })}
        />
        {p.priceMode === 'surface' ? (
          <NumberField
            label={t('project.pricePerM2')}
            help={t('project.pricePerM2.help')}
            suffix={t('unit.eurM2')}
            value={p.pricePerM2}
            autoValue={autoPricePerM2(s)}
            min={0}
            max={1e6}
            onChange={(v) => setProject({ pricePerM2: v })}
            onAuto={() => setProject({ pricePerM2: null })}
            hint={t('project.resultingPrice', { price: eur(resolvePrice(s)) })}
          />
        ) : (
          <NumberField
            label={t('project.price')}
            suffix="€"
            value={p.price}
            min={0}
            max={1e8}
            step={1000}
            slider
            sliderMin={50000}
            sliderMax={800000}
            onChange={(v) => setProject({ price: v })}
          />
        )}
      </div>
      <div className="grid-2">
        <NumberField
          label={t('project.works')}
          help={t('project.works.help')}
          suffix="€"
          value={p.works}
          min={0}
          max={1e8}
          onChange={(v) => setProject({ works: v })}
        />
        <NumberField
          label={t('project.apport')}
          help={t('project.apport.help')}
          suffix="€"
          value={p.apport}
          min={0}
          max={1e8}
          step={1000}
          slider
          sliderMin={0}
          sliderMax={200000}
          onChange={(v) => setProject({ apport: v })}
        />
      </div>
      <div className="grid-2">
        <Select
          label={t('project.zone')}
          help={t('project.zone.help')}
          value={p.zone}
          options={ZONES.map((z) => ({ value: z, label: z === 'Abis' ? 'A bis' : z }))}
          onChange={(v) => setProject({ zone: v })}
        />
        <NumberField
          label={t('project.monthsUntil')}
          help={t('project.monthsUntil.help')}
          suffix={t('unit.months')}
          value={p.monthsUntilPurchase}
          min={0}
          max={120}
          onChange={(v) => setProject({ monthsUntilPurchase: Math.round(v) })}
        />
      </div>
      <p className="muted small">
        <a href={ptz.zoneCheckerUrl} target="_blank" rel="noopener noreferrer">
          {t('project.zone.check')}
        </a>
      </p>
    </Section>
  );
}

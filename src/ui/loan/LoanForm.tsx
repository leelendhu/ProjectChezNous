import { hcsf } from '../../config/defaults';
import { GUARANTEES } from '../../state/schema';
import { autoRate } from '../../state/selectors';
import { useStore } from '../../state/store';
import { useScenarioState, useT } from '../hooks';
import { Segmented, Section, Select, Toggle } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

export function LoanForm() {
  const t = useT();
  const s = useScenarioState();
  const { setLoan, setCover, setRules } = useStore.getState();
  const l = s.loan;
  const borrowers = s.household.borrowers.length;

  return (
    <Section title={t('loan.title')}>
      <div className="grid-2">
        <NumberField
          label={t('loan.years')}
          help={t('loan.years.help')}
          suffix={t('unit.years')}
          value={l.years}
          min={5}
          max={30}
          slider
          sliderMin={10}
          sliderMax={25}
          onChange={(v) => setLoan({ years: Math.round(v) })}
        />
        <NumberField
          label={t('loan.rate')}
          help={t('loan.rate.help')}
          percent
          value={l.customRate}
          autoValue={autoRate(l.years)}
          min={0}
          max={0.2}
          step={0.0005}
          slider
          sliderMin={0.01}
          sliderMax={0.07}
          onChange={(v) => setLoan({ customRate: v })}
          onAuto={() => setLoan({ customRate: null })}
        />
      </div>
      <Segmented
        label={t('loan.insuranceMode')}
        value={l.insuranceMode}
        options={[
          { value: 'initial', label: t('loan.insuranceMode.initial') },
          { value: 'crd', label: t('loan.insuranceMode.crd') },
        ]}
        onChange={(v) => setLoan({ insuranceMode: v })}
      />
      {l.insurance.slice(0, borrowers).map((c, i) => (
        <div className="grid-2" key={i}>
          <NumberField
            label={t('loan.insuranceRate', { n: String.fromCharCode(65 + i) })}
            help={t('loan.insuranceRate.help')}
            percent
            decimals={3}
            value={c.rate}
            min={0}
            max={0.05}
            step={0.0001}
            onChange={(v) => setCover(i, { rate: v })}
          />
          <NumberField
            label={t('loan.quotite', { n: String.fromCharCode(65 + i) })}
            help={t('loan.quotite.help')}
            percent
            decimals={0}
            value={c.quotite}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setCover(i, { quotite: v })}
          />
        </div>
      ))}
      <Select
        label={t('loan.guarantee')}
        help={t('loan.guarantee.help')}
        value={l.guaranteeType}
        options={GUARANTEES.map((g) => ({ value: g, label: t(`loan.guarantee.${g}`) }))}
        onChange={(v) => setLoan({ guaranteeType: v })}
      />
      <div className="grid-2">
        <NumberField label={t('loan.bankFees')} suffix="€" value={l.bankFees} min={0} max={1e6} onChange={(v) => setLoan({ bankFees: v })} />
        <NumberField label={t('loan.brokerFees')} suffix="€" value={l.brokerFees} min={0} max={1e6} onChange={(v) => setLoan({ brokerFees: v })} />
      </div>
      <Toggle label={t('loan.ptz')} checked={l.includePtz} onChange={(v) => setLoan({ includePtz: v })} />
      <NumberField
        label={t('loan.maxRatio')}
        help={t('loan.maxRatio.help')}
        percent
        decimals={1}
        value={s.rules.maxDebtRatio}
        min={0.05}
        max={0.8}
        step={0.005}
        onChange={(v) => setRules({ maxDebtRatio: v })}
        hint={s.rules.maxDebtRatio !== hcsf.maxDebtRatio.value ? t('loan.maxRatio.edited') : undefined}
      />
    </Section>
  );
}

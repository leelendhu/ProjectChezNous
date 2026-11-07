import { useStore } from '../../state/store';
import { useFmt, useLoanAnalysis, useScenarioState, useT } from '../hooks';
import { Segmented, Section, Toggle } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

export function HouseholdForm() {
  const t = useT();
  const { eur } = useFmt();
  const s = useScenarioState();
  const a = useLoanAnalysis();
  const { setHousehold, setBorrower, setBorrowerCount } = useStore.getState();
  const h = s.household;

  return (
    <Section title={t('household.title')}>
      <Segmented
        label={t('household.borrowers')}
        value={String(h.borrowers.length) as '1' | '2'}
        options={[
          { value: '1', label: '1' },
          { value: '2', label: '2' },
        ]}
        onChange={(v) => setBorrowerCount(v === '1' ? 1 : 2)}
      />
      {h.borrowers.map((b, i) => (
        <fieldset key={i} className="group">
          <legend>{t('household.borrowerN', { n: String.fromCharCode(65 + i) })}</legend>
          <NumberField
              label={t('household.net')}
              help={t('household.net.help')}
              suffix="€"
              value={b.netMonthly}
              min={0}
              max={1e6}
              onChange={(v) => setBorrower(i, { netMonthly: v })}
            />
          <div className="grid-2">
            <NumberField
              label={t('household.monthsPerYear')}
              help={t('household.monthsPerYear.help')}
              value={b.monthsPerYear}
              min={12}
              max={16}
              decimals={1}
              onChange={(v) => setBorrower(i, { monthsPerYear: v })}
            />
            <NumberField
              label={t('household.age')}
              help={t('household.age.help')}
              value={b.age}
              min={18}
              max={90}
              onChange={(v) => setBorrower(i, { age: v })}
            />
          </div>
        </fieldset>
      ))}
      <NumberField
        label={t('household.other')}
        help={t('household.other.help')}
        suffix="€"
        value={h.otherMonthlyIncome}
        min={0}
        max={1e6}
        onChange={(v) => setHousehold({ otherMonthlyIncome: v })}
      />
      <p className="derived">{t('household.income', { income: eur(a.income) })}</p>
      <div className="grid-2">
        <NumberField
          label={t('household.size')}
          help={t('household.size.help')}
          value={h.householdSize}
          min={1}
          max={12}
          onChange={(v) => setHousehold({ householdSize: Math.round(v) })}
        />
        <NumberField
          label={t('household.rfr')}
          help={t('household.rfr.help')}
          suffix="€"
          value={h.rfr}
          min={0}
          max={1e7}
          placeholder="—"
          onChange={(v) => setHousehold({ rfr: v })}
          onClear={() => setHousehold({ rfr: null })}
        />
      </div>
      <Toggle
        label={t('household.firstTime')}
        help={t('household.firstTime.help')}
        checked={h.firstTimeBuyer}
        onChange={(v) => setHousehold({ firstTimeBuyer: v })}
      />
    </Section>
  );
}

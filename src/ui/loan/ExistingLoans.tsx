import { useId } from 'react';
import { useStore } from '../../state/store';
import { useFmt, useScenarioState, useT } from '../hooks';
import { Section } from '../inputs/Choice';
import { NumberField } from '../inputs/NumberField';

export function ExistingLoans() {
  const t = useT();
  const { monthYear } = useFmt();
  const s = useScenarioState();
  const { addExistingLoan, updateExistingLoan, removeExistingLoan, setRules } = useStore.getState();
  const labelId = useId();

  return (
    <Section title={t('existing.title')}>
      {s.existingLoans.length === 0 && <p className="muted">{t('existing.empty')}</p>}
      {s.existingLoans.map((l, i) => (
        <fieldset key={l.id} className="group">
          <legend className="visually-hidden">{l.label || `${t('existing.defaultLabel')} ${i + 1}`}</legend>
          <div className="field">
            <div className="field-head">
              <label htmlFor={`${labelId}-${l.id}`}>{t('existing.label')}</label>
            </div>
            <input
              id={`${labelId}-${l.id}`}
              type="text"
              maxLength={60}
              value={l.label}
              placeholder={t('existing.labelPlaceholder')}
              onChange={(e) => updateExistingLoan(l.id, { label: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <NumberField
              label={t('existing.payment')}
              suffix="€"
              value={l.monthlyPayment}
              min={0}
              max={1e6}
              onChange={(v) => updateExistingLoan(l.id, { monthlyPayment: v })}
            />
            <NumberField
              label={t('existing.remaining')}
              help={t('existing.remaining.help')}
              value={l.monthsRemaining}
              min={0}
              max={600}
              onChange={(v) => updateExistingLoan(l.id, { monthsRemaining: Math.round(v) })}
              hint={t('existing.ends', { date: monthYear(l.monthsRemaining) })}
            />
          </div>
          <button type="button" className="btn-quiet" onClick={() => removeExistingLoan(l.id)}>
            {t('actions.remove')}
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn" onClick={addExistingLoan}>
        + {t('existing.add')}
      </button>
      {s.existingLoans.length > 0 && (
        <NumberField
          label={t('existing.ignore')}
          help={t('existing.ignore.help')}
          suffix={t('unit.months')}
          value={s.rules.ignoreLoansEndingWithinMonths}
          min={0}
          max={60}
          onChange={(v) => setRules({ ignoreLoansEndingWithinMonths: Math.round(v) })}
        />
      )}
    </Section>
  );
}

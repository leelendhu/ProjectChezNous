import type { SimulationResult } from '../../engine/rentVsBuy';
import { useFmt, useT } from '../hooks';

/** The plain-language answer, always framed as a consequence of the assumptions. */
export function Headline({ result, horizon }: { result: SimulationResult; horizon: number }) {
  const t = useT();
  const { eur, num } = useFmt();
  const { breakeven, atHorizon } = result;
  const gap = eur(Math.abs(atHorizon.gap));
  const sentences: string[] = [];

  if (breakeven.buyAheadFromStart) {
    sentences.push(t('headline.fromStart', { horizon, gap }));
  } else if (breakeven.years === null) {
    sentences.push(t('headline.never', { horizon, gap }));
  } else {
    sentences.push(t('headline.overtakes', { years: num(breakeven.years, 1) }));
    if (breakeven.years > horizon) sentences.push(t('headline.beyondHorizon', { horizon, gap }));
    else {
      sentences.push(t('headline.beforeMove'));
      if (atHorizon.gap >= 0) sentences.push(t('headline.withinHorizon', { horizon, gap }));
    }
  }
  if (breakeven.crossesBack) sentences.push(t('headline.crossesBack'));

  return (
    <section className="headline" aria-live="polite">
      <p className="headline-text">{sentences.join(' ')}</p>
      <p className="muted small">{t('headline.note')}</p>
    </section>
  );
}

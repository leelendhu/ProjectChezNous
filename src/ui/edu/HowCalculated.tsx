import type { MessageKey } from '../../i18n';
import { useT } from '../hooks';

const LOAN_KEYS: MessageKey[] = ['how.payment', 'how.insurance', 'how.ratio', 'how.capacity', 'how.notary', 'how.ptz', 'how.cost', 'how.reste'];

export function HowCalculated({ keys = LOAN_KEYS, title }: { keys?: MessageKey[]; title?: string }) {
  const t = useT();
  return (
    <details className="block how">
      <summary>
        <h2>{title ?? t('how.title')}</h2>
      </summary>
      <ul>
        {keys.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
    </details>
  );
}

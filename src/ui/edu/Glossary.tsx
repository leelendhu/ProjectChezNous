import type { MessageKey } from '../../i18n';
import { useT } from '../hooks';

const TERMS = [
  'apport',
  'fraisNotaire',
  'dmto',
  'tauxEndettement',
  'resteAVivre',
  'hcsf',
  'quotite',
  'crd',
  'taeg',
  'tauxUsure',
  'caution',
  'ptz',
  'vefa',
  'irl',
  'taxeFonciere',
  'primo',
  'lissage',
] as const;

export function Glossary() {
  const t = useT();
  return (
    <details className="block edu" id="glossary">
      <summary>
        <h2>{t('glossary.title')}</h2>
      </summary>
      <p className="muted">{t('glossary.intro')}</p>
      <dl className="glossary">
        {TERMS.map((k) => (
          <div key={k}>
            <dt lang="fr">{t(`term.${k}` as MessageKey)}</dt>
            <dd>{t(`def.${k}` as MessageKey)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

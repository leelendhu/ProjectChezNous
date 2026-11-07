import { sources } from '../../config/defaults';
import type { Sourced } from '../../config/types';
import type { MessageKey } from '../../i18n';
import { assumptionLabels } from '../../i18n/en';
import { useFmt, useT } from '../hooks';

const isSourced = (v: unknown): v is Sourced<unknown> => typeof v === 'object' && v !== null && 'value' in v && 'source' in v;

type Fmt = ReturnType<typeof useFmt>;

/** Prints any default value according to its unit. */
function formatValue(value: unknown, unit: string, f: Fmt): string {
  const isShare = /share|rate|per year/.test(unit) && !unit.includes('€');
  const one = (v: unknown): string => {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return '∞';
      if (unit.startsWith('€/')) return `${f.num(v, v < 100 ? 1 : 0)} ${unit}`;
      if (unit.includes('€')) return f.eur(v);
      if (isShare) return f.pct(v, 3);
      return `${f.num(v, 2)}${unit === 'multiplier' || unit === 'divisor' ? '' : ` ${unit}`}`;
    }
    if (typeof v === 'string') return v;
    if (typeof v === 'boolean') return v ? '✓' : '—';
    if (Array.isArray(v)) return v.map(one).join(' · ');
    if (v && typeof v === 'object') {
      return Object.entries(v)
        .map(([k, x]) => `${k}: ${one(x)}`)
        .join('; ');
    }
    return String(v);
  };
  if (Array.isArray(value) && value.every((x) => x && typeof x === 'object' && 'upTo' in x)) {
    return (value as { upTo: number; rate: number }[]).map((b) => `≤ ${Number.isFinite(b.upTo) ? f.eur(b.upTo) : '∞'}: ${f.pct(b.rate, 3)}`).join(' · ');
  }
  if (Array.isArray(value) && value.every(Array.isArray)) {
    return (value as number[][]).map((pair, i) => `T${i + 1}: ${pair.join(' / ')} y`).join(' · ');
  }
  return one(value);
}

export function Assumptions() {
  const t = useT();
  const f = useFmt();
  return (
    <details className="block edu" id="assumptions">
      <summary>
        <h2>{t('assume.title')}</h2>
      </summary>
      <p className="muted">{t('assume.intro')}</p>
      {Object.entries(sources).map(([group, items]) => (
        <section key={group} className="assume-group">
          <h3>{t(`assume.group.${group}` as MessageKey)}</h3>
          <dl className="assume-list">
            {Object.entries(items)
              .filter(([, v]) => isSourced(v))
              .map(([key, v]) => {
                const d = v as Sourced<unknown>;
                return (
                  <div key={key} className="assume-item">
                    <dt>
                      {assumptionLabels[`${group}.${key}`] ?? key}
                      <span className="assume-value">{formatValue(d.value, d.unit, f)}</span>
                    </dt>
                    <dd>
                      <p>
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noopener noreferrer">
                            {d.source}
                          </a>
                        ) : (
                          d.source
                        )}{' '}
                        <span className="muted">· {t('assume.retrieved', { date: d.retrieved })}</span>
                      </p>
                      {d.note && <p className="muted">{d.note}</p>}
                      {d.conflict && (
                        <p className="assume-conflict">
                          <strong>{t('assume.conflict')}:</strong> {d.conflict}
                        </p>
                      )}
                    </dd>
                  </div>
                );
              })}
          </dl>
        </section>
      ))}
    </details>
  );
}

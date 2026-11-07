import { useState } from 'react';
import type { Scenario } from '../../engine/rentVsBuy';
import { MAX_SIMULATION_YEARS } from '../../engine/rentVsBuy';
import type { Metric, TornadoRow } from '../../engine/sensitivity';
import type { MessageKey } from '../../i18n';
import { formatEuroCompact } from '../../i18n/format';
import { runTornado } from '../../workers/sensitivityClient';
import { useFmt, useT } from '../hooks';
import { Segmented } from '../inputs/Choice';
import { InfoTip } from '../inputs/InfoTip';
import { useDebouncedAsync } from './useSimulation';
import { formatVar } from './varFormat';

/** Sorted bars: how far each assumption, from low to high, moves the chosen measure. */
export function Tornado({ scenario }: { scenario: Scenario }) {
  const t = useT();
  const { locale, num } = useFmt();
  const [metric, setMetric] = useState<Metric>('gap');
  const { value, busy } = useDebouncedAsync(scenario, (s) => runTornado(s, metric), metric);

  const fmtMetric = (v: number) =>
    metric === 'gap' ? formatEuroCompact(v, locale) : v >= MAX_SIMULATION_YEARS ? t('tornado.never') : `${num(v, 1)} y`;
  const fmtDelta = (d: number) => (metric === 'gap' ? formatEuroCompact(d, locale) : `${d > 0 ? '+' : ''}${num(d, 1)} y`);
  // For the gap, a higher value favours buying; for breakeven, a lower one does.
  const favoursBuy = (delta: number) => (metric === 'gap' ? delta > 0 : delta < 0);

  return (
    <section className="block" aria-labelledby="tornado-title">
      <h2 id="tornado-title">{t('tornado.title')}</h2>
      <p>{t('tornado.intro')}</p>
      <Segmented
        label={t('tornado.metric')}
        value={metric}
        options={[
          { value: 'gap', label: t('tornado.metric.gap') },
          { value: 'breakeven', label: t('tornado.metric.breakeven') },
        ]}
        onChange={setMetric}
      />
      {!value ? (
        <p className="muted">{t('tornado.computing')}</p>
      ) : (
        <TornadoChart rows={value.rows} base={value.base} fmtMetric={fmtMetric} fmtDelta={fmtDelta} favoursBuy={favoursBuy} busy={busy} />
      )}
    </section>
  );
}

function TornadoChart(p: {
  rows: TornadoRow[];
  base: number;
  fmtMetric: (v: number) => string;
  fmtDelta: (d: number) => string;
  favoursBuy: (d: number) => boolean;
  busy: boolean;
}) {
  const t = useT();
  const { locale } = useFmt();
  const extent = Math.max(1e-9, ...p.rows.flatMap((r) => [Math.abs(r.deltaLow), Math.abs(r.deltaHigh)]));
  const pctPos = (d: number) => 50 + (d / extent) * 50;

  return (
    <div className={`tornado${p.busy ? ' is-busy' : ''}`}>
      <p className="tornado-base">
        {t('tornado.base', { value: p.fmtMetric(p.base) })}
        <span className="tornado-key">
          <span className="swatch" style={{ background: 'var(--rent)' }} /> {t('tornado.favoursRent')}
          <span className="swatch" style={{ background: 'var(--buy)' }} /> {t('tornado.favoursBuy')}
        </span>
      </p>
      <ol className="tornado-rows">
        {p.rows.map((r) => {
          const ends = [
            { d: r.deltaLow, v: r.low },
            { d: r.deltaHigh, v: r.high },
          ];
          return (
            <li key={r.key} className="tornado-row">
              <div className="tornado-label">
                <span>{t(`var.${r.key}` as MessageKey)}</span>
                <InfoTip text={t(`why.${r.key}` as MessageKey)} label={t(`var.${r.key}` as MessageKey)} />
              </div>
              <div className="tornado-track" aria-hidden="true">
                <span className="tornado-zero" />
                {ends.map((e, i) => {
                  const left = Math.min(50, pctPos(e.d));
                  const width = Math.abs(pctPos(e.d) - 50);
                  return (
                    <span
                      key={i}
                      className="tornado-bar"
                      style={{ left: `${left}%`, width: `${width}%`, background: p.favoursBuy(e.d) ? 'var(--buy)' : 'var(--rent)' }}
                    />
                  );
                })}
              </div>
              <div className="tornado-values">
                {ends.map((e, i) => (
                  <span key={i}>
                    {formatVar(r.key, e.v, locale)} → {p.fmtDelta(e.d)}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="chart-summary">
        {t('tornado.summary', {
          first: t(`var.${p.rows[0]?.key ?? 'appreciation'}` as MessageKey),
          second: t(`var.${p.rows[1]?.key ?? 'rent'}` as MessageKey),
          third: t(`var.${p.rows[2]?.key ?? 'price'}` as MessageKey),
        })}
      </p>
    </div>
  );
}

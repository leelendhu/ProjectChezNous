import { useState } from 'react';
import type { DebtTimelinePoint } from '../../engine/loan';
import { useFmt, useT } from '../hooks';

const SERIES = [
  { key: 'existing', color: 'var(--c-fees)', label: 'capacity.timeline.existing' },
  { key: 'mortgage', color: 'var(--buy)', label: 'capacity.timeline.mortgage' },
  { key: 'ptz', color: 'var(--c-principal)', label: 'capacity.timeline.ptz' },
] as const;

/** Stacked monthly bars: existing loans dropping off, the mortgage starting. */
export function DebtTimeline({ points }: { points: DebtTimelinePoint[] }) {
  const t = useT();
  const { eur, monthYear } = useFmt();
  const [hover, setHover] = useState<number | null>(null);
  const w = 560;
  const h = 170;
  const pad = { l: 44, r: 4, t: 8, b: 20 };
  const totals = points.map((p) => p.existing + p.mortgage + p.ptz);
  const maxV = Math.max(1, ...totals) * 1.1;
  const step = (w - pad.l - pad.r) / points.length;
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / maxV);
  const ticks = [0, maxV / 2, maxV].map((v) => Math.round(v / 100) * 100);
  const showSeries = SERIES.filter((s) => points.some((p) => p[s.key] > 0));
  const active = hover === null ? null : points[hover];

  return (
    <figure className="chart">
      <figcaption className="chart-title">{t('capacity.timeline')}</figcaption>
      <ul className="legend">
        {showSeries.map((s) => (
          <li key={s.key}>
            <span className="swatch" style={{ background: s.color }} />
            {t(s.label)}
          </li>
        ))}
      </ul>
      <div className="chart-readout" aria-live="polite">
        {active
          ? `${monthYear(active.month)}: ${showSeries.map((s) => `${t(s.label)} ${eur(active[s.key])}`).join(' · ')}`
          : ' '}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" aria-hidden="true" onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={pad.l - 4} y={y(v) + 3} fontSize={11} textAnchor="end" fill="var(--ink-muted)">
              {eur(v)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          let acc = 0;
          const x = pad.l + i * step;
          return (
            <g key={p.month} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={x} y={pad.t} width={step} height={h - pad.t - pad.b} fill="transparent" />
              {SERIES.map((s) => {
                const v = p[s.key];
                if (v <= 0) return null;
                const top = y(acc + v);
                const bottom = y(acc);
                acc += v;
                return <rect key={s.key} x={x + 1} y={top} width={Math.max(1, step - 2)} height={Math.max(0, bottom - top - 1)} rx={1} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.55} />;
              })}
              {i % 6 === 0 && (
                <text x={x + step / 2} y={h - 6} fontSize={11} textAnchor="middle" fill="var(--ink-muted)">
                  {monthYear(p.month)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

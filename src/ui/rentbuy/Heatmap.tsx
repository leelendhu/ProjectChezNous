import { useMemo, useState } from 'react';
import type { Scenario } from '../../engine/rentVsBuy';
import { linspace, sensitivityVariables, type HeatmapAxis, type HeatmapResult } from '../../engine/sensitivity';
import type { MessageKey } from '../../i18n';
import { runHeatmap } from '../../workers/sensitivityClient';
import { useFmt, useT } from '../hooks';
import { Select } from '../inputs/Choice';
import { useDebouncedAsync } from './useSimulation';
import { formatVar } from './varFormat';

type Pair = 'appreciation-yearsStayed' | 'interestRate-price' | 'investmentReturn-appreciation';
const PAIRS: Pair[] = ['appreciation-yearsStayed', 'interestRate-price', 'investmentReturn-appreciation'];

function axesFor(pair: Pair, s: Scenario): { xKey: HeatmapAxis; yKey: HeatmapAxis; xs: number[]; ys: number[] } {
  switch (pair) {
    case 'appreciation-yearsStayed':
      return { xKey: 'appreciation', yKey: 'yearsStayed', xs: linspace(-0.03, 0.05, 17), ys: linspace(1, 30, 30) };
    case 'interestRate-price': {
      const p = s.loan.project.price;
      return { xKey: 'interestRate', yKey: 'price', xs: linspace(0.02, 0.06, 17), ys: linspace(p * 0.7, p * 1.3, 13).map(Math.round) };
    }
    case 'investmentReturn-appreciation':
      return { xKey: 'investmentReturn', yKey: 'appreciation', xs: linspace(0, 0.08, 17), ys: linspace(-0.03, 0.05, 17) };
  }
}

const current = (key: HeatmapAxis, s: Scenario) => (key === 'yearsStayed' ? s.rvb.horizonYears : sensitivityVariables[key].get(s));

export function Heatmap({ scenario }: { scenario: Scenario }) {
  const t = useT();
  const [pair, setPair] = useState<Pair>('appreciation-yearsStayed');
  const axes = useMemo(() => axesFor(pair, scenario), [pair, scenario]);
  const { value, busy } = useDebouncedAsync(scenario, () => runHeatmap(scenario, axes.xKey, axes.yKey, axes.xs, axes.ys), pair);
  const you = { x: current(axes.xKey, scenario), y: current(axes.yKey, scenario) };

  return (
    <section className="block" aria-labelledby="heat-title">
      <h2 id="heat-title">{t('heat.title')}</h2>
      <p>{t('heat.intro')}</p>
      <Select label={t('heat.axes')} value={pair} options={PAIRS.map((p) => ({ value: p, label: t(`heat.axes.${p}`) }))} onChange={setPair} />
      {value && value.xKey === axes.xKey && value.yKey === axes.yKey ? <HeatGrid h={value} you={you} busy={busy} /> : <p className="muted">{t('tornado.computing')}</p>}
    </section>
  );
}

function HeatGrid({ h, you, busy }: { h: HeatmapResult; you: { x: number; y: number }; busy: boolean }) {
  const t = useT();
  const { locale, eur } = useFmt();
  const [hover, setHover] = useState<{ xi: number; yi: number } | null>(null);
  const nx = h.xs.length;
  const ny = h.ys.length;
  const cellW = 38;
  const cellH = ny > 20 ? 14 : 24;
  const pad = { l: 64, t: 6, b: 34, r: 4 };
  const w = pad.l + nx * cellW + pad.r;
  const hgt = pad.t + ny * cellH + pad.b;
  const maxAbs = Math.max(1, ...h.gap.flat().map(Math.abs));
  // Rows top-to-bottom = largest y first.
  const rowY = (yi: number) => pad.t + (ny - 1 - yi) * cellH;
  const colX = (xi: number) => pad.l + xi * cellW;

  const fill = (g: number) => {
    const share = Math.round(Math.sqrt(Math.min(1, Math.abs(g) / maxAbs)) * 100);
    return `color-mix(in oklab, ${g >= 0 ? 'var(--buy)' : 'var(--rent)'} ${share}%, var(--diverge-mid))`;
  };
  const nearest = (arr: number[], v: number) => arr.reduce((best, a, i) => (Math.abs(a - v) < Math.abs(arr[best]! - v) ? i : best), 0);
  const youX = nearest(h.xs, you.x);
  const youY = nearest(h.ys, you.y);

  // Edges where the sign flips: the "equal" contour.
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let yi = 0; yi < ny; yi++) {
    for (let xi = 0; xi < nx; xi++) {
      const g = h.gap[yi]![xi]!;
      if (xi + 1 < nx && Math.sign(g) !== Math.sign(h.gap[yi]![xi + 1]!)) {
        const x = colX(xi + 1);
        edges.push({ x1: x, y1: rowY(yi), x2: x, y2: rowY(yi) + cellH });
      }
      if (yi + 1 < ny && Math.sign(g) !== Math.sign(h.gap[yi + 1]![xi]!)) {
        const y = rowY(yi);
        edges.push({ x1: colX(xi), y1: y, x2: colX(xi) + cellW, y2: y });
      }
    }
  }
  const active = hover ?? { xi: youX, yi: youY };
  const ag = h.gap[active.yi]![active.xi]!;
  const readout = t('heat.cell', {
    x: `${t(`var.${h.xKey}` as MessageKey)} ${formatVar(h.xKey, h.xs[active.xi]!, locale)}`,
    y: `${t(`var.${h.yKey}` as MessageKey)} ${formatVar(h.yKey, h.ys[active.yi]!, locale)}`,
    winner: ag >= 0 ? t('nw.winner.buy') : t('nw.winner.rent'),
    gap: eur(Math.abs(ag)),
  });

  return (
    <figure className={`chart heatmap${busy ? ' is-busy' : ''}`}>
      <div className="chart-readout" aria-live="polite">
        {hover ? readout : `${t('heat.you')}: ${readout}`}
      </div>
      <div className="heatmap-scroll">
        <svg viewBox={`0 0 ${w} ${hgt}`} className="chart-svg" style={{ maxWidth: w * 1.4 }} role="img" aria-label={readout} onMouseLeave={() => setHover(null)}>
          {h.gap.map((row, yi) =>
            row.map((g, xi) => (
              <g key={`${xi}-${yi}`} onMouseEnter={() => setHover({ xi, yi })} onClick={() => setHover({ xi, yi })}>
                <rect x={colX(xi) + 1} y={rowY(yi) + 1} width={cellW - 2} height={cellH - 2} rx={2} fill={fill(g)} />
              </g>
            )),
          )}
          {edges.map((e, i) => (
            <line key={i} {...e} stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
          ))}
          <rect x={colX(youX) + 1} y={rowY(youY) + 1} width={cellW - 2} height={cellH - 2} rx={2} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 2" />
          <text x={12} y={pad.t + (ny * cellH) / 2} fontSize={11} textAnchor="middle" fill="var(--ink)" transform={`rotate(-90 12 ${pad.t + (ny * cellH) / 2})`}>
            {t(`var.${h.yKey}` as MessageKey)}
          </text>
          {h.xs.map((x, xi) => (xi % 2 !== 0 ? null :
            <text key={xi} x={colX(xi) + cellW / 2} y={pad.t + ny * cellH + 14} fontSize={10} textAnchor="middle" fill="var(--ink-muted)">
              {formatVar(h.xKey, x, locale)}
            </text>
          ))}
          <text x={pad.l + (nx * cellW) / 2} y={hgt - 4} fontSize={11} textAnchor="middle" fill="var(--ink)">
            {t(`var.${h.xKey}` as MessageKey)}
          </text>
          {h.ys.map((y, yi) =>
            ny <= 13 || yi % 4 === 0 || yi === ny - 1 ? (
              <text key={yi} x={pad.l - 4} y={rowY(yi) + cellH / 2 + 3} fontSize={10} textAnchor="end" fill="var(--ink-muted)">
                {formatVar(h.yKey, y, locale)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <p className="legend heat-legend">
        <span className="swatch" style={{ background: 'var(--rent)' }} /> {t('nw.rentAhead')}
        <span className="heat-ramp" aria-hidden="true" />
        <span className="swatch" style={{ background: 'var(--buy)' }} /> {t('nw.buyAhead')}
      </p>
    </figure>
  );
}

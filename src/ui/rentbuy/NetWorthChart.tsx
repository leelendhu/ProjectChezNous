import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationResult } from '../../engine/rentVsBuy';
import { formatEuroCompact } from '../../i18n/format';
import { useFmt, useT } from '../hooks';

const axisTick = { fill: 'var(--ink-muted)', fontSize: 11 };

export function NetWorthChart({ result, horizon, real, existingTotal }: { result: SimulationResult; horizon: number; real: boolean; existingTotal: number }) {
  const t = useT();
  const { eur, num, locale } = useFmt();
  const horizonMonths = Math.round(horizon * 12);
  const pts = result.months.filter((p) => p.month <= horizonMonths && (p.month % 3 === 0 || p.month === horizonMonths));
  const data = pts.map((p) => {
    const d = real ? p.deflator : 1;
    const buy = p.netWorthBuy / d;
    const rent = p.netWorthRent / d;
    return {
      year: p.month / 12,
      buy,
      rent,
      buyAhead: buy >= rent ? [rent, buy] : [buy, buy],
      rentAhead: rent > buy ? [buy, rent] : [rent, rent],
    };
  });
  const end = data[data.length - 1]!;
  const be = result.breakeven.years;
  const showBe = be !== null && !result.breakeven.buyAheadFromStart && be <= horizon;
  const winner = end.buy >= end.rent ? t('nw.winner.buy') : t('nw.winner.rent');

  return (
    <figure className="chart networth">
      <figcaption className="chart-title">
        {t('nw.title')}
        {real && <span className="muted"> · {t('nw.today')}</span>}
      </figcaption>
      <ul className="legend">
        <li>
          <span className="swatch swatch-line" style={{ background: 'var(--buy)' }} />
          {t('nw.buy')}
        </li>
        <li>
          <span className="swatch swatch-line" style={{ background: 'var(--rent)' }} />
          {t('nw.rent')}
        </li>
        <li>
          <span className="swatch" style={{ background: 'var(--buy-soft)' }} />
          {t('nw.buyAhead')}
        </li>
        <li>
          <span className="swatch" style={{ background: 'var(--rent-soft)' }} />
          {t('nw.rentAhead')}
        </li>
      </ul>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="year" type="number" domain={[0, horizon]} tickCount={Math.min(horizon + 1, 11)} allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} unit=" y" />
            <YAxis tick={axisTick} tickFormatter={(v) => formatEuroCompact(Number(v), locale)} width={52} tickLine={false} axisLine={false} />
            <Area dataKey="buyAhead" stroke="none" fill="var(--buy-soft)" fillOpacity={0.9} isAnimationActive={false} activeDot={false} />
            <Area dataKey="rentAhead" stroke="none" fill="var(--rent-soft)" fillOpacity={0.9} isAnimationActive={false} activeDot={false} />
            <Line dataKey="buy" name={t('nw.buy')} stroke="var(--buy)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line dataKey="rent" name={t('nw.rent')} stroke="var(--rent)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
            {showBe && (
              <ReferenceLine
                x={be!}
                stroke="var(--ink)"
                strokeDasharray="3 3"
                label={{ value: t('nw.breakeven', { years: num(be!, 1) }), position: be! > horizon * 0.6 ? 'insideTopRight' : 'insideTopLeft', fill: 'var(--ink)', fontSize: 12 }}
              />
            )}
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13 }}
              labelFormatter={(l) => `${t('common.year')} ${num(Number(l), 2)}`}
              formatter={(v, name) => (Array.isArray(v) ? [null, null] : [eur(Number(v)), name])}
              filterNull
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-summary">
        {t('nw.summary', { horizon, buy: eur(end.buy), rent: eur(end.rent), gap: eur(Math.abs(end.buy - end.rent)), winner })}
      </p>
      <p className="small">{t('nw.explainer')}</p>
      {existingTotal > 0 && <p className="small muted">{t('nw.existing', { amount: eur(existingTotal) })}</p>}
    </figure>
  );
}

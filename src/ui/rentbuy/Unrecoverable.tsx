import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationResult, UnrecoverableYear } from '../../engine/rentVsBuy';
import type { MessageKey } from '../../i18n';
import { formatEuroCompact } from '../../i18n/format';
import { useFmt, useT } from '../hooks';
import { Toggle } from '../inputs/Choice';

const BUY_PARTS: (keyof UnrecoverableYear['buy'])[] = ['interest', 'insurance', 'taxeFonciere', 'maintenance', 'copro', 'homeInsurance', 'opportunityCost', 'entryExit'];
const axisTick = { fill: 'var(--ink-muted)', fontSize: 11 };

export function Unrecoverable({ result }: { result: SimulationResult }) {
  const t = useT();
  const { eur, locale } = useFmt();
  const [year, setYear] = useState(1);
  const [netOfGrowth, setNetOfGrowth] = useState(false);
  const years = result.unrecoverable;
  if (years.length === 0) return null;
  const y = years[Math.min(year, years.length) - 1]!;
  const data = years.map((u) => ({ year: u.year, rent: u.rent.total, buy: netOfGrowth ? u.buy.total - u.appreciation : u.buy.total }));
  const parts = BUY_PARTS.map((k) => ({ key: k, value: y.buy[k] })).filter((p) => p.value > 0.5);
  const maxBar = Math.max(y.rent.total, y.buy.total, ...parts.map((p) => p.value));

  return (
    <section className="block" aria-labelledby="unrec-title">
      <h2 id="unrec-title">{t('unrec.title')}</h2>
      <p>{t('unrec.intro')}</p>
      <figure className="chart">
        <figcaption className="chart-title">{t('unrec.byYear')}</figcaption>
        <ul className="legend">
          <li>
            <span className="swatch swatch-line" style={{ background: 'var(--buy)' }} />
            {t('unrec.totalBuy')}
          </li>
          <li>
            <span className="swatch swatch-line" style={{ background: 'var(--rent)' }} />
            {t('unrec.totalRent')}
          </li>
        </ul>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} />
              <YAxis tick={axisTick} tickFormatter={(v) => formatEuroCompact(Number(v), locale)} width={52} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13 }} labelFormatter={(l) => `${t('common.year')} ${l}`} formatter={(v) => eur(Number(v))} />
              <Line dataKey="buy" name={t('unrec.totalBuy')} stroke="var(--buy)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              <Line dataKey="rent" name={t('unrec.totalRent')} stroke="var(--rent)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <Toggle label={t('unrec.showAppreciation')} checked={netOfGrowth} onChange={setNetOfGrowth} />

      <div className="breakdown">
        <div className="breakdown-head">
          <h3>{t('unrec.breakdown', { year: y.year })}</h3>
          <label className="inline-field">
            {t('unrec.year')}{' '}
            <select value={y.year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((u) => (
                <option key={u.year} value={u.year}>
                  {u.year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className="bars">
          <tbody>
            <tr className="bars-rent">
              <th scope="row">{t('unrec.rent')}</th>
              <td>
                <span className="bar" style={{ width: `${(y.rent.total / maxBar) * 100}%`, background: 'var(--rent)' }} />
              </td>
              <td>{eur(y.rent.total)}</td>
            </tr>
            {parts.map((p) => (
              <tr key={p.key}>
                <th scope="row">{t(`unrec.${p.key}` as MessageKey)}</th>
                <td>
                  <span className="bar" style={{ width: `${(p.value / maxBar) * 100}%`, background: 'var(--buy)' }} />
                </td>
                <td>{eur(p.value)}</td>
              </tr>
            ))}
            <tr className="bars-total">
              <th scope="row">{t('unrec.totalBuy')}</th>
              <td>
                <span className="bar" style={{ width: `${(y.buy.total / maxBar) * 100}%`, background: 'var(--buy)' }} />
              </td>
              <td>{eur(y.buy.total)}</td>
            </tr>
            <tr className="bars-offset">
              <th scope="row">{t('unrec.appreciation')}</th>
              <td />
              <td>−{eur(y.appreciation)}</td>
            </tr>
          </tbody>
        </table>
        <p className="chart-summary">{t('unrec.summary', { year: y.year, rent: eur(y.rent.total), buy: eur(y.buy.total) })}</p>
      </div>
    </section>
  );
}

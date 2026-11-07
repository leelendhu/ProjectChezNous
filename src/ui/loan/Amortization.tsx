import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LoanAnalysis } from '../../engine/loan';
import { useFmt, useT } from '../hooks';

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13 };
const axisTick = { fill: 'var(--ink-muted)', fontSize: 11 };

export function Amortization({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur } = useFmt();
  const [monthly, setMonthly] = useState(false);
  const [showTable, setShowTable] = useState(false);
  if (a.years.length === 0) return null;

  const series = [
    { key: 'interest', label: t('amort.interest'), color: 'var(--c-interest)' },
    { key: 'principal', label: t('amort.principal'), color: 'var(--c-principal)' },
    { key: 'insurance', label: t('amort.insurance'), color: 'var(--c-insurance)' },
  ] as const;
  const y1 = a.years[0]!;
  const cross = a.years.find((y) => y.principal > y.interest)?.year ?? 1;
  const kEur = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
  const rows = monthly ? a.schedule.map((r) => ({ ...r, label: r.month })) : a.years.map((r) => ({ ...r, label: r.year }));

  return (
    <section className="block" aria-labelledby="amort-title">
      <h2 id="amort-title">{t('amort.title')}</h2>
      <figure className="chart">
        <figcaption className="chart-title">{t('amort.stack')}</figcaption>
        <ul className="legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className="swatch" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.years} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} />
              <YAxis tick={axisTick} tickFormatter={kEur} width={36} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(l) => `${t('common.year')} ${l}`} contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-sunk)' }} />
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="var(--surface)" strokeWidth={1} radius={i === series.length - 1 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure className="chart">
        <figcaption className="chart-title">{t('amort.crd')}</figcaption>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={[{ year: 0, crd: a.plan.mainLoan }, ...a.years]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} />
              <YAxis tick={axisTick} tickFormatter={kEur} width={36} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => eur(Number(v))} labelFormatter={(l) => `${t('common.year')} ${l}`} contentStyle={tooltipStyle} />
              <Line dataKey="crd" name={t('amort.crdShort')} stroke="var(--buy)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <p className="chart-summary">{t('amort.summary', { interest: eur(y1.interest), principal: eur(y1.principal), cross })}</p>
      <div className="row-actions">
        <button type="button" className="btn-quiet" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
          {showTable ? t('common.hideTable') : t('common.showTable')}
        </button>
        {showTable && (
          <button type="button" className="btn-quiet" onClick={() => setMonthly((v) => !v)}>
            {monthly ? t('amort.yearly') : t('amort.monthly')}
          </button>
        )}
      </div>
      {showTable && (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{monthly ? t('common.month') : t('common.year')}</th>
                <th scope="col">{t('amort.interest')}</th>
                <th scope="col">{t('amort.principal')}</th>
                <th scope="col">{t('amort.insurance')}</th>
                <th scope="col">{t('amort.crdShort')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{eur(r.interest)}</td>
                  <td>{eur(r.principal)}</td>
                  <td>{eur(r.insurance)}</td>
                  <td>{eur(r.crd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

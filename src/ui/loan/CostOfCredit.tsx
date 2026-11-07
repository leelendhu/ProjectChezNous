import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { LoanAnalysis } from '../../engine/loan';
import { useFmt, useT } from '../hooks';

export function CostOfCredit({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur } = useFmt();
  const c = a.cost;
  const feesNet = c.guarantee - c.guaranteeRefund + c.fees;
  const data = [
    { key: 'interest', label: t('cost.interest'), value: c.interest, color: 'var(--c-interest)' },
    { key: 'insurance', label: t('cost.insurance'), value: c.insurance, color: 'var(--c-insurance)' },
    { key: 'fees', label: t('cost.guaranteeFees'), value: Math.max(0, feesNet), color: 'var(--c-fees)' },
  ].filter((d) => d.value > 0);

  return (
    <section className="block" aria-labelledby="cost-title">
      <h2 id="cost-title">{t('cost.title')}</h2>
      <div className="cost-grid">
        <div className="donut" aria-hidden="true">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="95%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => eur(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="donut-center">{eur(c.total)}</p>
        </div>
        <ul className="legend legend-values">
          {data.map((d) => (
            <li key={d.key}>
              <span className="swatch" style={{ background: d.color }} />
              <span>{d.label}</span>
              <strong>{eur(d.value)}</strong>
            </li>
          ))}
          <li className="legend-total">
            <span />
            <span>{t('common.total')}</span>
            <strong>{eur(c.total)}</strong>
          </li>
        </ul>
      </div>
      {c.guaranteeRefund > 0 && <p className="muted small">{t('cost.refundNote', { refund: eur(c.guaranteeRefund) })}</p>}
      <p className="chart-summary visually-hidden">
        {t('cost.summary', { total: eur(c.total), interest: eur(c.interest), insurance: eur(c.insurance), fees: eur(feesNet) })}
      </p>
    </section>
  );
}

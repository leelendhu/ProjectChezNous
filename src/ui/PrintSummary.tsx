import { useMemo } from 'react';
import { runScenario } from '../engine/rentVsBuy';
import { toRvbAssumptions } from '../state/selectors';
import { useFmt, useLoanAnalysis, useScenario, useScenarioState, useT } from './hooks';
import { Headline } from './rentbuy/Headline';

/** One-page summary shown only when printing. */
export function PrintSummary() {
  const t = useT();
  const { eur, pct } = useFmt();
  const s = useScenarioState();
  const a = useLoanAnalysis();
  const scenario = useScenario();
  const r = useMemo(() => runScenario(scenario), [scenario]);
  const rvb = toRvbAssumptions(s);
  const row = (label: string, value: string) => (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
  return (
    <section className="print-only print-summary" aria-hidden="true">
      <h2>{t('print.title')}</h2>
      <div className="print-cols">
        <table className="plan">
          <caption>{t('print.loan')}</caption>
          <tbody>
            {row(t('print.income'), eur(a.income))}
            {row(t('print.price'), eur(a.plan.price))}
            {row(t('print.apport'), eur(a.plan.apport))}
            {row(t('plan.notary'), eur(a.plan.notary.total))}
            {row(t('print.loanAmount'), eur(a.plan.mainLoan))}
            {a.plan.ptzAmount > 0 && row(t('plan.ptz'), eur(a.plan.ptzAmount))}
            {row(t('print.terms'), `${s.loan.years} ${t('unit.years')} · ${pct(scenario.loan.terms.annualRate)}`)}
            {row(t('results.monthly'), eur(a.payment + a.insurance))}
            {row(t('results.ratio'), pct(a.debtRatio, 1))}
            {row(t('capacity.price'), eur(a.capacity[0]?.maxPrice ?? 0))}
            {row(t('cost.title'), eur(a.cost.total))}
            {row(t('results.taeg'), pct(a.taeg))}
          </tbody>
        </table>
        <table className="plan">
          <caption>{t('print.rvb')}</caption>
          <tbody>
            {row(t('print.rent'), eur(rvb.rentMonthly))}
            {row(t('print.horizon'), `${rvb.horizonYears} ${t('unit.years')}`)}
            {row(t('print.returns'), `${pct(rvb.appreciation, 1)} / ${pct(rvb.investmentReturn, 1)}`)}
            {row(t('print.nw'), `${eur(r.atHorizon.netWorthBuy)} / ${eur(r.atHorizon.netWorthRent)}`)}
          </tbody>
        </table>
      </div>
      <Headline result={r} horizon={rvb.horizonYears} />
      <p className="small">{t('print.link', { url: typeof location === 'undefined' ? '' : location.href })}</p>
      <p className="small">{t('print.generated', { date: new Date().toLocaleDateString() })}</p>
    </section>
  );
}

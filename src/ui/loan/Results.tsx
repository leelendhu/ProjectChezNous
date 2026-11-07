import { ptz as ptzDefaults } from '../../config/defaults';
import type { LoanAnalysis } from '../../engine/loan';
import type { MessageKey } from '../../i18n';
import { DebtTimeline } from '../charts/DebtTimeline';
import { Gauge } from '../charts/Gauge';
import { useFmt, useLoanAnalysis, useScenarioState, useT } from '../hooks';
import { Amortization } from './Amortization';
import { CostOfCredit } from './CostOfCredit';

export function LoanResults() {
  const a = useLoanAnalysis();
  return (
    <div className="results" id="results">
      <Summary a={a} />
      <Warnings a={a} />
      <Capacity a={a} />
      <FinancingPlanTable a={a} />
      <PtzCard a={a} />
      <CostOfCredit a={a} />
      <Amortization a={a} />
    </div>
  );
}

function Summary({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur, pct } = useFmt();
  const max = useScenarioState().rules.maxDebtRatio;
  return (
    <section className="summary" aria-label={t('results.title')}>
      <div className="stat">
        <h3>{t('results.monthly')}</h3>
        <p className="stat-value">
          {eur(a.payment + a.insurance)}
          <span className="unit">{t('unit.eurMonth').replace('€', '')}</span>
        </p>
        <p className="stat-detail">{t('results.monthly.detail', { loan: eur(a.payment), ins: eur(a.insurance) })}</p>
      </div>
      <div className="stat">
        <h3>{t('results.ratio')}</h3>
        <p className={`stat-value${a.debtRatio > max ? ' is-warn' : ''}`}>{Number.isFinite(a.debtRatio) ? pct(a.debtRatio, 1) : '—'}</p>
        <Gauge value={a.debtRatio} threshold={max} label={t('results.ratio.summary', { ratio: pct(a.debtRatio, 1), max: pct(max, 0) })} />
      </div>
      <div className="stat">
        <h3>{t('results.reste')}</h3>
        <p className="stat-value">
          {eur(a.resteAVivre)}
          <span className="unit">{t('unit.eurMonth').replace('€', '')}</span>
        </p>
        <p className="stat-detail">{t('results.reste.short')}</p>
      </div>
      <div className="stat">
        <h3>{t('results.taeg')}</h3>
        <p className={`stat-value${a.taeg > a.usury ? ' is-warn' : ''}`}>{pct(a.taeg, 2)}</p>
        <p className="stat-detail">{t('results.taeg.detail', { usury: pct(a.usury, 2) })}</p>
      </div>
      {a.phases.length > 1 && <PaymentPhases a={a} />}
    </section>
  );
}

/** Year label for a phase: "Years 3–15" or "Year 3". */
export function phaseYears(t: ReturnType<typeof useT>, fromMonth: number, toMonth: number): string {
  const from = Math.ceil(fromMonth / 12);
  const to = Math.ceil(toMonth / 12);
  return from === to ? t('results.phase.year', { from }) : t('results.phase.years', { from, to });
}

function PaymentPhases({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur } = useFmt();
  const crd = useScenarioState().loan.insuranceMode === 'crd';
  return (
    <div className="phases">
      <h3>{t('results.phases')}</h3>
      <ol>
        {a.phases.map((p) => (
          <li key={p.fromMonth} className={p.isPeak ? 'is-peak' : undefined}>
            <span className="phase-years">{phaseYears(t, p.fromMonth, p.toMonth)}</span>
            <strong className="phase-total">
              {eur(p.total)}
              <span className="unit">{t('unit.eurMonth').replace('€', '')}</span>
            </strong>
            <span className="phase-note">
              {p.mainLoan === 0 ? t('results.phase.ptzOnly') : p.ptz > 0 ? t('results.phase.withPtz', { ptz: eur(p.ptz) }) : ''}
              {p.isPeak && <em>{(p.ptz > 0 && p.mainLoan > 0 ? ' · ' : '') + t('results.phase.peak')}</em>}
            </span>
          </li>
        ))}
      </ol>
      {crd && <p className="stat-detail">{t('results.phase.crd')}</p>}
    </div>
  );
}

function Warnings({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { pct, eur } = useFmt();
  if (a.warnings.length === 0) return null;
  const fmt = (code: string, params: Record<string, number | string> = {}) => {
    const p: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      p[k] = typeof v !== 'number' ? v : k === 'fees' ? eur(v) : pct(v, 1);
    }
    return t(`warn.${code}` as MessageKey, p);
  };
  return (
    <section className="block warnings" aria-labelledby="warnings-title">
      <h2 id="warnings-title">{t('warnings.title')}</h2>
      <ul>
        {a.warnings.map((w) => (
          <li key={w.code} className={`warning warning-${w.severity}`}>
            <span className="warning-icon" aria-hidden="true">
              {w.severity === 'caution' ? '!' : 'i'}
            </span>
            {fmt(w.code, w.params)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Capacity({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur, monthYear } = useFmt();
  const [today, ...later] = a.capacity;
  if (!today) return null;
  return (
    <section className="block" aria-labelledby="capacity-title">
      <h2 id="capacity-title">{t('capacity.title')}</h2>
      <div className="capacity-grid">
        <div className="capacity-card">
          <h3>{t('capacity.today')}</h3>
          <dl>
            <dt>{t('capacity.loan')}</dt>
            <dd>{eur(today.maxPrincipal)}</dd>
            <dt>{t('capacity.price')}</dt>
            <dd>{eur(today.maxPrice)}</dd>
          </dl>
        </div>
        {later.map((step) => (
          <div className="capacity-card is-later" key={step.atMonth}>
            <h3>
              {t('capacity.after', {
                loans: step.endedLoans.map((l) => l || t('existing.defaultLabel')).join(', '),
                months: step.atMonth,
                date: monthYear(step.atMonth),
              })}
            </h3>
            <dl>
              <dt>{t('capacity.loan')}</dt>
              <dd>
                {eur(step.maxPrincipal)} <span className="delta">{t('capacity.diff', { diff: eur(step.maxPrincipal - today.maxPrincipal) })}</span>
              </dd>
              <dt>{t('capacity.price')}</dt>
              <dd>{eur(step.maxPrice)}</dd>
            </dl>
          </div>
        ))}
      </div>
      {(a.existingAll > 0 || later.length > 0 || a.debtTimeline.some((p) => p.existing > 0)) && (
        <>
          <DebtTimeline points={a.debtTimeline} />
          <p className="chart-summary">
            {t('capacity.timeline.summary', {
              start: eur(a.debtTimeline[0]?.existing ?? 0),
              end: eur(a.debtTimeline[a.debtTimeline.length - 1]?.existing ?? 0),
              mortgage: eur(a.payment + a.insurance),
              first: (a.debtTimeline.findIndex((p) => p.mortgage > 0) + 1) || '—',
            })}
          </p>
        </>
      )}
    </section>
  );
}

function FinancingPlanTable({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur } = useFmt();
  const p = a.plan;
  const row = (label: string, value: number, sub?: string, cls?: string) => (
    <tr className={cls}>
      <th scope="row">
        {label}
        {sub && <span className="sub">{sub}</span>}
      </th>
      <td>{eur(value)}</td>
    </tr>
  );
  return (
    <section className="block" aria-labelledby="plan-title">
      <h2 id="plan-title">{t('plan.title')}</h2>
      <div className="plan-grid">
        <table className="plan">
          <caption>{t('plan.uses')}</caption>
          <tbody>
            {row(t('plan.price'), p.price)}
            {p.works > 0 && row(t('plan.works'), p.works)}
            {row(t('plan.notary'), p.notary.total)}
            {row(t('plan.notary.taxes'), p.notary.taxes, undefined, 'indent')}
            {row(t('plan.notary.emoluments'), p.notary.emoluments, undefined, 'indent')}
            {row(t('plan.notary.disbursements'), p.notary.disbursements, undefined, 'indent')}
            {row(t('plan.guarantee'), p.guarantee.upfront, p.guarantee.refund > 0 ? t('plan.guaranteeRefund', { refund: eur(p.guarantee.refund) }) : undefined)}
            {p.bankFees > 0 && row(t('plan.bankFees'), p.bankFees)}
            {p.brokerFees > 0 && row(t('plan.brokerFees'), p.brokerFees)}
          </tbody>
          <tfoot>{row(t('plan.total'), p.totalCost)}</tfoot>
        </table>
        <table className="plan">
          <caption>{t('plan.funded')}</caption>
          <tbody>
            {row(t('plan.apport'), p.apport - p.surplusApport)}
            {row(t('plan.mainLoan'), p.mainLoan)}
            {p.ptzAmount > 0 && row(t('plan.ptz'), p.ptzAmount)}
          </tbody>
          <tfoot>{row(t('common.total'), p.apport - p.surplusApport + p.mainLoan + p.ptzAmount)}</tfoot>
        </table>
      </div>
      {p.surplusApport > 0 && <p className="muted">{t('plan.surplus', { surplus: eur(p.surplusApport) })}</p>}
    </section>
  );
}

function PtzCard({ a }: { a: LoanAnalysis }) {
  const t = useT();
  const { eur, pct } = useFmt();
  const z = a.plan.ptz;
  return (
    <section className="block ptz" aria-labelledby="ptz-title">
      <h2 id="ptz-title">{t('ptz.title')}</h2>
      {z.eligible ? (
        <>
          <p className="ptz-amount">{eur(z.amount)}</p>
          <p>{t('ptz.eligible', { tranche: z.tranche ?? '', quotite: pct(z.quotite, 0), cost: eur(z.retainedCost) })}</p>
          <p>{t('ptz.amount', { amount: eur(a.plan.ptzAmount), years: z.totalMonths / 12, deferral: z.deferralMonths / 12 })}</p>
          {a.plan.ptzAmount < z.amount && <p>{t('ptz.capped', { amount: eur(a.plan.ptzAmount) })}</p>}
        </>
      ) : (
        <>
          <p>{t('ptz.notEligible')}</p>
          <ul>
            {z.reasons.map((r) => (
              <li key={r}>{t(`ptz.reason.${r}`)}</li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">
        {t('ptz.estimateNote')}{' '}
        <a href={ptzDefaults.simulatorUrl} target="_blank" rel="noopener noreferrer">
          {t('ptz.official')}
        </a>
      </p>
    </section>
  );
}

/** Phones: a compact bar so results stay visible while editing inputs. */
export function MobileSummary() {
  const t = useT();
  const { eur, pct } = useFmt();
  const a = useLoanAnalysis();
  const max = useScenarioState().rules.maxDebtRatio;
  return (
    <a className="mobile-summary no-print" href="#results">
      <span>
        <small>{t('results.monthly')}</small>
        <strong>
          {eur(a.payment + a.insurance)}
          {a.phases.length > 1 && <span className="peak-hint"> → {eur(Math.max(...a.phases.map((p) => p.total)))}</span>}
        </strong>
      </span>
      <span>
        <small>{t('results.ratio')}</small>
        <strong className={a.debtRatio > max ? 'is-warn' : undefined}>{Number.isFinite(a.debtRatio) ? pct(a.debtRatio, 1) : '—'}</strong>
      </span>
      <span>
        <small>{t('capacity.price')}</small>
        <strong>{eur(a.capacity[0]?.maxPrice ?? 0)}</strong>
      </span>
    </a>
  );
}

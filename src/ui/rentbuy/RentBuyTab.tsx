import { HowCalculated } from '../edu/HowCalculated';
import { useScenarioState, useT } from '../hooks';
import { Headline } from './Headline';
import { Heatmap } from './Heatmap';
import { NetWorthChart } from './NetWorthChart';
import { OverridesBar } from './OverridesBar';
import { RvbForm } from './RvbForm';
import { TopSliders } from './TopSliders';
import { Tornado } from './Tornado';
import { Unrecoverable } from './Unrecoverable';
import { useSimulation } from './useSimulation';

export function RentBuyTab() {
  const t = useT();
  const s = useScenarioState();
  const { scenario, result } = useSimulation();
  const horizon = s.rvb.horizonYears;
  const existingTotal = result.cashflow.reduce((sum, c) => sum + c.existing, 0);

  return (
    <div className="tab-layout tab-rvb">
      <div className="inputs">
        <OverridesBar />
        <RvbForm />
      </div>
      <div className="outputs results">
        <Headline result={result} horizon={horizon} />
        <TopSliders />
        <NetWorthChart result={result} horizon={horizon} real={s.rvb.realTerms} existingTotal={existingTotal} />
        <Unrecoverable result={result} />
        <Tornado scenario={scenario} />
        <Heatmap scenario={scenario} />
        <HowCalculated
          title={t('howRvb.title')}
          keys={['howRvb.start', 'howRvb.monthly', 'howRvb.networth', 'howRvb.growth', 'howRvb.breakeven', 'howRvb.real']}
        />
      </div>
    </div>
  );
}

import { HowCalculated } from '../edu/HowCalculated';
import { ExistingLoans } from './ExistingLoans';
import { HouseholdForm } from './HouseholdForm';
import { LoanForm } from './LoanForm';
import { ProjectForm } from './ProjectForm';
import { LoanResults, MobileSummary } from './Results';

export function LoanTab() {
  return (
    <div className="tab-layout">
      <div className="inputs">
        <HouseholdForm />
        <ExistingLoans />
        <ProjectForm />
        <LoanForm />
      </div>
      <div className="outputs">
        <LoanResults />
        <HowCalculated />
      </div>
      <MobileSummary />
    </div>
  );
}

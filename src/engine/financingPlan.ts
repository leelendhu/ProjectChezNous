import { isNew } from '../config/types';
import { guaranteeCost, guaranteeUpfrontRate, type GuaranteeCost } from './guarantee';
import { notaryFees, type NotaryBreakdown } from './notary';
import { estimatePtz, noPtz, type PtzResult } from './ptz';
import type { Household, LoanTerms, Project } from './types';

export interface FinancingPlan {
  price: number;
  works: number;
  notary: NotaryBreakdown;
  guarantee: GuaranteeCost;
  bankFees: number;
  brokerFees: number;
  /** Everything that must be paid at purchase. */
  totalCost: number;
  apport: number;
  mainLoan: number;
  ptz: PtzResult;
  /** PTZ actually used (capped so it never exceeds the main loan). */
  ptzAmount: number;
  /** Apport left over when it exceeds what is needed. */
  surplusApport: number;
}

/**
 * Uses = price + works + notary + guarantee + bank fees + broker fees.
 * Resources = apport + main loan + PTZ.
 * The guarantee is proportional to the main loan, so the loan is solved directly:
 *   L = (needExGuarantee − apport − PTZ) / (1 − g).
 * The PTZ may not exceed the other loans; when it would, both are set equal.
 */
export function buildFinancingPlan(project: Project, household: Household, terms: LoanTerms): FinancingPlan {
  const { price, works, apport } = project;
  const notary = notaryFees({ price, isNew: isNew(project.propertyType), firstTimeBuyer: household.firstTimeBuyer });
  const fixedFees = terms.bankFees + terms.brokerFees;
  const needExGuarantee = price + works + notary.total + fixedFees;
  const g = guaranteeUpfrontRate(terms.guaranteeType);

  const ptz = terms.includePtz
    ? estimatePtz({
        zone: project.zone,
        propertyType: project.propertyType,
        firstTimeBuyer: household.firstTimeBuyer,
        householdSize: household.householdSize,
        rfr: household.rfr,
        price,
        works,
      })
    : noPtz(['disabled']);
  let ptzAmount = ptz.eligible ? ptz.amount : 0;

  let mainLoan = (needExGuarantee - apport - ptzAmount) / (1 - g);
  if (ptzAmount > 0 && ptzAmount > mainLoan) {
    mainLoan = Math.max(0, (needExGuarantee - apport) / (2 - g));
    ptzAmount = mainLoan;
  }
  let surplusApport = 0;
  if (mainLoan < 0) {
    surplusApport = -mainLoan * (1 - g);
    mainLoan = 0;
    ptzAmount = 0;
  }
  const guarantee = guaranteeCost(terms.guaranteeType, mainLoan);
  const totalCost = needExGuarantee + guarantee.upfront;
  return {
    price,
    works,
    notary,
    guarantee,
    bankFees: terms.bankFees,
    brokerFees: terms.brokerFees,
    totalCost,
    apport,
    mainLoan,
    ptz,
    ptzAmount,
    surplusApport,
  };
}

import { ptz as P } from '../config/defaults';
import type { PropertyType, Zone } from '../config/types';
import { isHouse, isNew } from '../config/types';

export interface PtzParams {
  familyCoefficient: number[];
  trancheCeilings: Record<Zone, [number, number, number, number]>;
  operationCeilingBase: Record<Zone, number>;
  operationCoefficient: number[];
  quotite: { neufApartment: number[]; neufHouse: number[]; ancienWithWorks: number[] };
  durations: [number, number][];
  ancienWorksZones: Zone[];
  ancienMinWorksShare: number;
  resourceFloorDivisor: number;
}

export const defaultPtzParams: PtzParams = {
  familyCoefficient: P.familyCoefficient.value,
  trancheCeilings: P.trancheCeilings.value,
  operationCeilingBase: P.operationCeilingBase.value,
  operationCoefficient: P.operationCoefficient.value,
  quotite: P.quotite.value,
  durations: P.durations.value,
  ancienWorksZones: P.ancienWorksZones.value,
  ancienMinWorksShare: P.ancienMinWorksShare.value,
  resourceFloorDivisor: P.resourceFloorDivisor.value,
};

export interface PtzInput {
  zone: Zone;
  propertyType: PropertyType;
  firstTimeBuyer: boolean;
  householdSize: number;
  /** Household revenu fiscal de référence of year N-2; null when unknown. */
  rfr: number | null;
  price: number;
  works: number;
}

export type PtzReason =
  | 'disabled'
  | 'notFirstTimeBuyer'
  | 'ancienNotInZone'
  | 'ancienWorksTooLow'
  | 'rfrMissing'
  | 'incomeTooHigh';

export interface PtzResult {
  eligible: boolean;
  reasons: PtzReason[];
  /** 1..4 when eligible. */
  tranche: number | null;
  /** Resources compared with the ceilings: max(RFR, cost ÷ 9). */
  resources: number;
  coefficient: number;
  /** Cost retained for the PTZ: min(operation cost, ceiling). */
  retainedCost: number;
  quotite: number;
  amount: number;
  totalMonths: number;
  deferralMonths: number;
  /** Payment after the deferral period (0 % interest, linear). */
  monthlyAfterDeferral: number;
}

const at = <T>(arr: T[], index: number): T => arr[Math.min(index, arr.length - 1)] as T;

/** Result used when the PTZ is switched off or not applicable. */
export const noPtz = (reasons: PtzReason[] = [], resources = 0, coefficient = 1): PtzResult => none(reasons, resources, coefficient);

const none = (reasons: PtzReason[], resources = 0, coefficient = 1): PtzResult => ({
  eligible: false,
  reasons,
  tranche: null,
  resources,
  coefficient,
  retainedCost: 0,
  quotite: 0,
  amount: 0,
  totalMonths: 0,
  deferralMonths: 0,
  monthlyAfterDeferral: 0,
});

/**
 * PTZ estimate. Eligible if first-time buyer, the property type is allowed in the zone,
 * and resources ÷ family coefficient fall under the tranche-4 ceiling.
 * Amount = quotité(tranche, type) × min(price + works, ceiling(zone, household)).
 * Note: the PTZ may not exceed the other loans; that cap is applied in the financing plan.
 */
export function estimatePtz(input: PtzInput, p: PtzParams = defaultPtzParams): PtzResult {
  const reasons: PtzReason[] = [];
  const operationCost = input.price + input.works;
  const size = Math.max(1, Math.round(input.householdSize));

  if (!input.firstTimeBuyer) reasons.push('notFirstTimeBuyer');

  let quotites: number[];
  if (isNew(input.propertyType)) {
    quotites = isHouse(input.propertyType) ? p.quotite.neufHouse : p.quotite.neufApartment;
  } else {
    quotites = p.quotite.ancienWithWorks;
    if (!p.ancienWorksZones.includes(input.zone)) reasons.push('ancienNotInZone');
    else if (operationCost <= 0 || input.works / operationCost < p.ancienMinWorksShare) reasons.push('ancienWorksTooLow');
  }

  if (input.rfr === null) reasons.push('rfrMissing');

  const coefficient = at(p.familyCoefficient, size - 1);
  const resources = Math.max(input.rfr ?? 0, operationCost / p.resourceFloorDivisor);
  const quotient = resources / coefficient;
  const ceilings = p.trancheCeilings[input.zone];
  const trancheIndex = ceilings.findIndex((c) => quotient <= c);
  if (input.rfr !== null && trancheIndex === -1) reasons.push('incomeTooHigh');

  if (reasons.length > 0) return none(reasons, resources, coefficient);

  const retainedCost = Math.min(operationCost, p.operationCeilingBase[input.zone] * at(p.operationCoefficient, size - 1));
  const quotite = at(quotites, trancheIndex);
  const amount = retainedCost * quotite;
  const [years, deferralYears] = at(p.durations, trancheIndex);
  const totalMonths = years * 12;
  const deferralMonths = deferralYears * 12;
  return {
    eligible: true,
    reasons: [],
    tranche: trancheIndex + 1,
    resources,
    coefficient,
    retainedCost,
    quotite,
    amount,
    totalMonths,
    deferralMonths,
    monthlyAfterDeferral: amount / (totalMonths - deferralMonths),
  };
}

/** PTZ payment in month k (1-based): 0 during deferral, then linear repayment. */
export function ptzPaymentInMonth(amount: number, totalMonths: number, deferralMonths: number, k: number): number {
  if (amount <= 0 || k <= deferralMonths || k > totalMonths) return 0;
  return amount / (totalMonths - deferralMonths);
}

/** PTZ capital still owed after month k. */
export function ptzCrdAfter(amount: number, totalMonths: number, deferralMonths: number, k: number): number {
  if (amount <= 0 || k >= totalMonths) return 0;
  if (k <= deferralMonths) return amount;
  return amount - (amount / (totalMonths - deferralMonths)) * (k - deferralMonths);
}

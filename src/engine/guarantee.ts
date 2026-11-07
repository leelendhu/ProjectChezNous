import { guarantee as G } from '../config/defaults';
import type { GuaranteeType } from '../config/types';

export interface GuaranteeParams {
  cautionUpfrontRate: number;
  cautionFmgShare: number;
  cautionRefundRate: number;
  hypothequeRate: number;
  ippdRate: number;
  mainleveeRate: number;
}

export const defaultGuaranteeParams: GuaranteeParams = {
  cautionUpfrontRate: G.cautionUpfrontRate.value,
  cautionFmgShare: G.cautionFmgShare.value,
  cautionRefundRate: G.cautionRefundRate.value,
  hypothequeRate: G.hypothequeRate.value,
  ippdRate: G.ippdRate.value,
  mainleveeRate: G.mainleveeRate.value,
};

export interface GuaranteeCost {
  /** Paid at signing. */
  upfront: number;
  /** Given back when the loan ends or is repaid (caution only). */
  refund: number;
  /** Charged to release the mortgage if the loan is repaid early (hypothèque / IPPD only). */
  earlyReleaseCost: number;
}

export function guaranteeCost(type: GuaranteeType, loanAmount: number, p: GuaranteeParams = defaultGuaranteeParams): GuaranteeCost {
  const loan = Math.max(0, loanAmount);
  switch (type) {
    case 'caution':
      return {
        upfront: loan * p.cautionUpfrontRate,
        refund: loan * p.cautionFmgShare * p.cautionRefundRate,
        earlyReleaseCost: 0,
      };
    case 'hypotheque':
      return { upfront: loan * p.hypothequeRate, refund: 0, earlyReleaseCost: loan * p.mainleveeRate };
    case 'ippd':
      return { upfront: loan * p.ippdRate, refund: 0, earlyReleaseCost: loan * p.mainleveeRate };
  }
}

/** Upfront cost per euro of loan (used to solve the loan size when fees depend on it). */
export function guaranteeUpfrontRate(type: GuaranteeType, p: GuaranteeParams = defaultGuaranteeParams): number {
  return guaranteeCost(type, 1, p).upfront;
}

import { notary as N } from '../config/defaults';

export interface NotaryParams {
  dmtoDepartmentRate: number;
  dmtoDepartmentRateFirstTime: number;
  dmtoCommuneRate: number;
  fraisAssietteRate: number;
  tpfNewRate: number;
  emolumentBrackets: { upTo: number; rate: number }[];
  vat: number;
  csiRate: number;
  csiMin: number;
  formalitiesAndDisbursements: number;
}

export const defaultNotaryParams: NotaryParams = {
  dmtoDepartmentRate: N.dmtoDepartmentRate.value,
  dmtoDepartmentRateFirstTime: N.dmtoDepartmentRateFirstTime.value,
  dmtoCommuneRate: N.dmtoCommuneRate.value,
  fraisAssietteRate: N.fraisAssietteRate.value,
  tpfNewRate: N.tpfNewRate.value,
  emolumentBrackets: N.emolumentBrackets.value,
  vat: N.vat.value,
  csiRate: N.csiRate.value,
  csiMin: N.csiMin.value,
  formalitiesAndDisbursements: N.formalitiesAndDisbursements.value,
};

export interface NotaryBreakdown {
  /** Transfer taxes (DMTO or TPF) and the CSI, collected for the State and local authorities. */
  taxes: number;
  /** The notary's regulated fee, VAT included. */
  emoluments: number;
  /** Formalities and out-of-pocket costs paid on your behalf. */
  disbursements: number;
  total: number;
  /** Share of price. */
  rate: number;
  detail: {
    dmtoDepartment: number;
    dmtoCommune: number;
    fraisAssiette: number;
    tpf: number;
    csi: number;
    emolumentsExVat: number;
    emolumentsVat: number;
  };
}

/** Progressive notary fee scale (excl. VAT). */
export function emolumentsExVat(price: number, brackets: NotaryParams['emolumentBrackets']): number {
  let fee = 0;
  let lower = 0;
  for (const { upTo, rate } of brackets) {
    if (price <= lower) break;
    fee += (Math.min(price, upTo) - lower) * rate;
    lower = upTo;
  }
  return fee;
}

export interface NotaryInput {
  price: number;
  isNew: boolean;
  firstTimeBuyer: boolean;
}

/**
 * Ancien: DMTO = price × (department rate + commune 1.2 %) + frais d'assiette on the department part.
 * Neuf (VEFA): taxe de publicité foncière 0.715 % instead of DMTO (VAT is already in the price).
 * Both: émoluments (progressive scale + VAT), CSI 0.10 %, formalities and disbursements.
 */
export function notaryFees({ price, isNew, firstTimeBuyer }: NotaryInput, p: NotaryParams = defaultNotaryParams): NotaryBreakdown {
  const deptRate = firstTimeBuyer ? p.dmtoDepartmentRateFirstTime : p.dmtoDepartmentRate;
  const dmtoDepartment = isNew ? 0 : price * deptRate;
  const dmtoCommune = isNew ? 0 : price * p.dmtoCommuneRate;
  const fraisAssiette = dmtoDepartment * p.fraisAssietteRate;
  const tpf = isNew ? price * p.tpfNewRate : 0;
  const csi = price > 0 ? Math.max(p.csiMin, price * p.csiRate) : 0;
  const emolumentsEx = emolumentsExVat(price, p.emolumentBrackets);
  const emolumentsVat = emolumentsEx * p.vat;
  const disbursements = price > 0 ? p.formalitiesAndDisbursements : 0;

  const taxes = dmtoDepartment + dmtoCommune + fraisAssiette + tpf + csi;
  const emoluments = emolumentsEx + emolumentsVat;
  const total = taxes + emoluments + disbursements;
  return {
    taxes,
    emoluments,
    disbursements,
    total,
    rate: price > 0 ? total / price : 0,
    detail: { dmtoDepartment, dmtoCommune, fraisAssiette, tpf, csi, emolumentsExVat: emolumentsEx, emolumentsVat },
  };
}

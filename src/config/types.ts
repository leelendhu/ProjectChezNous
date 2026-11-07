/** A default value with its provenance. Every regulatory or market figure uses this. */
export interface Sourced<T> {
  value: T;
  unit: string;
  source: string;
  url: string;
  /** ISO date the figure was checked. */
  retrieved: string;
  /** Why this value was chosen, simplifications made. */
  note?: string;
  /** Set when sources disagreed; explains which value was kept and why. */
  conflict?: string;
}

export type Zone = 'Abis' | 'A' | 'B1' | 'B2' | 'C';

export type PropertyType = 'ancienApartment' | 'neufApartment' | 'neufHouse' | 'ancienHouse';

export const isNew = (t: PropertyType): boolean => t === 'neufApartment' || t === 'neufHouse';
export const isHouse = (t: PropertyType): boolean => t === 'neufHouse' || t === 'ancienHouse';

export type GuaranteeType = 'caution' | 'hypotheque' | 'ippd';
export type InsuranceMode = 'initial' | 'crd';

export type InvestmentPreset = 'livretA' | 'fondsEuros' | 'etfPea' | 'custom';
export type GainsTaxMode = 'none' | 'assuranceVie' | 'pea' | 'pfu';

/** Slider range for an input. */
export interface Range {
  min: number;
  max: number;
  step: number;
}

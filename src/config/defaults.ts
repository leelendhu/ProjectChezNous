// Every regulatory and market figure used by the app, with its source.
// Retrieved 2026-11-07 unless stated. When sources disagreed, the more
// conservative value (the one that makes buying look costlier or a loan
// harder to get) was kept and the disagreement is recorded in `conflict`.
// The Assumptions panel is generated from this file.

import type { Sourced, Zone } from './types';

const D = '2026-11-07';

const s = <T>(
  value: T,
  unit: string,
  source: string,
  url: string,
  extra: Partial<Pick<Sourced<T>, 'note' | 'conflict' | 'retrieved'>> = {},
): Sourced<T> => ({ value, unit, source, url, retrieved: D, ...extra });

// ---------------------------------------------------------------------------
// Mortgage market
// ---------------------------------------------------------------------------

export const rates = {
  /** Average nominal fixed rate by duration in years, excluding insurance. */
  byDuration: s<Record<number, number>>(
    { 15: 0.0356, 20: 0.0376, 25: 0.0385 },
    'annual rate',
    'Pretto barometer, November 2026 (all profiles)',
    'https://www.pretto.fr/taux-immobilier/historique-taux-immobilier/2026/analyse-taux-immobilier-novembre-2026/',
    {
      note: 'Other durations are linearly interpolated; below 15 years the 15-year rate is used. Your own rate depends on income, apport and bank.',
      conflict: 'Meilleurtaux (26 Oct) 3.59 / 3.70 / 3.84 %, Cafpi lower. Pretto is the highest at 20 years, so it was kept.',
    },
  ),
  usury20yPlus: s(
    0.054,
    'annual rate (TAEG)',
    'Banque de France usury thresholds, Q4 2026 (fixed-rate loans ≥ 20 years)',
    'https://ymanci.fr/credit-immobilier/actualites/taux-usure-quatrieme-trimestre-2026/',
    { note: 'Applies 1 Oct – 31 Dec 2026. 10–20 years: 4.68 %; < 10 years: 4.09 %. Read via ymanci.fr / dbfranceinvest.' },
  ),
  usury10to20y: s(0.0468, 'annual rate (TAEG)', 'Banque de France usury thresholds, Q4 2026 (10 to < 20 years)', 'https://ymanci.fr/credit-immobilier/actualites/taux-usure-quatrieme-trimestre-2026/'),
  usuryUnder10y: s(0.0409, 'annual rate (TAEG)', 'Banque de France usury thresholds, Q4 2026 (< 10 years)', 'https://ymanci.fr/credit-immobilier/actualites/taux-usure-quatrieme-trimestre-2026/'),
};

// ---------------------------------------------------------------------------
// HCSF lending rules (decision D-HCSF-2021-7 as amended)
// ---------------------------------------------------------------------------

export const hcsf = {
  maxDebtRatio: s(
    0.35,
    'share of net income',
    'HCSF decision D-HCSF-2021-7, maintained for 2026',
    'https://www.pretto.fr/pret-immobilier/hcsf/',
    { note: 'Includes borrower insurance. Banks may exceed it for up to 20 % of their quarterly lending.' },
  ),
  maxYears: s(25, 'years', 'HCSF decision D-HCSF-2021-7', 'https://www.pretto.fr/pret-immobilier/hcsf/'),
  maxYearsWithDeferral: s(
    27,
    'years',
    'HCSF decision D-HCSF-2021-7 as amended (Dec 2023)',
    'https://www.pretto.fr/pret-immobilier/hcsf/',
    {
      note: '25 years + up to 2 years of deferral, for VEFA, house-building contracts, or ancien with works > 10 % of total cost, when you move in after the loan starts.',
      conflict: 'Some sources still quote a 25 % works threshold (pre-Dec 2023). Cafpi reports 10 % since the 4 Dec 2023 HCSF meeting; 10 % kept. See https://www.cafpi.fr/credit-immobilier/actualites/reunion-hscf-du-4-decembre-quelles-sont-les-nouvelles-mesures',
    },
  ),
  flexQuota: s(
    0.2,
    'share of quarterly new loans',
    'HCSF decision D-HCSF-2021-7',
    'https://www.pretto.fr/pret-immobilier/hcsf/',
    { note: 'At least 70 % of the flexible share must go to main-residence buyers, and 30 % of that to first-time buyers.' },
  ),
};

// ---------------------------------------------------------------------------
// Notary fees (frais de notaire)
// ---------------------------------------------------------------------------

export const notary = {
  dmtoDepartmentRate: s(
    0.05,
    'share of price',
    'Loi de finances 2025 art. 116 (optional +0.5 pt until 31 Mar 2028); Haute-Garonne listed at 5 % from 1 Apr 2025',
    'https://www.mysweetimmo.com/2025/03/18/frais-de-notaire-ces-departements-ou-ils-augmentent-au-1er-avril-2025/',
    {
      conflict: 'Several 2025–2026 lists give Haute-Garonne 5.00 %; one simulator still shows 4.50 %. The official deliberation was not found online; 5.00 % (costlier) kept.',
    },
  ),
  dmtoDepartmentRateFirstTime: s(
    0.045,
    'share of price',
    'Loi de finances 2025: first-time buyers of a main residence are exempt from the +0.5 pt increase',
    'https://www.legifiscal.fr/patrimoine-placements/investissement-immobilier/reduction-exoneration-droits-mutation-primo-accedants.html',
    { note: 'Condition: not owner of your main residence in the previous 2 years, and the home becomes your main residence.' },
  ),
  dmtoCommuneRate: s(0.012, 'share of price', 'CGI art. 1584 (taxe communale additionnelle)', 'https://www.pap.fr/calcul-frais-notaire'),
  fraisAssietteRate: s(
    0.0237,
    'share of the departmental tax',
    'CGI art. 1647 (frais d’assiette et de recouvrement)',
    'https://www.pap.fr/calcul-frais-notaire',
  ),
  /** New-build (VEFA): taxe de publicité foncière replaces DMTO. */
  tpfNewRate: s(
    0.00715,
    'share of price',
    'CGI art. 1594 F quinquies (reduced rate 0.70 % + frais d’assiette)',
    'https://edito.seloger.com/conseils-d-experts/acheter/combien-coutent-les-frais-de-notaire-sur-l-achat-d-une-maison-neuve-article-31948.html',
    { note: 'Applied to the price including VAT, a slight overestimate.' },
  ),
  emolumentBrackets: s(
    [
      { upTo: 6500, rate: 0.0387 },
      { upTo: 17000, rate: 0.01596 },
      { upTo: 60000, rate: 0.01064 },
      { upTo: Infinity, rate: 0.00799 },
    ],
    'rate per price bracket, excl. VAT',
    'Code de commerce art. A444-91; tariff renewed unchanged to 29 Feb 2028 by arrêté of 25 Feb 2026',
    'https://www.orpi.com/agmairie/frais-de-notaire-2026-calcul-bareme-et-simulateur',
    {
      note: 'Notaries may discount up to 20 % on the part above 100 000 €; not applied.',
      conflict: 'One site reports a ~2 % cut in the Feb 2026 arrêté; most report the tariff unchanged. Unchanged (higher) kept.',
    },
  ),
  vat: s(0.2, 'share', 'CGI art. 278 (standard VAT)', 'https://www.mesfraisnotaire.fr/bareme-emoluments-notaire'),
  csiRate: s(0.001, 'share of price', 'CGI art. 879 (contribution de sécurité immobilière)', 'https://www.pap.fr/calcul-frais-notaire', { note: 'Minimum 15 €.' }),
  csiMin: s(15, '€', 'CGI art. 879', 'https://www.pap.fr/calcul-frais-notaire'),
  formalitiesAndDisbursements: s(
    1200,
    '€',
    'Typical formalities fees + débours (cadastre, town planning, copro documents)',
    'https://www.pap.fr/calcul-frais-notaire',
    { note: 'Varies by file; 800–1 500 € is common. Rounded up.' },
  ),
};

// ---------------------------------------------------------------------------
// Loan guarantee
// ---------------------------------------------------------------------------

export const guarantee = {
  cautionUpfrontRate: s(
    0.013,
    'share of loan',
    'Crédit Logement examples via Empruntis (200 000 € loan → 650 € commission + 2 010 € FMG)',
    'https://www.empruntis.com/financement/guide/caution-credit-logement/cout-caution-credit-logement.php',
    { note: 'Paid at signing. Of this, the mutual-guarantee fund part (FMG, ~1.0 % of the loan) is partly refunded at the end of the loan.' },
  ),
  cautionFmgShare: s(0.01, 'share of loan', 'Crédit Logement example via Empruntis', 'https://www.empruntis.com/financement/guide/caution-credit-logement/cout-caution-credit-logement.php'),
  cautionRefundRate: s(
    0.6,
    'share of FMG',
    'Crédit Logement refund rate, historically 60–75 % (≈65 % in 2026)',
    'https://www.empruntis.com/financement/guide-immobilier/garantie-pret-immobilier/garantie-credit-logement/garantie-remboursement-credit-logement/',
    { conflict: 'Sources cite 65 %, 72.5 % and 75 %. Lowest of the historical range (60 %) kept.' },
  ),
  hypothequeRate: s(
    0.015,
    'share of loan',
    'Conventional mortgage, notary-registered: ~1.5–2 % of the loan',
    'https://www.pretto.fr/pret-immobilier/garantie/cout-hypotheque',
  ),
  ippdRate: s(
    0.01,
    'share of loan',
    'Hypothèque légale spéciale du prêteur de deniers (ex-PPD): ~0.5–1 %, no publicité foncière tax',
    'https://www.cafpi.fr/credit-immobilier/garanties/privilege-preteur-deniers',
    { note: 'Only covers the part of the loan that pays for an existing property (not VEFA, not works).' },
  ),
  mainleveeRate: s(
    0.005,
    'share of initial loan',
    'Mainlevée (release) if the loan is repaid early: ~0.3–0.8 % of the initial loan',
    'https://www.pap.fr/acheteur/credit-immobilier/credit-et-hypotheque-c-est-quoi-les-frais-de-mainlevee/a19957',
  ),
};

export const fees = {
  bankFileFees: s(1000, '€', 'Assumption: typical bank file fees (500–1 500 €)', ''),
  brokerFees: s(0, '€', 'Optional; often 1–2 % of the loan or a flat fee', ''),
};

// ---------------------------------------------------------------------------
// Borrower insurance
// ---------------------------------------------------------------------------

export const insurance = {
  ratePerBorrower: s(
    0.0013,
    'share of initial capital per year',
    'Meilleurtaux average by age: ~0.13 % at 35, non-smoker (Selectra: 0.12 % for 25–35)',
    'https://www.meilleurtaux.com/assurance-de-pret/le-guide-de-l-assurance-de-pret/taux-assurance-pret-immobilier/taux-d-assurance-emprunteur-selon-age.html',
    {
      note: 'Default for borrowers aged ~30–35 with an external insurer (délégation). Bank group contracts are often 0.30 % or more.',
      conflict: 'Range 0.08 % (délégation, Finalib) to 0.15 % (Prolead 30–40). Upper-middle 0.13 % kept.',
    },
  ),
};

// ---------------------------------------------------------------------------
// PTZ (prêt à taux zéro) — CCH art. D31-10-1 and following
// ---------------------------------------------------------------------------

export interface PtzTranche {
  /** Max resources ÷ family coefficient for this tranche. */
  ceiling: number;
}

export const ptz = {
  endDate: s('2027-12-31', 'date', 'Loi de finances 2024 (n° 2023-1322) art. 71; notaires.fr', 'https://www.notaires.fr/fr/actualites/le-pret-taux-zero-ptz-est-prolonge-jusquau-31-decembre-2027'),
  toulouseZone: s<Zone>(
    'A',
    'zone',
    'Arrêté of 2 Oct 2023 reclassifying Toulouse from B1 to A (Blagnac, Colomiers, L’Union, Labège followed on 5 Jul 2024)',
    'https://www.ecologie.gouv.fr/politiques-publiques/zonage-b-c',
    {
      conflict: 'Older pages and the project brief say B1. Several 2024–2026 sources say A since Oct 2023; the 23 Jun 2026 arrêté commune list could not be read. Zone A kept; the zone stays editable.',
    },
  ),
  /** Family coefficient by household size (index 0 = 1 person, last = 8+). */
  familyCoefficient: s(
    [1, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3],
    'multiplier',
    'CCH art. D31-10-9 (décret 2024-304, as amended by décret 2025-299)',
    'https://www.stop-loyer.fr/blog/plafonds-ptz-2026',
  ),
  /** Tranche ceilings on resources ÷ coefficient. Tranche 4 ceiling = eligibility limit. */
  trancheCeilings: s<Record<Zone, [number, number, number, number]>>(
    {
      Abis: [25000, 31000, 37000, 49000],
      A: [25000, 31000, 37000, 49000],
      B1: [21500, 26000, 30000, 34500],
      B2: [18000, 22500, 27000, 31500],
      C: [15000, 19500, 24000, 28500],
    },
    '€ of RFR ÷ family coefficient',
    'CCH art. D31-10-9; scales unchanged in 2026 (LFI 2026 did not revalue them)',
    'https://www.pretto.fr/pret-immobilier/pret-taux-zero-ptz/plafonds-ptz-2026/',
    {
      conflict: 'Some 2026 pages print revalued ceilings (+8–13 %) from the draft budget; Pretto, Stop-loyer and others report they were not adopted. Unrevalued (stricter) scale kept.',
    },
  ),
  /** Max operation cost retained, 1 person; multiplied by coefficient (capped at 5 persons). */
  operationCeilingBase: s<Record<Zone, number>>(
    { Abis: 150000, A: 150000, B1: 135000, B2: 110000, C: 100000 },
    '€',
    'CCH art. D31-10-10',
    'https://www.stop-loyer.fr/baremes-ptz-2026',
    { note: 'B1 cross-check: 135 000 / 202 500 / 243 000 / 283 500 / 324 000 € for 1–5 persons.' },
  ),
  operationCoefficient: s([1, 1.5, 1.8, 2.1, 2.4], 'multiplier', 'CCH art. D31-10-10', 'https://www.stop-loyer.fr/baremes-ptz-2026', { note: '5 persons and more use 2.4.' }),
  /** Share of the retained cost financed by PTZ, per tranche 1..4. */
  quotite: s(
    {
      neufApartment: [0.5, 0.4, 0.4, 0.2],
      neufHouse: [0.3, 0.2, 0.2, 0.1],
      ancienWithWorks: [0.5, 0.4, 0.4, 0.2],
    },
    'share of retained cost',
    'Décret 2025-299 (from 1 Apr 2025): new houses eligible in all zones with lower quotités',
    'https://www.stop-loyer.fr/baremes-ptz-2026',
  ),
  /** [total years, deferral years] per tranche. */
  durations: s<[number, number][]>(
    [
      [25, 10],
      [20, 8],
      [15, 2],
      [10, 0],
    ],
    '[total years, deferral years]',
    'CCH art. D31-10-11 as amended by décret 2024-304',
    'https://www.stop-loyer.fr/baremes-ptz-2026',
    { conflict: 'One older source gives 15 years of deferral for tranche 1 (pre-2024 rules). Current scale kept.' },
  ),
  ancienWorksZones: s<Zone[]>(['B2', 'C'], 'zones', 'Loi de finances 2024: ancien with works only in B2 and C', 'https://www.pretto.fr/pret-immobilier/pret-taux-zero-ptz/changements-ptz-2026/'),
  ancienMinWorksShare: s(0.25, 'share of total operation cost', 'CCH art. D31-10-3', 'https://www.stop-loyer.fr/blog/ptz-ancien-travaux-zones-b2-c-conditions-meconnues-28-avril-2026'),
  resourceFloorDivisor: s(9, 'divisor', 'CCH art. L31-10-5: resources retained are at least the operation cost ÷ 9', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F10871'),
  simulatorUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R2974',
  infoUrl: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F10871',
  zoneCheckerUrl: 'https://www.service-public.gouv.fr/particuliers/actualites/A16863',
};

// ---------------------------------------------------------------------------
// Toulouse market
// ---------------------------------------------------------------------------

export const market = {
  pricePerM2: s(
    { ancienApartment: 3179, neufApartment: 4727, ancienHouse: 3389, neufHouse: 4100 },
    '€/m²',
    'iad France, Toulouse medians 2026 (new house: estimate)',
    'https://blog.iadfrance.fr/actualites/prix-au-m2-a-toulouse-quels-sont-les-prix-de-l-immobilier-en-2026/',
    {
      note: 'New-house price has no reliable Toulouse median; ~4 100 €/m² is an estimate between ancien houses and new apartments.',
      conflict: 'SeLoger/MeilleursAgents (Jul 2026): apartments 3 564 €/m², houses 4 055 €/m². Prices vary strongly by neighbourhood.',
    },
  ),
  rentPerM2: s(
    { apartment: 15.2, house: 12.6 },
    '€/m²/month',
    'SeLoger / MeilleursAgents, Toulouse, July 2026 (via MoneyVox)',
    'https://www.moneyvox.fr/immobilier/actualites/109317/immobilier-a-toulouse-tout-savoir-sur-les-prix-a-achat-et-la-location-en-juin-2026',
  ),
  taxeFoncierePerM2: s(
    24,
    '€/m²/year',
    'Toulouse estimates: ~1 550 € for a 65 m² T3 (calcunet), 1 750 € for 55 m² (other page)',
    'https://calcunet.fr/articles/taxe-fonciere-toulouse-taux-2026/',
    {
      note: 'Depends on the cadastral rental value, not the price. Check the seller’s tax notice. New builds may get a partial 2-year exemption depending on the commune; not applied.',
      conflict: 'Estimates range 1 550–1 900 € for ~60–65 m². 24 €/m² ≈ 1 510 € for 63 m², the middle.',
    },
  ),
  coproPerM2Year: s(
    25,
    '€/m²/year',
    'Toulouse ~26 €/m²/year (copro register, Dec 2023); France 25–30 €/m²/year (2026)',
    'https://www.investissement-locatif.com/immobilier/charges-de-copropriete.html',
    { note: 'Zero for a detached house. Buildings with lifts, heating or a caretaker cost more.' },
  ),
};

// ---------------------------------------------------------------------------
// Rent vs buy assumptions
// ---------------------------------------------------------------------------

export const rentVsBuy = {
  rentGrowth: s(
    0.015,
    'per year',
    'INSEE IRL Q2 2026: +1.15 % year on year; long-run IRL ≈ inflation',
    'https://www.insee.fr/fr/statistiques/9022797',
    { note: 'Rent increases on a running lease are capped by the IRL; new leases can reset higher.' },
  ),
  appreciation: s(0.015, 'per year', 'Assumption (brief): long-run nominal, close to inflation. Toulouse prices were roughly flat 2024–2026.', 'https://www.moneyvox.fr/immobilier/actualites/109317/immobilier-a-toulouse-tout-savoir-sur-les-prix-a-achat-et-la-location-en-juin-2026'),
  inflation: s(
    0.02,
    'per year',
    'Banque de France projections Sept 2026: 2.3 % in 2026, easing afterwards; ECB target 2 %',
    'https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques-intermediaires-septembre-2026',
  ),
  maintenance: s(
    { ancien: 0.01, neuf: 0.005 },
    'share of property value per year',
    'Assumption: common rule of thumb (brief); new builds are covered by 10-year and 2-year warranties',
    '',
  ),
  ownerHomeInsurance: s(250, '€/year', 'Multirisque habitation, owner-occupier, ~60 m² apartment (assumption)', ''),
  renterHomeInsurance: s(170, '€/year', 'Multirisque habitation, tenant, ~60 m² apartment (assumption)', ''),
  sellingCosts: s(0.05, 'share of sale price', 'Assumption: typical agency fee (brief); 3–7 % in practice', ''),
  worksValueShare: s(0.5, 'share of works budget', 'Assumption: half the renovation spend shows up in the sale price', '', { note: 'No reliable source; adjust to taste.' }),
  earlyRepaymentPenalty: s(
    { monthsInterest: 6, capOfCrd: 0.03 },
    'rule',
    'Code de la consommation: IRA ≤ min(6 months of interest, 3 % of remaining capital)',
    'https://www.economie.gouv.fr/particuliers/rembourser-credit-immobilier-avant-terme-anticipation',
    { note: 'Not due if the sale follows a job change, death or forced job loss. Many loans waive it; on by default (costlier).' },
  ),
  horizonYears: s(10, 'years', 'Default exploration horizon', ''),
};

// ---------------------------------------------------------------------------
// Investment returns & tax on gains
// ---------------------------------------------------------------------------

export const investment = {
  livretA: s(0.017, 'per year', 'Livret A rate since 1 Aug 2026 (1.5 % Feb–Jul 2026); next revision 1 Feb 2027', 'https://www.moneyvox.fr/livret-a/actualites/109703/1-7-au-1er-aout-apres-six-mois-a-1-5-comment-calculer-vos-interets-2026-simulateur'),
  fondsEuros: s(
    0.0263,
    'per year, net of fees, before social charges',
    'ACPR annual report (30 Jun 2026): 2025 average 2.63 %; France Assureurs 2.6 %',
    'https://www.moneyvox.fr/assurance-vie/actualites/108096/le-taux-moyen-reste-a-2-63-en-2025-comme-en-2024-selon-acpr',
  ),
  etfPea: s(
    0.05,
    'per year, nominal, net of fees',
    'Assumption: diversified global equity ETF long-run nominal return (brief: 5–6 %)',
    '',
    { note: 'Lower end of the 5–6 % range kept. Equity returns are volatile; a 10-year period can be negative.' },
  ),
  socialCharges: s(0.186, 'share of gains', 'LFSS 2026: CSG +1.4 pt on capital income from 1 Jan 2026 (17.2 % → 18.6 %)', 'https://www.auguste-patrimoine.fr/blog/pea-et-hausse-de-la-csg-en-2026-impact-calcul-et-strategies-de-retrait'),
  socialChargesAssuranceVie: s(0.172, 'share of gains', 'LFSS 2026: assurance-vie excluded from the CSG increase', 'https://blog.nalo.fr/flat-tax-placements/'),
  pfu: s(0.314, 'share of gains', 'PFU 2026: 12.8 % income tax + 18.6 % social charges', 'https://blog.nalo.fr/flat-tax-placements/'),
  assuranceVieAfter8y: s(
    0.247,
    'share of gains',
    'Assurance-vie after 8 years: 7.5 % income tax + 17.2 % social charges (couple allowance of 9 200 €/year ignored)',
    'https://blog.nalo.fr/flat-tax-placements/',
    { note: 'Simplified; the yearly allowance makes the real rate lower for small gains.' },
  ),
  assuranceVieBefore8y: s(0.3, 'share of gains', 'Assurance-vie before 8 years: 12.8 % + 17.2 %', 'https://blog.nalo.fr/flat-tax-placements/'),
  peaMinYears: s(5, 'years', 'PEA: income-tax exemption after 5 years', 'https://www.auguste-patrimoine.fr/blog/pea-et-hausse-de-la-csg-en-2026-impact-calcul-et-strategies-de-retrait'),
};

export const sources = { rates, hcsf, notary, guarantee, fees, insurance, ptz, market, rentVsBuy, investment };

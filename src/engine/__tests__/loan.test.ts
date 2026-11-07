import { describe, expect, it } from 'vitest';
import { monthlyPayment, principalFromPayment, rateForDuration } from '../annuity';
import { amortize, totals, yearly } from '../amortization';
import { capacityAt, capacityTimeline, maxPrincipal } from '../capacity';
import { countedExistingPayments, monthlyIncome } from '../debtRatio';
import { buildFinancingPlan } from '../financingPlan';
import { guaranteeCost } from '../guarantee';
import { insuranceForMonth } from '../insurance';
import { analyzeLoan } from '../loan';
import { emolumentsExVat, notaryFees, defaultNotaryParams } from '../notary';
import { estimatePtz, ptzCrdAfter, ptzPaymentInMonth } from '../ptz';
import { taeg } from '../taeg';
import { baseLoanInput } from './fixtures';

describe('annuity payment', () => {
  it('matches published examples within 1 €', () => {
    expect(Math.abs(monthlyPayment(300000, 0.0376, 240) - 1780)).toBeLessThan(1);
    expect(Math.abs(monthlyPayment(250000, 0.0376, 240) - 1484)).toBeLessThan(1);
  });

  it('handles a zero rate', () => {
    expect(monthlyPayment(120000, 0, 240)).toBe(500);
  });

  it('principalFromPayment is the inverse', () => {
    const m = monthlyPayment(187654, 0.0385, 300);
    expect(principalFromPayment(m, 0.0385, 300)).toBeCloseTo(187654, 6);
  });

  it('interpolates the rate table by duration', () => {
    const table = { 15: 0.0356, 20: 0.0376, 25: 0.0385 };
    expect(rateForDuration(20, table)).toBe(0.0376);
    expect(rateForDuration(22, table)).toBeCloseTo(0.0376 + (0.0009 * 2) / 5, 10);
    expect(rateForDuration(10, table)).toBe(0.0356);
    expect(rateForDuration(27, table)).toBe(0.0385);
  });
});

describe('amortization', () => {
  const loan = { principal: 250000, annualRate: 0.0376, months: 240, insurance: { mode: 'initial' as const, borrowers: [] } };
  const rows = amortize(loan);

  it('reaches zero capital at term', () => {
    expect(rows).toHaveLength(240);
    expect(rows[239]!.crd).toBe(0);
  });

  it('principal repaid sums to the loan', () => {
    expect(totals(rows).principal).toBeCloseTo(250000, 6);
  });

  it('rolls up into 20 years', () => {
    const y = yearly(rows);
    expect(y).toHaveLength(20);
    expect(y[0]!.interest).toBeGreaterThan(y[19]!.interest);
    expect(y[19]!.crd).toBe(0);
  });

  it('insurance on initial capital is constant; on CRD it declines', () => {
    const borrowers = [
      { rate: 0.0013, quotite: 0.5 },
      { rate: 0.0013, quotite: 0.5 },
    ];
    expect(insuranceForMonth({ mode: 'initial', borrowers }, 200000, 100000)).toBeCloseTo(21.6667, 3);
    const crdRows = amortize({ ...loan, principal: 200000, insurance: { mode: 'crd', borrowers } });
    expect(crdRows[0]!.insurance).toBeCloseTo(21.6667, 3);
    expect(crdRows[200]!.insurance).toBeLessThan(crdRows[0]!.insurance);
  });
});

describe('notary fees', () => {
  it('applies the progressive émoluments scale', () => {
    expect(emolumentsExVat(200000, defaultNotaryParams.emolumentBrackets)).toBeCloseTo(1995.25, 2);
  });

  it('ancien: DMTO 6.2 % + assiette, about 8 % in total', () => {
    const f = notaryFees({ price: 200000, isNew: false, firstTimeBuyer: false });
    expect(f.taxes).toBeCloseTo(12837, 0);
    expect(f.emoluments).toBeCloseTo(2394.3, 1);
    expect(f.disbursements).toBe(1200);
    expect(f.rate).toBeGreaterThan(0.07);
    expect(f.rate).toBeLessThan(0.085);
  });

  it('first-time buyers skip the 2025 +0.5 pt department increase', () => {
    const regular = notaryFees({ price: 200000, isNew: false, firstTimeBuyer: false });
    const primo = notaryFees({ price: 200000, isNew: false, firstTimeBuyer: true });
    expect(regular.total - primo.total).toBeCloseTo(200000 * 0.005 * 1.0237, 2);
  });

  it('neuf: reduced publicité foncière, 2–3 % in total', () => {
    const f = notaryFees({ price: 200000, isNew: true, firstTimeBuyer: false });
    expect(f.detail.dmtoDepartment).toBe(0);
    expect(f.taxes).toBeCloseTo(1630, 0);
    expect(f.rate).toBeGreaterThan(0.02);
    expect(f.rate).toBeLessThan(0.03);
  });
});

describe('guarantee', () => {
  it('caution refunds part of the FMG', () => {
    const g = guaranteeCost('caution', 200000);
    expect(g.upfront).toBeCloseTo(2600, 6);
    expect(g.refund).toBeCloseTo(1200, 6);
  });

  it('mortgage has a release cost if repaid early', () => {
    const g = guaranteeCost('hypotheque', 200000);
    expect(g.upfront).toBeCloseTo(3000, 6);
    expect(g.earlyReleaseCost).toBeCloseTo(1000, 6);
  });
});

describe('PTZ', () => {
  const base = { zone: 'A' as const, propertyType: 'neufApartment' as const, firstTimeBuyer: true, householdSize: 2, rfr: 40000, price: 250000, works: 0 };

  it('new apartment in zone A, tranche 2', () => {
    const r = estimatePtz(base);
    expect(r.eligible).toBe(true);
    expect(r.tranche).toBe(2);
    expect(r.retainedCost).toBe(225000);
    expect(r.amount).toBeCloseTo(90000, 6);
    expect(r.deferralMonths).toBe(96);
    expect(r.monthlyAfterDeferral).toBeCloseTo(625, 6);
  });

  it('new house gets a lower quotité', () => {
    expect(estimatePtz({ ...base, propertyType: 'neufHouse' }).quotite).toBe(0.2);
  });

  it('ancien is not eligible in zone A', () => {
    const r = estimatePtz({ ...base, propertyType: 'ancienApartment', works: 80000 });
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain('ancienNotInZone');
  });

  it('ancien with ≥ 25 % works is eligible in zone B2', () => {
    const r = estimatePtz({ ...base, zone: 'B2', propertyType: 'ancienApartment', householdSize: 1, rfr: 20000, price: 140000, works: 60000 });
    expect(r.eligible).toBe(true);
    expect(r.tranche).toBe(2);
    expect(r.amount).toBeCloseTo(44000, 6);
    expect(estimatePtz({ ...base, zone: 'B2', propertyType: 'ancienApartment', rfr: 20000, works: 10000 }).reasons).toContain('ancienWorksTooLow');
  });

  it('income above the ceiling is ineligible', () => {
    const r = estimatePtz({ ...base, rfr: 80000 });
    expect(r.eligible).toBe(false);
    expect(r.reasons).toEqual(['incomeTooHigh']);
  });

  it('requires first-time buyer status and a known RFR', () => {
    expect(estimatePtz({ ...base, firstTimeBuyer: false }).reasons).toContain('notFirstTimeBuyer');
    expect(estimatePtz({ ...base, rfr: null }).reasons).toContain('rfrMissing');
  });

  it('resources are at least operation cost ÷ 9', () => {
    const r = estimatePtz({ ...base, householdSize: 1, rfr: 10000, price: 300000 });
    expect(r.resources).toBeCloseTo(300000 / 9, 6);
  });

  it('repays nothing during deferral, then linearly to zero', () => {
    expect(ptzPaymentInMonth(90000, 240, 96, 96)).toBe(0);
    expect(ptzPaymentInMonth(90000, 240, 96, 97)).toBeCloseTo(625, 6);
    expect(ptzCrdAfter(90000, 240, 96, 96)).toBe(90000);
    expect(ptzCrdAfter(90000, 240, 96, 240)).toBe(0);
  });
});

describe('financing plan', () => {
  it('uses equal resources', () => {
    const input = baseLoanInput();
    const plan = buildFinancingPlan(input.project, input.household, input.terms);
    expect(plan.apport + plan.mainLoan + plan.ptzAmount).toBeCloseTo(plan.totalCost, 6);
    expect(plan.guarantee.upfront).toBeCloseTo(plan.mainLoan * 0.013, 6);
  });

  it('caps the PTZ at the main loan amount', () => {
    const input = baseLoanInput({
      household: { ...baseLoanInput().household, firstTimeBuyer: true, rfr: 30000 },
      project: { ...baseLoanInput().project, propertyType: 'neufApartment', price: 200000, apport: 150000 },
      terms: { ...baseLoanInput().terms, includePtz: true },
    });
    const plan = buildFinancingPlan(input.project, input.household, input.terms);
    expect(plan.ptz.amount).toBeGreaterThan(plan.ptzAmount);
    expect(plan.ptzAmount).toBeCloseTo(plan.mainLoan, 6);
    expect(plan.apport + plan.mainLoan + plan.ptzAmount).toBeCloseTo(plan.totalCost, 6);
  });

  it('reports surplus apport when no loan is needed', () => {
    const input = baseLoanInput({ project: { ...baseLoanInput().project, apport: 300000 } });
    const plan = buildFinancingPlan(input.project, input.household, input.terms);
    expect(plan.mainLoan).toBe(0);
    expect(plan.surplusApport).toBeGreaterThan(0);
  });
});

describe('debt ratio and borrowing capacity', () => {
  it('averages 13th-month salaries', () => {
    const h = baseLoanInput().household;
    expect(monthlyIncome({ ...h, borrowers: [{ netMonthly: 2400, monthsPerYear: 13, age: 30 }] })).toBeCloseTo(2600, 6);
  });

  it('can ignore loans ending soon (bank-dependent)', () => {
    const loans = [{ label: 'car', monthlyPayment: 300, monthsRemaining: 5 }];
    expect(countedExistingPayments(loans, 0)).toBe(300);
    expect(countedExistingPayments(loans, 6)).toBe(0);
    expect(countedExistingPayments(loans, 0, 5)).toBe(0);
  });

  it('max principal is the inverse of the payment function', () => {
    const p = maxPrincipal({ income: 5000, maxDebtRatio: 0.35, existingCounted: 300, otherNewPayments: 0, annualRate: 0.0376, months: 240, insurancePerEuro: 0 });
    expect(monthlyPayment(p, 0.0376, 240)).toBeCloseTo(1450, 6);
  });

  it('includes insurance in the 35 % budget', () => {
    const args = { income: 5000, maxDebtRatio: 0.35, existingCounted: 0, otherNewPayments: 0, annualRate: 0.0376, months: 240 };
    const p = maxPrincipal({ ...args, insurancePerEuro: 0.0026 / 12 });
    expect(monthlyPayment(p, 0.0376, 240) + (p * 0.0026) / 12).toBeCloseTo(1750, 6);
  });

  it('max price lands exactly on the 35 % cap, existing loans included', () => {
    const input = baseLoanInput({ existingLoans: [{ label: 'car', monthlyPayment: 300, monthsRemaining: 18 }] });
    const cap = capacityAt(input, 0);
    const a = analyzeLoan({ ...input, project: { ...input.project, price: cap.maxPrice } });
    expect(a.debtRatio).toBeLessThanOrEqual(0.35 + 1e-9);
    expect(a.debtRatio).toBeGreaterThan(0.3499);
  });

  it('capacity rises once the existing loan ends', () => {
    const input = baseLoanInput({ existingLoans: [{ label: 'car', monthlyPayment: 300, monthsRemaining: 18 }] });
    const [today, after] = capacityTimeline(input);
    expect(after!.atMonth).toBe(18);
    expect(after!.endedLoans).toEqual(['car']);
    expect(after!.maxPrincipal - today!.maxPrincipal).toBeCloseTo(principalFromPayment(300, 0.0376, 240), 3);
    expect(after!.maxPrice).toBeGreaterThan(today!.maxPrice);
  });

  it('the ignore window brings the capacity step forward', () => {
    const input = baseLoanInput({
      existingLoans: [{ label: 'car', monthlyPayment: 300, monthsRemaining: 18 }],
      rules: { maxDebtRatio: 0.35, ignoreLoansEndingWithinMonths: 6 },
    });
    expect(capacityTimeline(input)[1]!.atMonth).toBe(12);
  });
});

describe('analyzeLoan', () => {
  it('flags a debt ratio above the cap', () => {
    const a = analyzeLoan(baseLoanInput({ project: { ...baseLoanInput().project, price: 400000 } }));
    expect(a.debtRatio).toBeGreaterThan(0.35);
    expect(a.warnings.map((w) => w.code)).toContain('dtiAbove');
  });

  it('shows the existing loan dropping off and the mortgage starting', () => {
    const input = baseLoanInput({
      existingLoans: [{ label: 'car', monthlyPayment: 300, monthsRemaining: 10 }],
      project: { ...baseLoanInput().project, monthsUntilPurchase: 4 },
    });
    const t = analyzeLoan(input).debtTimeline;
    expect(t).toHaveLength(36);
    expect(t[9]!.existing).toBe(300);
    expect(t[10]!.existing).toBe(0);
    expect(t[3]!.mortgage).toBe(0);
    expect(t[4]!.mortgage).toBeGreaterThan(0);
  });

  it('total cost of credit adds interest, insurance, net guarantee and fees', () => {
    const input = baseLoanInput({ terms: { ...baseLoanInput().terms, bankFees: 1000 } });
    const a = analyzeLoan(input);
    expect(a.cost.total).toBeCloseTo(a.cost.interest + a.cost.insurance + a.cost.guarantee - a.cost.guaranteeRefund + 1000, 6);
  });
});

describe('TAEG', () => {
  it('equals the actuarial nominal rate without fees or insurance', () => {
    const rows = amortize({ principal: 200000, annualRate: 0.0376, months: 240, insurance: { mode: 'initial', borrowers: [] } });
    expect(taeg(200000, rows.map((r) => r.payment))).toBeCloseTo(Math.pow(1 + 0.0376 / 12, 12) - 1, 8);
  });

  it('rises with upfront fees', () => {
    const rows = amortize({ principal: 200000, annualRate: 0.0376, months: 240, insurance: { mode: 'initial', borrowers: [] } });
    expect(taeg(197000, rows.map((r) => r.payment))).toBeGreaterThan(0.0383);
  });
});

# Methodology

This note explains, in plain English, every calculation the tool makes and every assumption behind it, so that someone sceptical of the results can check them. All figures and their sources are in `src/config/defaults.ts` and in the app's Assumptions panel (checked 7 November 2026). Where sources disagreed, the more cautious value was kept.

The tool is educational. It shows the consequences of assumptions; it does not predict the future or recommend a decision.

---

## 1. The loan

### Income
Average net monthly income = Σ (net monthly salary × salaries per year ÷ 12) + other stable income. "Net" means net before income tax, the figure French banks use. A 13th month is averaged over 12.

### Monthly payment
A fixed-rate French mortgage repays a constant amount each month (an annuity):

M = P · r / (1 − (1 + r)^−n)

where P is the amount borrowed, r = annual rate ÷ 12, n = number of months. With 300 000 € over 20 years at 3.76 %, M ≈ 1 780 €. Each month, interest = remaining capital × r and the rest of M repays capital. The last month absorbs rounding so the capital owed ends at exactly 0.

### Borrower insurance
Per borrower: capital × yearly rate × quotité ÷ 12. Two modes:
- **Initial capital**: charged on the amount borrowed, constant every month (most bank contracts).
- **Remaining capital**: charged on what is still owed, so it falls over time (many external contracts).

Default: 0.13 % per borrower at 50 % + 50 %, typical for 30–35-year-old non-smokers with an external insurer.

### Debt ratio (HCSF rules)
Debt ratio = all monthly loan payments, insurance included ÷ net monthly income. The HCSF (Haut Conseil de stabilité financière) caps it at 35 % and the duration at 25 years (27 years with up to 2 years of deferral for off-plan purchases, house construction, or older homes with works above 10 % of the cost). Banks may exceed these limits for 20 % of their quarterly lending, mostly reserved for main residences and first-time buyers. The tool lets you raise the 35 % threshold to explore, and flags that you did.

Existing loans count in full, unless you set "banks ignore loans ending within N months": a bank-dependent practice, 0 by default.

When a PTZ is included, the tool uses the **peak** month (main loan + PTZ once its deferral ends). Banks often smooth the two loans ("lissage") so the total stays flat, which gives a lower ratio. The peak is the cautious view.

### Borrowing capacity
Available payment A = 35 % × income − counted existing payments − PTZ peak payment.
Max loan = A ÷ (payment per € borrowed + insurance per € borrowed).

Then the max purchase price: notary fees, the guarantee and the PTZ all depend on the price, so the tool tries prices (bisection) until the loan needed (price + works + fees − apport − PTZ) equals the max loan.

"Capacity once your existing loan ends" repeats this without that loan, dated from today.

### Notary fees (frais de notaire)
Mostly taxes, not the notary's income.

**Older home (ancien)**
- Department transfer tax (DMTO): 5.00 % in Haute-Garonne since 1 April 2025 (the 2025 budget law allowed +0.5 pt until 31 March 2028). First-time buyers of a main residence are exempt from the increase and pay 4.50 %.
- Commune tax: 1.20 %.
- Collection fee: 2.37 % of the department tax.
- Notary's regulated fee (émoluments), excl. VAT: 3.870 % up to 6 500 €, 1.596 % to 17 000 €, 1.064 % to 60 000 €, 0.799 % above; plus 20 % VAT. Tariff renewed unchanged to February 2028.
- Contribution de sécurité immobilière: 0.10 % (minimum 15 €).
- Formalities and disbursements: about 1 200 €.

Total ≈ 8 % for a 200 000 € home.

**New build (neuf, VEFA)**: the transfer taxes are replaced by a reduced publicité foncière of 0.715 %, so the total is about 2.5–3 %.

Sources disagreed on Haute-Garonne's rate (most lists say 5.00 %, one simulator 4.50 %); 5.00 % was kept.

### Guarantee
- **Caution** (Crédit Logement style): about 1.3 % of the loan at signing. Of this, the mutual-fund part (≈ 1 % of the loan) is partly refunded at the end; 60 % refund assumed (sources range 60–75 %).
- **Hypothèque**: about 1.5 % of the loan, plus a release fee (≈ 0.5 %) if you repay early, for example when selling.
- **IPPD** (ex-PPD): about 1 %, same release fee, only for existing homes.

### PTZ (zero-interest loan)
Available until 31 December 2027 for first-time buyers (no main residence owned in the last 2 years).

- **Where**: new builds in every zone; older homes only in zones B2 and C with works ≥ 25 % of the cost. **Toulouse is in zone A** since the October 2023 reclassification (the brief assumed B1; the tool defaults to A and lets you change it).
- **Income test**: resources = max(revenu fiscal de référence N-2, total cost ÷ 9), divided by a household coefficient (1, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3 for 1 to 8+ people). The result picks a tranche; zone A ceilings: 25 000 / 31 000 / 37 000 / 49 000 €. Above 49 000 € per coefficient unit, no PTZ. The 2026 budget did not revalue these scales.
- **Amount** = quotité × min(cost, ceiling). Zone A cost ceiling: 150 000 € × coefficient (1 to 2.4). Quotité for a new apartment: 50 / 40 / 40 / 20 % by tranche; a new house: 30 / 20 / 20 / 10 %.
- **Repayment**: 0 % interest. Tranche 1: 25 years with 10 years of no repayment; tranche 2: 20 years with 8; tranche 3: 15 years with 2; tranche 4: 10 years with none. Repaid in equal instalments after the deferral.
- The PTZ cannot exceed the main loan; the tool caps it.

This is an estimate. The official simulator on service-public.fr and your bank have the final word.

### Total cost of credit and TAEG
Total cost = interest + insurance + guarantee (minus the expected refund) + bank and broker fees.

TAEG is the yearly rate that makes what you actually receive (loan − fees − guarantee) equal to the present value of everything you repay (payments + insurance), expressed as (1 + monthly rate)^12 − 1. It is compared with the Banque de France usury ceiling for the loan's length (Q4 2026: 5.40 % for 20 years and more). An offer above it is illegal.

---

## 2. Rent vs buy

### The idea
Two households start with the same cash and face the same housing need. One buys, one rents. Every month, whichever pays less for housing invests the difference. At any point, we ask: if both stopped today (the owner sells, the renter cashes out), who has more?

### Each month
- **Buyer pays**: loan payment + borrower insurance + PTZ instalment + taxe foncière ÷ 12 + copro charges + maintenance (a share of the current value ÷ 12) + home insurance.
- **Renter pays**: rent + tenant insurance.
- The cheaper path invests the difference at the investment return (converted to a monthly rate: (1 + yearly)^(1/12) − 1). Usually that is the renter at first. As rent rises and the loan stays fixed, or once the loan is repaid, it often flips to the owner. Both directions are modelled.
- At t0 the renter invests the buyer's apport.

### Net worth "if sold this month"
- **Buyer**: home value × (1 − selling costs) − remaining main loan − remaining PTZ − early-repayment penalty − mortgage release fee + caution refund + the owner's invested savings (after tax on gains).
- **Renter**: invested savings (after tax on gains).
- No capital-gains tax on the sale of a main residence in France.
- Early-repayment penalty: at most min(6 months of interest, 3 % of the capital repaid), the legal cap. It is not due when the sale follows a job move, death or forced job loss, and many contracts waive it; it is on by default (cautious) and can be switched off.

### Growth assumptions
- Home value grows at the price-growth rate (default 1.5 %/year). Works add 50 % of their cost to the value (an assumption, editable).
- Rent grows once a year at the rent-growth rate (default 1.5 %, near the IRL trend; +1.15 % in the year to Q2 2026).
- Taxe foncière, copro charges and insurance grow with inflation (default 2 %).
- Maintenance: 1 % of value per year for older homes, 0.5 % for new builds (covered by builder warranties early on).

### Investment return and tax
Presets: Livret A 1.7 % (tax-free), assurance-vie fonds euros 2.63 % (2025 average), diversified ETFs in a PEA 5 % (lower end of the 5–6 % long-run nominal range), or custom.

Tax on gains if cashed out:
- Livret A: none.
- Assurance-vie: 30 % before 8 years, 24.7 % after (the yearly allowance is ignored, which overstates tax on small gains). Assurance-vie was excluded from the 2026 social-charge increase, so it stays at 17.2 % social charges.
- PEA: flat tax 31.4 % before 5 years, 18.6 % social charges after (since 1 January 2026; it was 17.2 %). The 150 000 € PEA contribution cap is ignored.
- Custom: flat tax 31.4 %.

Simplification: fonds euros social charges are actually levied every year; the tool levies them once on cashing out.

### Existing loans
Car or consumer loans are paid in both paths, so they cancel out of the comparison. They still appear in the loan tab's timeline and in the cash-flow note.

### Taxe d'habitation
Abolished on main residences, so it is the same (zero) in both paths.

### Breakeven
The first month where the buyer's net worth reaches the renter's, interpolated between months and reported in years. The tool simulates 30 years even when your horizon is shorter, so it can say "breakeven after 12 years, beyond your 10-year horizon". It also says when renting pulls ahead again later.

### "Unrecoverable costs"
"Rent is money thrown away" ignores that owners also lose money they never get back. Per year:
- **Renter**: rent + tenant insurance.
- **Owner**: loan interest + borrower insurance + taxe foncière + maintenance + copro + home insurance + **opportunity cost** (the owner's equity × investment return: what that money would have earned invested) + **buying and selling fees** spread evenly over the years held (notary, guarantee net of refund, bank and broker fees, selling costs, early-repayment penalty and release fee at the horizon).
- Price growth that year is shown separately as an offset.

Loan principal is not an unrecoverable cost: it becomes equity.

### Today's euros
Optionally, amounts are divided by (1 + inflation)^years. Who wins does not change.

---

## 3. Sensitivity

### Tornado
Starting from your scenario, each assumption is moved to a low and a high value, one at a time, and the measure is recomputed:

| Assumption | Low / high |
|---|---|
| Price growth | ± 2 points |
| Interest rate | ± 1 point |
| Investment return | ± 2 points |
| Rent growth | ± 1 point |
| Rent | ± 20 % |
| Purchase price | ± 15 % (apport fixed, loan adjusts) |
| Years stayed | ± 5 years |
| Maintenance | ± 0.5 point |
| Taxe foncière | ± 30 % |
| Selling costs | ± 2 points |

Bars are sorted by the spread between low and high. The measure is either the buy − rent net-worth gap at your horizon, or the breakeven year ("30+ years" when buying never catches up).

### Heatmap
A grid over two assumptions (default: price growth × years stayed). Each cell is the buy − rent gap; brick means buying is ahead, blue means renting is ahead, and colour intensity grows with the size of the gap. The outlined edge marks where they are equal. The dashed cell is your scenario.

---

## 4. Known limitations
- Fixed-rate loans only; no rate changes, renegotiation or early repayment except at sale.
- No modelling of rental investment, inheritance, or income changes over time.
- Taxe foncière is estimated per m²; the real amount depends on the cadastral value. Ask the seller for the latest notice.
- Market figures are Toulouse medians; neighbourhoods differ a lot.
- Bank practices vary: the tool shows rules and typical values, not any bank's decision.

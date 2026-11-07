# Chez Nous: rent or buy in Toulouse

An educational, static web tool for a couple deciding whether to keep renting or buy their main residence in Toulouse (Haute-Garonne). It never tells you what to do: it shows the consequences of your assumptions and which of them actually drive the answer.

- **Loan simulator**: borrowing capacity (today and once existing loans end), HCSF debt ratio, notary fees, guarantee, PTZ estimate, total cost of credit, TAEG, amortization.
- **Rent vs buy**: month-by-month net worth of both paths, breakeven year, unrecoverable costs, tornado and heatmap sensitivity.
- Glossary of French terms, an Assumptions panel listing every default with its source and date, and a one-page print summary.

No backend, no accounts, no analytics. Inputs stay in your browser (localStorage) and in the URL, so a link reproduces your exact scenario.

> Educational tool, not financial advice. Banks assess every file individually; check figures with a broker or your bank.

## Run it

Requires Node 20+ (developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173/ProjectChezNous/
npm test           # Vitest unit tests (engine, state, i18n)
npm run check      # typecheck + lint + tests
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

## Deploy to GitHub Pages

1. Create a GitHub repository named `ProjectChezNous` and push `main`.
2. In the repository settings, under **Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: tests, build, deploy. `test.yml` also runs typecheck, lint and tests on pull requests.

The site is served from `https://<user>.github.io/ProjectChezNous/`. If you rename the repository, change `base` in `vite.config.ts` to match.

## Project layout

```
src/
  config/defaults.ts   every regulatory and market figure, with source, URL, date, notes, conflicts
  engine/              pure TypeScript calculations, no React (enforced by an ESLint rule)
    __tests__/         unit tests for the engine
  state/               scenario schema (zod), store (zustand), selectors, localStorage, URL hash
  workers/             Web Worker running the tornado and heatmap off the main thread
  i18n/                en.ts dictionary and Intl formatters
  ui/                  React components: loan/, rentbuy/, edu/, charts/, inputs/
  styles/              design tokens (light/dark), layout, print
```

`METHODOLOGY.md` explains every formula and assumption in plain English.

## How defaults are sourced

All defaults live in `src/config/defaults.ts`. Each one is a `Sourced<T>` with `value`, `unit`, `source`, `url`, `retrieved` (ISO date), and optional `note` and `conflict`. The Assumptions panel in the app is generated from this file, so the code and the panel never drift apart.

Rules followed when the figures were gathered (7 November 2026):

- Official sources first (Légifrance, service-public, economie.gouv, Banque de France, INSEE), then notaries and brokers.
- When sources disagreed, the more conservative value was kept (the one that makes buying costlier or a loan harder to get) and the disagreement is written in `conflict`.

To update a figure: change its `value`, `source`, `url` and `retrieved`, run `npm test`, and check the Assumptions panel. Figures worth re-checking regularly: mortgage rates (monthly), usury ceilings (quarterly), Livret A (1 Feb / 1 Aug), PTZ scales (yearly budget law), DMTO rate (department vote), Toulouse prices and rents.

## Adding French

1. Create `src/i18n/fr.ts`:
   ```ts
   import type { Messages } from './en';
   export const fr: Messages = { 'app.title': 'Chez Nous', /* every key from en.ts */ };
   export const assumptionLabels: Record<string, string> = { /* same keys as in en.ts */ };
   ```
   Typing it as `Messages` makes TypeScript list any missing key.
2. In `src/i18n/index.ts`, add `'fr'` to `Locale`, register `fr` in `dictionaries`, and map `fr: 'fr-FR'` in `intlLocale` (numbers then format as `1 234 567 €`).
3. Make `useT` and `useFmt` in `src/ui/hooks.ts` read the locale from the store, and add an EN/FR toggle in `App.tsx`.

Source citations in `defaults.ts` are data and can stay in their original language.

## Tests

The engine tests cover the published annuity examples (300 000 € and 250 000 € over 20 years at 3.76 %, within 1 €), amortization invariants, capacity as the inverse of the payment function including the 35 % cap and the capacity step when an existing loan ends, notary fees for ancien and neuf, PTZ eligibility and amounts by zone, income and property type, a hand-computed rent-vs-buy case at 0 % everything, breakeven detection, investing the difference in both directions, and tornado ordering and symmetry. State tests cover URL round-trips, field-by-field validation of untrusted data, overrides and storage failures.

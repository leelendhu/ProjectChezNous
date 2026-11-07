// All user-facing English strings. Keys are flat and dotted by area.
// To add French: create fr.ts typed as `Messages` and register it in index.ts.
export const en = {
  'app.title': 'Chez Nous',
  'app.subtitle': 'Rent or buy in Toulouse — see what drives the answer',
  'tabs.loan': 'Loan simulator',
  'tabs.rentVsBuy': 'Rent vs buy',
  'disclaimer.short':
    'Educational tool, not financial advice. Banks assess every file individually — check figures with a broker or your bank.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

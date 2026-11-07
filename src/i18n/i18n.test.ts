import { describe, expect, it } from 'vitest';
import { translate } from './index';
import { formatEuro, formatPercent } from './format';

describe('i18n', () => {
  it('returns English strings', () => {
    expect(translate('en', 'tabs.loan')).toBe('Loan simulator');
  });

  it('formats euros with thousands separators', () => {
    expect(formatEuro(1234567, 'en-GB')).toBe('€1,234,567');
    expect(formatEuro(1234567, 'fr-FR').replace(/\s/g, ' ')).toBe('1 234 567 €');
  });

  it('formats percents from fractions', () => {
    expect(formatPercent(0.0376, 'en-GB')).toBe('3.76%');
  });
});

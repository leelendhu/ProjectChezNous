// Locale-aware number formatting. Formatters are cached per locale+options.
const cache = new Map<string, Intl.NumberFormat>();

function nf(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

export function formatEuro(value: number, locale: string, fractionDigits = 0): string {
  return nf(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** `value` is a fraction: 0.035 → "3.5%". */
export function formatPercent(value: number, locale: string, fractionDigits = 2): string {
  return nf(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, locale: string, fractionDigits = 0): string {
  return nf(locale, { maximumFractionDigits: fractionDigits }).format(value);
}

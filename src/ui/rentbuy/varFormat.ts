import type { HeatmapAxis } from '../../engine/sensitivity';
import { formatEuroCompact, formatNumber, formatPercent } from '../../i18n/format';

/** How to print a sensitivity variable's value. */
export function formatVar(key: HeatmapAxis, v: number, locale: string): string {
  switch (key) {
    case 'rent':
    case 'price':
    case 'taxeFonciere':
      return formatEuroCompact(v, locale);
    case 'horizon':
    case 'yearsStayed':
      return `${formatNumber(v, locale)} y`;
    default:
      return formatPercent(v, locale, 1);
  }
}

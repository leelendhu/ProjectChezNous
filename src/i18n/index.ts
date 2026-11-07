import { en, type MessageKey, type Messages } from './en';

export type Locale = 'en';
export type { MessageKey };

const dictionaries: Record<Locale, Messages> = { en };

/** BCP-47 tag used for Intl formatting. */
export const intlLocale: Record<Locale, string> = { en: 'en-GB' };

export type Params = Record<string, string | number>;

/** Look up a message and replace `{name}` placeholders. */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const template = dictionaries[locale][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

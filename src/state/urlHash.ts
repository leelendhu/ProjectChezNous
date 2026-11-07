import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { deepDiff, defaultState, parseState, type ScenarioState } from './schema';

export type Tab = 'loan' | 'rent-vs-buy';

export interface HashState {
  tab: Tab;
  state: ScenarioState | null;
  /** True when a scenario was present in the URL but could not be read. */
  invalid: boolean;
}

/** Hard cap on what we try to decompress from a URL. */
const MAX_PAYLOAD = 8000;

/** `#/rent-vs-buy?s=<compressed diff vs defaults>`; the diff keeps shared links short. */
export function encodeHash(tab: Tab, state: ScenarioState): string {
  const diff = deepDiff(defaultState, state);
  const payload = diff === undefined ? '' : compressToEncodedURIComponent(JSON.stringify(diff));
  return `#/${tab}${payload ? `?s=${payload}` : ''}`;
}

export function decodeHash(hash: string): HashState {
  const match = /^#\/(loan|rent-vs-buy)(?:\?s=([A-Za-z0-9+\-$]*))?/.exec(hash);
  const tab: Tab = match?.[1] === 'rent-vs-buy' ? 'rent-vs-buy' : 'loan';
  const payload = match?.[2];
  if (!payload) return { tab, state: null, invalid: false };
  if (payload.length > MAX_PAYLOAD) return { tab, state: null, invalid: true };
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return { tab, state: null, invalid: true };
    return { tab, state: parseState(JSON.parse(json)), invalid: false };
  } catch {
    return { tab, state: null, invalid: true };
  }
}

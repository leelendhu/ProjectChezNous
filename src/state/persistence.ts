import { parseState, type ScenarioState } from './schema';

const KEY = 'chez-nous:scenario:v1';

/** Storage can be missing or throw (private mode, blocked cookies): never let it break the app. */
export function loadSaved(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): ScenarioState | null {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? parseState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function save(state: ScenarioState, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked: the URL still holds the scenario.
  }
}

export function clearSaved(storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // ignore
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

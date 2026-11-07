import { useEffect, useMemo, useState } from 'react';
import { runScenario, type Scenario } from '../../engine/rentVsBuy';
import { useScenario } from '../hooks';

/** Main simulation: cheap enough to run on every change. */
export function useSimulation() {
  const scenario = useScenario();
  const result = useMemo(() => runScenario(scenario), [scenario]);
  return { scenario, result };
}

/**
 * Runs an async computation (in the worker) after the inputs settle.
 * Keeps showing the previous result while the next one computes.
 */
export function useDebouncedAsync<T>(scenario: Scenario, run: (s: Scenario) => Promise<T>, extraKey: string, delayMs = 250) {
  // A fresh token per input change; the result remembers which token produced it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const token = useMemo(() => ({}), [scenario, extraKey]);
  const [done, setDone] = useState<{ token: object; value: T } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      run(scenario)
        .then((value) => {
          if (!cancelled) setDone({ token, value });
        })
        .catch(() => undefined);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return { value: done?.value ?? null, busy: done?.token !== token };
}

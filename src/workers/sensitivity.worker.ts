/// <reference lib="webworker" />
// Runs tornado and heatmap computations off the main thread.
import { heatmap, tornado } from '../engine';
import type { SensitivityRequest, SensitivityResponse } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<SensitivityRequest>) => {
  const req = event.data;
  let res: SensitivityResponse;
  try {
    res =
      req.kind === 'tornado'
        ? { id: req.id, kind: 'tornado', result: tornado(req.scenario, req.metric) }
        : { id: req.id, kind: 'heatmap', result: heatmap(req.scenario, req.xKey, req.yKey, req.xs, req.ys) };
  } catch (e) {
    res = { id: req.id, kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
  ctx.postMessage(res);
};

import { heatmap, tornado, type HeatmapAxis, type HeatmapResult, type Metric, type Scenario, type TornadoResult } from '../engine';
import type { SensitivityRequest, SensitivityResponse } from './protocol';

type Pending = { resolve: (r: SensitivityResponse) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./sensitivity.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<SensitivityResponse>) => {
      pending.get(e.data.id)?.resolve(e.data);
      pending.delete(e.data.id);
    };
    return worker;
  } catch {
    return null;
  }
}

type Req = SensitivityRequest extends infer R ? (R extends SensitivityRequest ? Omit<R, 'id'> : never) : never;

function send(req: Req): Promise<SensitivityResponse> {
  const w = getWorker();
  const id = nextId++;
  if (!w) {
    // No worker support: compute synchronously.
    return Promise.resolve(
      req.kind === 'tornado'
        ? { id, kind: 'tornado', result: tornado(req.scenario, req.metric) }
        : { id, kind: 'heatmap', result: heatmap(req.scenario, req.xKey, req.yKey, req.xs, req.ys) },
    );
  }
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    w.postMessage({ ...req, id } as SensitivityRequest);
  });
}

export async function runTornado(scenario: Scenario, metric: Metric): Promise<TornadoResult> {
  const r = await send({ kind: 'tornado', scenario, metric });
  if (r.kind !== 'tornado') throw new Error(r.kind === 'error' ? r.message : 'unexpected response');
  return r.result;
}

export async function runHeatmap(scenario: Scenario, xKey: HeatmapAxis, yKey: HeatmapAxis, xs: number[], ys: number[]): Promise<HeatmapResult> {
  const r = await send({ kind: 'heatmap', scenario, xKey, yKey, xs, ys });
  if (r.kind !== 'heatmap') throw new Error(r.kind === 'error' ? r.message : 'unexpected response');
  return r.result;
}

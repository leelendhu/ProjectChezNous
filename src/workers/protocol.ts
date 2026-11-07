import type { HeatmapAxis, HeatmapResult, Metric, Scenario, TornadoResult } from '../engine';

export type SensitivityRequest =
  | { id: number; kind: 'tornado'; scenario: Scenario; metric: Metric }
  | { id: number; kind: 'heatmap'; scenario: Scenario; xKey: HeatmapAxis; yKey: HeatmapAxis; xs: number[]; ys: number[] };

export type SensitivityResponse =
  | { id: number; kind: 'tornado'; result: TornadoResult }
  | { id: number; kind: 'heatmap'; result: HeatmapResult }
  | { id: number; kind: 'error'; message: string };

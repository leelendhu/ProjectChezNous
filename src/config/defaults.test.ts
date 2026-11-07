import { describe, expect, it } from 'vitest';
import { ptz, sources } from './defaults';
import type { Sourced } from './types';

const isSourced = (v: unknown): v is Sourced<unknown> =>
  typeof v === 'object' && v !== null && 'value' in v && 'source' in v;

const allSourced = Object.values(sources).flatMap((group) =>
  Object.values(group).filter(isSourced),
);

describe('defaults', () => {
  it('every figure names a source, unit and retrieval date', () => {
    expect(allSourced.length).toBeGreaterThan(40);
    for (const d of allSourced) {
      expect(d.source.length).toBeGreaterThan(5);
      expect(d.unit.length).toBeGreaterThan(0);
      expect(d.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (d.url) expect(d.url).toMatch(/^https:\/\//);
    }
  });

  it('PTZ tables are complete and ordered', () => {
    expect(ptz.familyCoefficient.value).toHaveLength(8);
    for (const ceilings of Object.values(ptz.trancheCeilings.value)) {
      expect([...ceilings].sort((a, b) => a - b)).toEqual(ceilings);
    }
    expect(ptz.durations.value).toHaveLength(4);
    for (const q of Object.values(ptz.quotite.value)) expect(q).toHaveLength(4);
  });
});

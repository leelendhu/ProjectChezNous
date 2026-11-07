/** Horizontal meter for the debt ratio with the threshold marked. */
export function Gauge({ value, threshold, max = 0.6, label }: { value: number; threshold: number; max?: number; label: string }) {
  const w = 240;
  const h = 34;
  const x = (v: number) => (Math.min(max, Math.max(0, v)) / max) * w;
  const over = value > threshold;
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((v) => v <= max);
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} className="gauge" role="img" aria-label={label}>
      <rect x={0} y={6} width={w} height={14} rx={4} fill="var(--surface-sunk)" />
      <rect x={0} y={6} width={x(value)} height={14} rx={4} fill={over ? 'var(--warn)' : 'var(--buy)'} />
      <line x1={x(threshold)} x2={x(threshold)} y1={1} y2={25} stroke="var(--ink)" strokeWidth={2} />
      {ticks.map((v) => (
        <text key={v} x={x(v)} y={h + 12} fontSize={12} textAnchor={v === 0 ? 'start' : v === max ? 'end' : 'middle'} fill="var(--ink-muted)">
          {Math.round(v * 100)}%
        </text>
      ))}
    </svg>
  );
}

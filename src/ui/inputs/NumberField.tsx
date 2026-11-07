import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useFmt, useT } from '../hooks';
import { InfoTip } from './InfoTip';

export interface NumberFieldProps {
  label: string;
  /** null = automatic value (shown from `autoValue`) or empty. */
  value: number | null;
  onChange: (value: number) => void;
  /** Stored as a fraction, shown ×100 with a % suffix. */
  percent?: boolean;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  /** Slider range (defaults to min/max). */
  sliderMin?: number;
  sliderMax?: number;
  slider?: boolean;
  help?: string;
  /** Value derived automatically when `value` is null. */
  autoValue?: number;
  /** Restores the automatic value. */
  onAuto?: () => void;
  /** Allows emptying the field. */
  onClear?: () => void;
  placeholder?: string;
  decimals?: number;
  hint?: ReactNode;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Number input paired with an optional slider. Invalid entries stay in the field with a
 * message and are not applied (no silent clamping).
 */
export function NumberField(p: NumberFieldProps) {
  const t = useT();
  const { num } = useFmt();
  const id = useId();
  const scale = p.percent ? 100 : 1;
  const decimals = p.decimals ?? (p.percent ? 2 : 0);
  const shown = p.value ?? p.autoValue ?? null;
  const isAuto = p.value === null && p.autoValue !== undefined;
  const toText = (v: number | null) => (v === null ? '' : String(round(v * scale, decimals)));
  const [text, setText] = useState(toText(shown));
  const [error, setError] = useState<string | null>(null);
  const editing = useRef(false);

  // Follow external changes (slider, reset, shared link) unless the user is typing.
  useEffect(() => {
    if (!editing.current) {
      setText(toText(shown));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const unit = p.percent ? ' %' : p.suffix ? ` ${p.suffix}` : '';
  const commit = (raw: string) => {
    setText(raw);
    const cleaned = raw.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    if (cleaned === '') {
      if (p.onClear) {
        setError(null);
        p.onClear();
      } else setError(t('validation.number'));
      return;
    }
    const v = Number(cleaned) / scale;
    if (!Number.isFinite(v)) return setError(t('validation.number'));
    if (v < p.min) return setError(t('validation.min', { min: num(p.min * scale, decimals) + unit }));
    if (v > p.max) return setError(t('validation.max', { max: num(p.max * scale, decimals) + unit }));
    setError(null);
    p.onChange(v);
  };

  const suffix = p.percent ? '%' : p.suffix;
  const sMin = p.sliderMin ?? p.min;
  const sMax = p.sliderMax ?? p.max;
  const step = p.step ?? (p.percent ? 0.0005 : 1);
  const errId = `${id}-err`;

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <div className="field-head">
        <label htmlFor={id}>{p.label}</label>
        {p.help && <InfoTip text={p.help} label={p.label} />}
        {isAuto && (
          <span className="badge" title={t('common.autoHint')}>
            {t('common.auto')}
          </span>
        )}
        {p.onAuto && p.value !== null && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setError(null);
              p.onAuto!();
            }}
          >
            {t('common.useAuto')}
          </button>
        )}
      </div>
      <div className="field-input">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={p.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onFocus={() => (editing.current = true)}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => {
            editing.current = false;
            if (error === null) setText(toText(shown));
          }}
        />
        {suffix && (
          <span className="suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {p.slider && shown !== null && (
        <input
          type="range"
          className="slider"
          aria-label={p.label}
          min={sMin}
          max={sMax}
          step={step}
          value={Math.min(sMax, Math.max(sMin, shown))}
          onChange={(e) => {
            setError(null);
            p.onChange(Number(e.target.value));
          }}
        />
      )}
      {error && (
        <p id={errId} className="field-error" role="alert">
          {error}
        </p>
      )}
      {p.hint && <p className="field-hint">{p.hint}</p>}
    </div>
  );
}

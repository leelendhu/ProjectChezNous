import { useId, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';

export interface Option<V extends string> {
  value: V;
  label: string;
}

/** Native select: accessible and comfortable on phones. */
export function Select<V extends string>(p: { label: string; value: V; options: Option<V>[]; onChange: (v: V) => void; help?: string }) {
  const id = useId();
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{p.label}</label>
        {p.help && <InfoTip text={p.help} label={p.label} />}
      </div>
      <select id={id} value={p.value} onChange={(e) => p.onChange(e.target.value as V)}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Segmented control built from radio buttons. */
export function Segmented<V extends string>(p: { label: string; value: V; options: Option<V>[]; onChange: (v: V) => void; help?: string }) {
  const name = useId();
  return (
    <fieldset className="field segmented">
      <legend>
        {p.label}
        {p.help && <InfoTip text={p.help} label={p.label} />}
      </legend>
      <div className="segmented-options">
        {p.options.map((o) => (
          <label key={o.value} className={o.value === p.value ? 'on' : undefined}>
            <input type="radio" name={name} value={o.value} checked={o.value === p.value} onChange={() => p.onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle(p: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const id = useId();
  return (
    <div className="field toggle">
      <input id={id} type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} />
      <label htmlFor={id}>{p.label}</label>
      {p.help && <InfoTip text={p.help} label={p.label} />}
    </div>
  );
}

/** Collapsible group of inputs. */
export function Section(p: { title: string; children: ReactNode; defaultOpen?: boolean; id?: string }) {
  return (
    <details className="section" open={p.defaultOpen ?? true} id={p.id}>
      <summary>
        <h2>{p.title}</h2>
      </summary>
      <div className="section-body">{p.children}</div>
    </details>
  );
}

import { useId, useState } from 'react';
import { useT } from '../hooks';

/** A small "?" button that reveals an explanation; works with touch and keyboard. */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="infotip">
      <button
        type="button"
        className="infotip-btn"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${t('common.why')}: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span id={id} role="note" className="infotip-text">
          {text}
        </span>
      )}
    </span>
  );
}

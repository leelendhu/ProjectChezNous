import { lazy, Suspense, useState } from 'react';
import { useStore } from '../state/store';
import type { Tab } from '../state/urlHash';
import { useT } from './hooks';
import { LoanTab } from './loan/LoanTab';

const RentBuyTab = lazy(() => import('./rentbuy/RentBuyTab').then((m) => ({ default: m.RentBuyTab })));

const TABS: { id: Tab; key: 'tabs.loan' | 'tabs.rentVsBuy' }[] = [
  { id: 'loan', key: 'tabs.loan' },
  { id: 'rent-vs-buy', key: 'tabs.rentVsBuy' },
];

export function App() {
  const t = useT();
  const tab = useStore((s) => s.tab);
  const linkError = useStore((s) => s.linkError);
  const { setTab, resetAll, dismissLinkError } = useStore.getState();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address bar already holds the link.
    }
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]!;
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <>
      <header className="masthead">
        <div className="shell masthead-inner">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="tagline">{t('app.subtitle')}</p>
          </div>
          <div className="toolbar no-print">
            <button type="button" className="btn-quiet" onClick={copyLink} aria-live="polite">
              {copied ? t('actions.linkCopied') : t('actions.copyLink')}
            </button>
            <button type="button" className="btn-quiet" onClick={() => window.print()}>
              {t('actions.print')}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                if (window.confirm(t('actions.resetConfirm'))) resetAll();
              }}
            >
              {t('actions.reset')}
            </button>
          </div>
        </div>
        <nav className="shell no-print">
          <div role="tablist" aria-label={t('tabs.label')} className="tabs">
            {TABS.map((x, i) => (
              <button
                key={x.id}
                id={`tab-${x.id}`}
                role="tab"
                type="button"
                aria-selected={tab === x.id}
                aria-controls={`panel-${x.id}`}
                tabIndex={tab === x.id ? 0 : -1}
                className="tab"
                onClick={() => setTab(x.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t(x.key)}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {linkError && (
        <div className="shell notice" role="status">
          {t('linkError')}{' '}
          <button type="button" className="link-btn" onClick={dismissLinkError}>
            {t('linkError.dismiss')}
          </button>
        </div>
      )}

      <main className="shell" id="main">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'loan' ? (
            <LoanTab />
          ) : (
            <Suspense fallback={<p className="muted">…</p>}>
              <RentBuyTab />
            </Suspense>
          )}
        </div>
      </main>

      <footer className="disclaimer">
        <div className="shell">
          <p>{t('disclaimer.short')}</p>
        </div>
      </footer>
    </>
  );
}

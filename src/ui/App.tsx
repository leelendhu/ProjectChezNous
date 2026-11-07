import { translate } from '../i18n';

const t = (key: Parameters<typeof translate>[1]) => translate('en', key);

export function App() {
  return (
    <div className="shell">
      <header>
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
      </header>
      <footer>
        <small>{t('disclaimer.short')}</small>
      </footer>
    </div>
  );
}

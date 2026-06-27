import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'es').slice(0, 2);

  return (
    <div
      className="inline-flex items-center rounded border border-white/20 bg-black/10 p-0.5 text-xs"
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          className={`flex h-8 items-center rounded px-2 font-semibold uppercase transition ${
            current === lng
              ? 'bg-white text-pitch-dark shadow'
              : 'text-white/80 hover:text-white'
          }`}
          aria-pressed={current === lng}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}

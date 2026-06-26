import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'es').slice(0, 2);

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-white/15 p-1 text-xs"
      role="group"
      aria-label={t('language.label')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded-full px-2.5 py-1 font-semibold uppercase transition ${
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

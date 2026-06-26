import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { ModeToggle } from './ModeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const isDnd = useAppStore((s) => s.isDragAndDropMode);
  const matrixStatus = useAppStore((s) => s.matrixStatus);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pitch-dark to-pitch px-5 py-3 text-white shadow-md">
      <div>
        <h1 className="text-lg font-bold leading-tight">⚽ {t('header.title')}</h1>
        <p className="text-xs text-white/70">
          {t('header.subtitle')} ·{' '}
          {isDnd ? t('header.hintSandbox') : t('header.hintSimulator')}
          {matrixStatus === 'loading' && ` · ${t('header.matrixLoading')}`}
          {matrixStatus === 'error' && ` · ${t('header.matrixError')}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}

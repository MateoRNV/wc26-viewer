import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { ModeToggle } from './ModeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProjectActions } from './ProjectActions';

export function Header() {
  const { t } = useTranslation();
  const matrixStatus = useAppStore((state) => state.matrixStatus);

  return (
    <header className="z-40 border-b border-emerald-950 bg-emerald-900 px-3 py-2 text-white sm:px-5 lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy size={22} className="shrink-0 text-amber-300" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">{t('header.title')}</h1>
            <p className="hidden text-xs text-emerald-100 sm:block">
              {matrixStatus === 'ready' ? t('header.subtitle') : t(`header.matrix.${matrixStatus}`)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ModeToggle />
          <ProjectActions />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

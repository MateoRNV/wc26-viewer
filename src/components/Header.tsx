import { useState } from 'react';
import { Trophy, Table2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { ModeToggle } from './ModeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProjectActions } from './ProjectActions';
import { CombinationsModal } from './CombinationsModal';

export function Header() {
  const { t } = useTranslation();
  const matrixStatus = useAppStore((state) => state.matrixStatus);
  const [showCombinations, setShowCombinations] = useState(false);

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
          <button
            type="button"
            onClick={() => setShowCombinations(true)}
            className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            title={t('combinations.open', 'Combinaciones de terceros')}
          >
            <Table2 size={14} aria-hidden="true" />
            <span className="hidden sm:inline">{t('combinations.button', 'Combinaciones')}</span>
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ModeToggle />
          <ProjectActions />
          <LanguageSwitcher />
        </div>
      </div>

      {showCombinations && <CombinationsModal onClose={() => setShowCombinations(false)} />}
    </header>
  );
}

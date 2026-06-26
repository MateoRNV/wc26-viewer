import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { GROUP_LETTERS } from '../data/groups.mock';
import { teamName } from '../i18n';
import { BracketTree } from './BracketTree';

export function BracketPanel() {
  const { t } = useTranslation();
  const groups = useAppStore((s) => s.groups);
  const resolved = useAppStore((s) => s.resolvedBracket);
  const scenarioKey = useAppStore((s) => s.scenarioKey);
  const official = useAppStore((s) => s.scenarioOfficial);
  const bracketError = useAppStore((s) => s.bracketError);
  const matrixStatus = useAppStore((s) => s.matrixStatus);

  const nameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of GROUP_LETTERS) {
      for (const tm of groups[l].teams) map.set(tm.code, tm.name);
    }
    return (code: string | null) =>
      code ? teamName(code, map.get(code) ?? code) : null;
  }, [groups]);

  if (matrixStatus !== 'ready') {
    return <Empty>{t('bracket.loadingMatrix')}</Empty>;
  }

  if (bracketError) {
    return <Empty>⚠️ {t('bracket.noScenario', { key: bracketError })}</Empty>;
  }

  if (!resolved) {
    return <Empty>{t('bracket.defineThirds')}</Empty>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-1 font-mono font-semibold text-slate-600">
          {t('bracket.combination', { key: scenarioKey })}
        </span>
        {official ? (
          <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
            {t('bracket.official')}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-700">
            {t('bracket.generated')}
          </span>
        )}
      </div>
      <BracketTree matchups={resolved} nameByCode={nameByCode} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

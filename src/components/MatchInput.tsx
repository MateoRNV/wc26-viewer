import { useTranslation } from 'react-i18next';
import type { Match } from '../types';
import { useAppStore } from '../store/appStore';

interface Props {
  match: Match;
  nameByCode: (code: string) => string;
}

export function MatchInput({ match, nameByCode }: Props) {
  const { t } = useTranslation();
  const updateMatchResult = useAppStore((s) => s.updateMatchResult);

  const onGoals = (side: 'home' | 'away', value: string) => {
    const n = Number.parseInt(value, 10);
    const goals = Number.isNaN(n) ? 0 : n;
    if (side === 'home') {
      updateMatchResult(match.id, goals, match.awayGoals);
    } else {
      updateMatchResult(match.id, match.homeGoals, goals);
    }
  };

  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="flex-1 truncate text-right text-slate-600">
        {nameByCode(match.homeCode)}
      </span>
      <input
        type="number"
        min={0}
        value={match.homeGoals}
        onChange={(e) => onGoals('home', e.target.value)}
        className="w-7 rounded border border-slate-200 py-0.5 text-center tabular-nums focus:border-pitch focus:outline-none"
        aria-label={t('match.goalsAria', { team: nameByCode(match.homeCode) })}
      />
      <span className="text-slate-300">-</span>
      <input
        type="number"
        min={0}
        value={match.awayGoals}
        onChange={(e) => onGoals('away', e.target.value)}
        className="w-7 rounded border border-slate-200 py-0.5 text-center tabular-nums focus:border-pitch focus:outline-none"
        aria-label={t('match.goalsAria', { team: nameByCode(match.awayCode) })}
      />
      <span className="flex-1 truncate text-slate-600">
        {nameByCode(match.awayCode)}
      </span>
    </div>
  );
}

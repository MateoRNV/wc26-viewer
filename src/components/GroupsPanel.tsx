import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { GROUP_LETTERS } from '../data/groups';
import { GroupCard } from './GroupCard';
import { MatchInput } from './MatchInput';
import { Flag } from './Flag';
import { teamName } from '../i18n';
import { computeStats } from '../utils/scoringRules';

interface GroupsPanelProps {
  viewMode: 'groups' | 'matches';
}

const POSITION_STYLES = [
  'bg-emerald-700',
  'bg-emerald-700',
  'bg-amber-500 text-slate-950',
  'bg-slate-400',
];

export function GroupsPanel({ viewMode }: GroupsPanelProps) {
  const { t } = useTranslation();
  const groups = useAppStore((state) => state.groups);

  const nameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const letter of GROUP_LETTERS) {
      for (const team of groups[letter].teams) {
        map.set(team.code, team.name);
      }
    }
    return (code: string) => teamName(code, map.get(code) ?? code);
  }, [groups]);

  const remainingMatches = useMemo(() => {
    return GROUP_LETTERS.flatMap((letter) => groups[letter].matches)
      .filter((match) => !match.preseeded)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [groups]);

  if (viewMode === 'matches') {
    return (
      <div className="flex flex-col gap-4">
        {/* Matches list */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {t('group.remainingMatches', 'Partidos restantes')}
          </h4>
          <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto pr-1 scroll-thin">
            {remainingMatches.map((match) => (
              <MatchInput key={match.id} match={match} nameByCode={nameByCode} />
            ))}
            {remainingMatches.length === 0 && (
              <p className="text-center py-6 text-xs text-slate-500 italic">
                {t('group.noRemainingMatches', 'No quedan partidos por jugar')}
              </p>
            )}
          </div>
        </div>

        {/* Compact group standings */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            {t('group.standings', 'Clasificación de grupos')}
          </h4>
          <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
            {GROUP_LETTERS.map((letter) => {
              const group = groups[letter];
              const stats = computeStats(group.teams, group.matches);
              const statByCode = new Map(stats.map((s) => [s.team.code, s]));
              const hasPending = group.matches.some((m) => !m.preseeded && m.status !== 'completed');
              return (
                <div
                  key={letter}
                  className="rounded border border-slate-200 bg-white px-2 py-1.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {t('group.title', { letter })}
                    </p>
                    {hasPending && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" aria-label="partidos pendientes" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {group.teams.map((team, idx) => {
                      const s = statByCode.get(team.code);
                      return (
                        <div
                          key={team.code}
                          className="flex items-center gap-1 text-[10px]"
                        >
                          <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white ${POSITION_STYLES[idx]}`}
                          >
                            {idx + 1}
                          </span>
                          <Flag
                            code={team.code}
                            className="h-2.5 w-auto rounded-[1px] shrink-0"
                          />
                          <span className="truncate text-slate-800 font-medium flex-1">
                            {nameByCode(team.code)}
                          </span>
                          <span className="font-bold tabular-nums text-slate-900 shrink-0">
                            {s?.points ?? 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {GROUP_LETTERS.map((letter) => (
        <GroupCard key={letter} group={groups[letter]} />
      ))}
    </div>
  );
}

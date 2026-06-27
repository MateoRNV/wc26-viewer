import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { GROUP_LETTERS } from '../data/groups';
import { GroupCard } from './GroupCard';
import { MatchInput } from './MatchInput';
import { teamName } from '../i18n';

interface GroupsPanelProps {
  viewMode: 'groups' | 'matches';
}

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
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('group.remainingMatches', 'Partidos restantes de la fase de grupos')}
          </h4>
          <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto pr-1 scroll-thin">
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

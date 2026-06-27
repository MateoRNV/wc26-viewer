import { useMemo, useState } from 'react';
import { CheckCircle2, Trophy, LayoutGrid, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { GROUP_LETTERS } from '../data/groups';
import { teamName } from '../i18n';
import { KnockoutMatchCard } from './KnockoutMatchCard';
import type { KnockoutRound } from '../types';

const COL_1_MATCH_IDS = [73, 75, 74, 77, 81, 82, 83, 84, 76, 78, 79, 80, 85, 87, 86, 88];
const COL_2_MATCH_IDS = [90, 89, 94, 93, 91, 92, 96, 95];
const COL_3_MATCH_IDS = [97, 98, 99, 100];
const COL_4_MATCH_IDS = [101, 102];
const COL_5_MATCH_IDS = [104, 103];

const ROUNDS: KnockoutRound[] = [
  'round32',
  'round16',
  'quarterfinal',
  'semifinal',
  'thirdPlace',
  'final',
];

export function BracketPanel() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [activeRound, setActiveRound] = useState<KnockoutRound>('round32');

  const groups = useAppStore((state) => state.groups);
  const resolved = useAppStore((state) => state.resolvedBracket);
  const matches = useAppStore((state) => state.knockoutMatches);
  const scenarioKey = useAppStore((state) => state.scenarioKey);
  const scenarioOption = useAppStore((state) => state.scenarioOption);
  const bracketError = useAppStore((state) => state.bracketError);
  const matrixStatus = useAppStore((state) => state.matrixStatus);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const letter of GROUP_LETTERS) {
      for (const team of groups[letter].teams) map.set(team.code, team.name);
    }
    return (code: string | null) =>
      code ? teamName(code, map.get(code) ?? code) : t('bracket.pending');
  }, [groups, t]);

  if (matrixStatus === 'loading' || matrixStatus === 'idle') {
    return <Empty>{t('bracket.loadingMatrix')}</Empty>;
  }
  if (matrixStatus === 'error') return <Empty>{t('header.matrixError')}</Empty>;
  if (bracketError) return <Empty>{t('bracket.noScenario', { key: bracketError })}</Empty>;
  if (!resolved) return <Empty>{t('bracket.defineThirds')}</Empty>;

  const champion = matches.find((match) => match.matchNumber === 104)?.winnerCode;

  const renderColumn = (title: string, ids: number[]) => {
    return (
      <div className="flex flex-col min-w-[250px] max-w-[285px] shrink-0">
        <div className="text-center font-bold text-slate-700 bg-slate-100 py-1.5 rounded text-xs mb-3 shadow-sm border border-slate-200">
          {title}
        </div>
        <div className="flex flex-col justify-around flex-1 h-[2200px] gap-2">
          {ids.map((id) => {
            const match = matches.find((m) => m.matchNumber === id);
            return match ? (
              <KnockoutMatchCard key={id} match={match} nameByCode={names} />
            ) : null;
          })}
        </div>
      </div>
    );
  };

  const listMatches = matches.filter((match) => match.round === activeRound);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono font-semibold text-slate-700">
            {t('bracket.option', { option: scenarioOption, key: scenarioKey })}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
            <CheckCircle2 size={14} aria-hidden="true" />
            {t('bracket.official')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === 'tree' ? 'list' : 'tree'))}
          className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition"
        >
          {viewMode === 'tree' ? (
            <>
              <LayoutGrid size={14} />
              {t('bracket.viewList', 'Ver lista')}
            </>
          ) : (
            <>
              <Network size={14} />
              {t('bracket.viewTree', 'Ver árbol')}
            </>
          )}
        </button>
      </div>

      {champion && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <Trophy size={24} aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase text-amber-800">{t('bracket.champion')}</p>
            <p className="text-lg font-bold">{names(champion)}</p>
          </div>
        </div>
      )}

      {viewMode === 'tree' ? (
        <div className="w-full overflow-x-auto pb-4 scroll-thin select-none">
          <div className="flex gap-6 py-2">
            {renderColumn(t('bracket.rounds.round32'), COL_1_MATCH_IDS)}
            {renderColumn(t('bracket.rounds.round16'), COL_2_MATCH_IDS)}
            {renderColumn(t('bracket.rounds.quarterfinal'), COL_3_MATCH_IDS)}
            {renderColumn(t('bracket.rounds.semifinal'), COL_4_MATCH_IDS)}
            {renderColumn(
              `${t('bracket.rounds.final')} / ${t('bracket.rounds.thirdPlace')}`,
              COL_5_MATCH_IDS
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="scroll-thin flex gap-1 overflow-x-auto border-b border-slate-200 pb-2"
            role="tablist"
          >
            {ROUNDS.map((round) => (
              <button
                key={round}
                type="button"
                role="tab"
                aria-selected={activeRound === round}
                onClick={() => setActiveRound(round)}
                className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition-all ${
                  activeRound === round
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {t(`bracket.rounds.${round}`)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {listMatches.map((match) => (
              <KnockoutMatchCard key={match.matchNumber} match={match} nameByCode={names} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-relaxed text-slate-600">
      {children}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CheckCircle2, Trophy, LayoutGrid, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { createInitialGroups, GROUP_LETTERS } from '../data/groups';
import { analyzePossibleCombinations } from '../utils/possibleCombinations';
import { calculateGroupStandings } from '../utils/scoringRules';
import { teamName } from '../i18n';
import { KnockoutMatchCard } from './KnockoutMatchCard';
import { KnockoutEditDialog } from './KnockoutEditDialog';
import type { BracketSlot, KnockoutRound } from '../types';

// Waterfall (left→right) columns
const COL_1_MATCH_IDS = [73, 75, 74, 77, 81, 82, 83, 84, 76, 78, 79, 80, 85, 87, 86, 88];
const COL_2_MATCH_IDS = [90, 89, 94, 93, 91, 92, 96, 95];
const COL_3_MATCH_IDS = [97, 98, 99, 100];
const COL_4_MATCH_IDS = [101, 102];
const COL_5_MATCH_IDS = [104, 103];

// Face-off (both sides) columns — split each round into left/right halves
const FO_LEFT_R32  = [73, 75, 74, 77, 81, 82, 83, 84];
const FO_LEFT_R16  = [90, 89, 94, 93];
const FO_LEFT_QF   = [97, 98];
const FO_LEFT_SF   = [101];
const FO_RIGHT_SF  = [102];
const FO_RIGHT_QF  = [99, 100];
const FO_RIGHT_R16 = [91, 92, 96, 95];
const FO_RIGHT_R32 = [76, 78, 79, 80, 85, 87, 86, 88];

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
  // Always compact + classic for now (toggles hidden). Setters dropped intentionally
  // so the underlying render logic stays available if we re-expose the buttons later.
  const [minimized] = useState(true);
  const [treeLayout] = useState<'waterfall' | 'faceoff'>('faceoff');
  const [activeRound, setActiveRound] = useState<KnockoutRound>('round32');
  const [editing, setEditing] = useState<number | null>(null);

  const groups = useAppStore((state) => state.groups);
  const resolved = useAppStore((state) => state.resolvedBracket);
  const matches = useAppStore((state) => state.knockoutMatches);
  const scenarioKey = useAppStore((state) => state.scenarioKey);
  const scenarioOption = useAppStore((state) => state.scenarioOption);
  const bracketError = useAppStore((state) => state.bracketError);
  const matrixStatus = useAppStore((state) => state.matrixStatus);
  const matrix = useAppStore((state) => state.matrix);

  const provisionalRound32 = useMemo(() => {
    const provisional = new Set<number>();
    if (!matrix) return provisional;

    const officialGroups = createInitialGroups();
    const analysis = analyzePossibleCombinations(officialGroups);
    const incompleteSet = new Set(analysis.incompleteGroups);

    // For each group, determine whether the winner and runner-up are the same
    // team across ALL possible outcomes of remaining matches (score 0-6).
    // Groups with no pending matches are trivially fixed.
    const fixedByGroup = new Map<string, { winner: boolean; runnerUp: boolean }>();
    for (const letter of GROUP_LETTERS) {
      const group = officialGroups[letter];
      const pendingIdxs = group.matches
        .map((m, i) => (m.status === 'completed' ? -1 : i))
        .filter((i) => i >= 0);

      if (pendingIdxs.length === 0) {
        fixedByGroup.set(letter, { winner: true, runnerUp: true });
        continue;
      }

      let firstWinner: string | null = null;
      let firstRunnerUp: string | null = null;
      let winnerFixed = true;
      let runnerUpFixed = true;
      const ms = group.matches.map((m) => ({ ...m }));

      const scan = (pi: number) => {
        if (!winnerFixed && !runnerUpFixed) return;
        if (pi === pendingIdxs.length) {
          const ordered = calculateGroupStandings({ ...group, matches: ms });
          const w = ordered[0]?.code ?? null;
          const r = ordered[1]?.code ?? null;
          if (firstWinner === null) firstWinner = w;
          else if (firstWinner !== w) winnerFixed = false;
          if (firstRunnerUp === null) firstRunnerUp = r;
          else if (firstRunnerUp !== r) runnerUpFixed = false;
          return;
        }
        const mi = pendingIdxs[pi];
        const orig = ms[mi];
        for (let hg = 0; hg <= 6 && (winnerFixed || runnerUpFixed); hg++) {
          for (let ag = 0; ag <= 6 && (winnerFixed || runnerUpFixed); ag++) {
            ms[mi] = { ...orig, homeGoals: hg, awayGoals: ag, status: 'completed' };
            scan(pi + 1);
          }
        }
        ms[mi] = orig;
      };
      scan(0);
      fixedByGroup.set(letter, { winner: winnerFixed, runnerUp: runnerUpFixed });
    }

    // A slot is uncertain when the actual team that fills it can still change.
    const uncertain = (slot: BracketSlot): boolean => {
      if (slot.type === 'third') return incompleteSet.has(slot.group);
      const fp = fixedByGroup.get(slot.group);
      return !fp || (slot.type === 'winner' ? !fp.winner : !fp.runnerUp);
    };

    const signatures = new Map<number, Set<string>>();
    for (const scenario of matrix.scenarios) {
      if (!analysis.possibleKeys.has(scenario.groupCombination)) continue;
      for (const matchup of scenario.matchups) {
        const signature = `${matchup.team1.type}:${matchup.team1.group}|${matchup.team2.type}:${matchup.team2.group}`;
        const values = signatures.get(matchup.matchNumber) ?? new Set<string>();
        values.add(signature);
        signatures.set(matchup.matchNumber, values);

        if (uncertain(matchup.team1) || uncertain(matchup.team2)) {
          provisional.add(matchup.matchNumber);
        }
      }
    }

    // Also mark any match whose slot assignment varies across scenarios.
    for (const [matchNumber, values] of signatures) {
      if (values.size > 1) provisional.add(matchNumber);
    }
    return provisional;
  }, [matrix]);

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
  const findMatch = (id: number) => matches.find((m) => m.matchNumber === id);
  const editingMatch = editing != null ? findMatch(editing) : undefined;

  // ---- Waterfall (vertical, left→right) ----
  const renderColumn = (title: string, ids: number[]) => {
    const colHeight = minimized ? 'h-[820px]' : 'h-[2200px]';
    const colWidth = minimized ? 'min-w-[160px] max-w-[190px]' : 'min-w-[250px] max-w-[285px]';
    return (
      <div className={`flex flex-col shrink-0 ${colWidth}`}>
        <div className="text-center font-bold text-slate-700 bg-slate-100 py-1.5 rounded text-xs mb-3 shadow-sm border border-slate-200">
          {title}
        </div>
        <div className={`flex flex-col justify-around flex-1 ${colHeight} gap-1`}>
          {ids.map((id) => {
            const match = findMatch(id);
            return match ? (
              <KnockoutMatchCard key={id} match={match} nameByCode={names} minimized={minimized} onEdit={setEditing} provisional={provisionalRound32.has(id)} />
            ) : null;
          })}
        </div>
      </div>
    );
  };

  // ---- Face-off (classic bracket with connector lines) ----
  const cardW = minimized ? 168 : 250;
  const connW = minimized ? 22 : 34;
  const baseSlot = minimized ? 66 : 176;
  const halfH = baseSlot * 8;
  const HEADER_H = 28;

  const foRound = (label: string, ids: number[]) => (
    <div className="flex shrink-0 flex-col" style={{ width: cardW }}>
      <div style={{ height: HEADER_H }} className="flex items-end justify-center pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="flex flex-col" style={{ height: halfH }}>
        {ids.map((id) => {
          const match = findMatch(id);
          return (
            <div key={id} className="flex flex-1 items-center justify-center">
              {match ? (
                <div className="w-full">
                  <KnockoutMatchCard match={match} nameByCode={names} minimized={minimized} onEdit={setEditing} provisional={provisionalRound32.has(id)} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Connector column joining `count` pairs of the outer round into the inner round.
  // side='left'  → lines flow rightward (left half of the bracket)
  // side='right' → lines flow leftward (right half of the bracket)
  const foConn = (count: number, side: 'left' | 'right') => (
    <div className="flex shrink-0 flex-col" style={{ width: connW }}>
      <div style={{ height: HEADER_H }} />
      <div className="flex flex-col" style={{ height: halfH }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative flex-1">
            {/* stubs reaching the two outer matches */}
            <span className={`absolute top-1/4 h-0 w-1/2 border-t border-slate-300 ${side === 'left' ? 'left-0' : 'right-0'}`} />
            <span className={`absolute top-3/4 h-0 w-1/2 border-t border-slate-300 ${side === 'left' ? 'left-0' : 'right-0'}`} />
            {/* vertical merge */}
            <span className={`absolute top-1/4 h-1/2 w-0 border-l border-slate-300 ${side === 'left' ? 'left-1/2' : 'right-1/2'}`} />
            {/* line into the inner match */}
            <span className={`absolute top-1/2 h-0 w-1/2 border-t border-slate-300 ${side === 'left' ? 'left-1/2' : 'right-1/2'}`} />
          </div>
        ))}
      </div>
    </div>
  );

  // Straight horizontal line (semifinal → final)
  const foStraight = () => (
    <div className="flex shrink-0 flex-col" style={{ width: connW }}>
      <div style={{ height: HEADER_H }} />
      <div className="relative" style={{ height: halfH }}>
        <span className="absolute left-0 right-0 top-1/2 h-0 border-t border-slate-300" />
      </div>
    </div>
  );

  const foCenter = () => {
    const finalMatch = findMatch(104);
    const thirdMatch = findMatch(103);
    return (
      <div className="flex shrink-0 flex-col" style={{ width: cardW + 12 }}>
        <div style={{ height: HEADER_H }} className="flex items-end justify-center pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
            {t('bracket.rounds.final')}
          </span>
        </div>
        <div className="relative flex flex-col items-center justify-center" style={{ height: halfH }}>
          <div className="rounded-lg ring-2 ring-amber-300" style={{ width: cardW }}>
            {finalMatch ? (
              <KnockoutMatchCard match={finalMatch} nameByCode={names} minimized={minimized} onEdit={setEditing} provisional={provisionalRound32.has(104)} />
            ) : null}
          </div>
          <div className="absolute bottom-0" style={{ width: cardW }}>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {t('bracket.rounds.thirdPlace')}
            </p>
            {thirdMatch ? (
              <KnockoutMatchCard match={thirdMatch} nameByCode={names} minimized={minimized} onEdit={setEditing} provisional={provisionalRound32.has(103)} />
            ) : null}
          </div>
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
        <div className="flex items-center gap-2">
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
          {treeLayout === 'waterfall' ? (
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
          ) : (
            <div className="flex w-max items-start py-2">
              {foRound(t('bracket.rounds.round32'), FO_LEFT_R32)}
              {foConn(4, 'left')}
              {foRound(t('bracket.rounds.round16'), FO_LEFT_R16)}
              {foConn(2, 'left')}
              {foRound(t('bracket.rounds.quarterfinal'), FO_LEFT_QF)}
              {foConn(1, 'left')}
              {foRound(t('bracket.rounds.semifinal'), FO_LEFT_SF)}
              {foStraight()}
              {foCenter()}
              {foStraight()}
              {foRound(t('bracket.rounds.semifinal'), FO_RIGHT_SF)}
              {foConn(1, 'right')}
              {foRound(t('bracket.rounds.quarterfinal'), FO_RIGHT_QF)}
              {foConn(2, 'right')}
              {foRound(t('bracket.rounds.round16'), FO_RIGHT_R16)}
              {foConn(4, 'right')}
              {foRound(t('bracket.rounds.round32'), FO_RIGHT_R32)}
            </div>
          )}
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

          <div className={minimized ? 'grid grid-cols-2 gap-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-3 xl:grid-cols-2'}>
            {listMatches.map((match) => (
              <KnockoutMatchCard key={match.matchNumber} match={match} nameByCode={names} minimized={minimized} onEdit={setEditing} provisional={provisionalRound32.has(match.matchNumber)} />
            ))}
          </div>
        </div>
      )}

      {editingMatch && (
        <KnockoutEditDialog
          match={editingMatch}
          nameByCode={names}
          onClose={() => setEditing(null)}
        />
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

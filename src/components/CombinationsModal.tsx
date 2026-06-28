import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { createInitialGroups, GROUP_LETTERS } from '../data/groups';
import { rankThirdPlaces } from '../utils/scoringRules';
import { analyzePossibleCombinations } from '../utils/possibleCombinations';
import { DraggableWindow } from './DraggableWindow';
import type { Group, GroupLetter, MatrixScenario } from '../types';

interface CombinationRow {
  option: number;
  groups: Set<GroupLetter>;
  /** e.g. { '1A': '3E', '1B': '3J', ... } */
  assignments: Record<string, string>;
}

function buildRow(scenario: MatrixScenario): CombinationRow {
  const groups = new Set(scenario.groupCombination.split('') as GroupLetter[]);
  const assignments: Record<string, string> = {};
  for (const matchup of scenario.matchups) {
    let winner = null as null | { group: GroupLetter };
    let third = null as null | { group: GroupLetter };
    if (matchup.team1.type === 'winner' && matchup.team2.type === 'third') {
      winner = matchup.team1;
      third = matchup.team2;
    } else if (matchup.team2.type === 'winner' && matchup.team1.type === 'third') {
      winner = matchup.team2;
      third = matchup.team1;
    }
    if (winner && third) assignments[`1${winner.group}`] = `3${third.group}`;
  }
  return { option: scenario.option, groups, assignments };
}

function keyForGroups(groups: Set<GroupLetter>): string {
  return [...groups].sort().join('');
}

function SortIcon({
  columnKey,
  sort,
}: {
  columnKey: string;
  sort: { key: string; dir: 'asc' | 'desc' } | null;
}) {
  if (!sort || sort.key !== columnKey) {
    return <ArrowUp size={9} className="ml-0.5 inline opacity-25" aria-hidden="true" />;
  }
  return sort.dir === 'asc' ? (
    <ArrowUp size={11} className="ml-0.5 inline text-emerald-700" aria-hidden="true" />
  ) : (
    <ArrowDown size={11} className="ml-0.5 inline text-emerald-700" aria-hidden="true" />
  );
}

function qualifyingGroups(groups: Record<GroupLetter, Group>): Set<GroupLetter> {
  const ranked = rankThirdPlaces(
    GROUP_LETTERS.map((l) => groups[l]),
    true
  );
  return new Set(ranked.filter((r) => r.qualifies).map((r) => r.team.group));
}

export function CombinationsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const matrix = useAppStore((state) => state.matrix);
  const storeGroups = useAppStore((state) => state.groups);
  const isDnd = useAppStore((state) => state.isDragAndDropMode);
  const savedSimulation = useAppStore((state) => state.savedSimulation);

  const [selected, setSelected] = useState<Set<GroupLetter>>(new Set());
  const [onlyPossible, setOnlyPossible] = useState(false);
  // One sort column at a time. `null` = default (by option number ascending).
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const toggleSort = (key: string) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // third click clears, back to default order
    });

  // Official results drive the "still possible" math and the official sync.
  const officialGroups = useMemo(() => createInitialGroups(), []);

  const rows = useMemo(
    () => (matrix ? matrix.scenarios.map(buildRow) : []),
    [matrix]
  );
  const winnerColumns = matrix?.source.winnerColumns ?? [];

  const officialAnalysis = useMemo(
    () => analyzePossibleCombinations(officialGroups),
    [officialGroups]
  );
  const simulationSet = useMemo(() => {
    const sim = isDnd ? storeGroups : savedSimulation?.groups ?? storeGroups;
    return qualifyingGroups(sim);
  }, [isDnd, storeGroups, savedSimulation]);

  const isPossible = useCallback(
    (groups: Set<GroupLetter>) =>
      officialAnalysis.possibleKeys.has(keyForGroups(groups)),
    [officialAnalysis]
  );

  const thirdTeamByGroup = useMemo(() => {
    const map = {} as Record<GroupLetter, string>;
    for (const l of GROUP_LETTERS) {
      const third = officialGroups[l].teams[2];
      map[l] = third
        ? t(`teams.${third.code}`, { defaultValue: third.name })
        : l;
    }
    return map;
  }, [officialGroups, t]);

  const possibleCount = useMemo(
    () => rows.reduce((acc, r) => acc + (isPossible(r.groups) ? 1 : 0), 0),
    [rows, isPossible]
  );

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (onlyPossible && !isPossible(row.groups)) return false;
      for (const g of selected) if (!row.groups.has(g)) return false;
      return true;
    });
    if (!sort) return filtered;
    const valueFor = (row: CombinationRow): string | number => {
      if (sort.key === 'option') return row.option;
      if (sort.key === 'possible') return isPossible(row.groups) ? 1 : 0;
      if (sort.key.length === 1) {
        // Group letter column: 1 if that group's third advances in this row, else 0
        return row.groups.has(sort.key as GroupLetter) ? 1 : 0;
      }
      // Winner column (e.g. '1A'): the third-group it plays ('3E') or '' if none
      return row.assignments[sort.key] ?? '';
    };
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = valueFor(a);
      const vb = valueFor(b);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      // Stable secondary key: option number ascending
      return a.option - b.option;
    });
  }, [rows, selected, onlyPossible, isPossible, sort]);

  const selectedKey = [...selected].sort().join('');
  const exactRow =
    selected.size === 8 ? rows.find((r) => [...r.groups].sort().join('') === selectedKey) : undefined;

  // Scroll the exact match into view.
  useEffect(() => {
    if (exactRow && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [exactRow]);

  const toggleGroup = (l: GroupLetter) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const syncOfficial = () => {
    setSelected(new Set(officialAnalysis.lockedGroups));
    setOnlyPossible(true);
    setSort(null);
  };

  const subtitle = (
    <span>
      {t('combinations.subtitle', 'FIFA World Cup 26 · Anexo C')} ·{' '}
      <span className="font-semibold text-emerald-700">
        {t('combinations.possibleCount', {
          count: possibleCount,
          defaultValue: '{{count}} de 495 posibles',
        })}
      </span>
    </span>
  );

  return (
    <DraggableWindow
      title={t('combinations.title', 'Combinaciones de los 8 mejores terceros')}
      subtitle={subtitle}
      onClose={onClose}
      width={1150}
    >
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500">
            {t('combinations.advancing', 'Clasifican de')}:
          </span>
          <div className="flex flex-wrap gap-1">
            {GROUP_LETTERS.map((l) => {
              const on = selected.has(l);
              return (
                <button
                  key={l}
                  type="button"
                  data-testid={`combination-group-${l}`}
                  onClick={() => toggleGroup(l)}
                  title={thirdTeamByGroup[l]}
                  className={`h-7 w-7 rounded text-xs font-bold transition ${
                    on
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              selected.size === 8
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {selected.size}/8
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw size={12} /> {t('combinations.clear', 'Limpiar')}
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                data-testid="combinations-only-possible"
                checked={onlyPossible}
                onChange={(e) => setOnlyPossible(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              {t('combinations.onlyPossible', 'Solo posibles')}
            </label>
            <button
              type="button"
              data-testid="combinations-sync-official"
              onClick={syncOfficial}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <CheckCircle2 size={14} /> {t('combinations.syncOfficial', 'Sincronizar oficial')}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set(simulationSet))}
              className="inline-flex items-center gap-1.5 rounded border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              <FlaskConical size={14} /> {t('combinations.syncSim', 'Sincronizar simulación')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="scroll-thin min-h-0 flex-1 overflow-auto">
          {!matrix ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {t('bracket.loadingMatrix', 'Cargando matriz…')}
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 shadow-sm">
                <tr>
                  <SortableTh columnKey="option" onClick={toggleSort} sortIcon={<SortIcon columnKey="option" sort={sort} />}>
                    No.
                  </SortableTh>
                  {GROUP_LETTERS.map((l) => (
                    <SortableTh key={l} columnKey={l} onClick={toggleSort} sortIcon={<SortIcon columnKey={l} sort={sort} />} title={thirdTeamByGroup[l]} compact>
                      {l}
                    </SortableTh>
                  ))}
                  <SortableTh columnKey="possible" onClick={toggleSort} sortIcon={<SortIcon columnKey="possible" sort={sort} />}>
                    {t('combinations.possibleQ', '¿Posible?')}
                  </SortableTh>
                  {winnerColumns.map((c) => (
                    <SortableTh key={c} columnKey={c} onClick={toggleSort} sortIcon={<SortIcon columnKey={c} sort={sort} />} compact>
                      {c}
                    </SortableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const possible = isPossible(row.groups);
                  const isExact = exactRow?.option === row.option;
                  const isCurrentOfficial = keyForGroups(row.groups) === officialAnalysis.currentKey;
                  return (
                    <tr
                      key={row.option}
                      data-testid="combination-row"
                      data-current-official={isCurrentOfficial ? 'true' : undefined}
                      ref={isExact ? highlightRef : undefined}
                      className={`text-center ${
                        isExact
                          ? 'outline outline-2 -outline-offset-2 outline-amber-400'
                          : isCurrentOfficial
                            ? 'outline outline-2 -outline-offset-2 outline-sky-400'
                            : ''
                      } ${possible ? '' : 'opacity-60'}`}
                    >
                      <td className="border border-slate-200 px-2 py-1 font-mono font-bold text-slate-700">
                        {row.option}
                      </td>
                      {GROUP_LETTERS.map((l) => {
                        const adv = row.groups.has(l);
                        return (
                          <td
                            key={l}
                            title={thirdTeamByGroup[l]}
                            className={`border border-slate-200 px-1.5 py-1 font-semibold ${
                              adv ? 'bg-emerald-100 text-emerald-900' : 'text-slate-300'
                            }`}
                          >
                            {adv ? l : ''}
                          </td>
                        );
                      })}
                      <td
                        className={`border border-slate-200 px-2 py-1 font-bold ${
                          possible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {isCurrentOfficial
                          ? t('combinations.current', 'Actual')
                          : possible
                            ? t('combinations.yes', 'Sí')
                            : t('combinations.no', 'No')}
                      </td>
                      {winnerColumns.map((c) => (
                        <td
                          key={c}
                          title={row.assignments[c] ? thirdTeamByGroup[row.assignments[c].slice(1) as GroupLetter] : undefined}
                          className="border border-slate-200 px-1.5 py-1 font-mono text-slate-700"
                        >
                          {row.assignments[c] ?? ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={1 + GROUP_LETTERS.length + 1 + winnerColumns.length}
                      className="px-4 py-8 text-center text-sm italic text-slate-500"
                    >
                      {t('combinations.noMatches', 'Ninguna combinación coincide con la selección')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
    </DraggableWindow>
  );
}

function SortableTh({
  columnKey,
  onClick,
  sortIcon,
  compact,
  title,
  children,
}: {
  columnKey: string;
  onClick: (key: string) => void;
  sortIcon: React.ReactNode;
  compact?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <th className={`border border-slate-200 ${compact ? 'px-1.5' : 'px-2'} py-1.5 font-bold`}>
      <button
        type="button"
        title={title}
        onClick={() => onClick(columnKey)}
        className="inline-flex w-full items-center justify-center gap-0.5 rounded px-1 py-0.5 transition hover:bg-slate-200/70 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span>{children}</span>
        {sortIcon}
      </button>
    </th>
  );
}

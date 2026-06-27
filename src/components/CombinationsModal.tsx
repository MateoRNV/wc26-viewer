import { useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckCircle2, FlaskConical, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { createInitialGroups, GROUP_LETTERS } from '../data/groups';
import { rankThirdPlaces } from '../utils/scoringRules';
import { teamName } from '../i18n';
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

/** Possible final-points range of a group's eventual third-placed team. */
function thirdPlacePointRange(group: Group): { min: number; max: number } {
  const codes = group.teams.map((t) => t.code);
  const base: Record<string, number> = {};
  for (const c of codes) base[c] = 0;
  const remaining: typeof group.matches = [];
  for (const m of group.matches) {
    if (m.status === 'completed' && m.homeGoals !== null && m.awayGoals !== null) {
      if (m.homeGoals > m.awayGoals) base[m.homeCode] += 3;
      else if (m.homeGoals < m.awayGoals) base[m.awayCode] += 3;
      else {
        base[m.homeCode] += 1;
        base[m.awayCode] += 1;
      }
    } else {
      remaining.push(m);
    }
  }
  const k = remaining.length;
  let min = Infinity;
  let max = -Infinity;
  const total = 3 ** k;
  for (let mask = 0; mask < total; mask += 1) {
    const pts: Record<string, number> = { ...base };
    let x = mask;
    for (let i = 0; i < k; i += 1) {
      const outcome = x % 3;
      x = Math.floor(x / 3);
      const m = remaining[i];
      if (outcome === 0) pts[m.homeCode] += 3;
      else if (outcome === 1) pts[m.awayCode] += 3;
      else {
        pts[m.homeCode] += 1;
        pts[m.awayCode] += 1;
      }
    }
    const third = codes.map((c) => pts[c]).sort((a, b) => b - a)[2];
    if (third < min) min = third;
    if (third > max) max = third;
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 0;
  }
  return { min, max };
}

function qualifyingGroups(groups: Record<GroupLetter, Group>): Set<GroupLetter> {
  const ranked = rankThirdPlaces(
    GROUP_LETTERS.map((l) => groups[l]),
    true
  );
  return new Set(ranked.filter((r) => r.qualifies).map((r) => r.team.group));
}

export function CombinationsModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Official results drive the "still possible" math and the official sync.
  const officialGroups = useMemo(() => createInitialGroups(), []);

  const rows = useMemo(
    () => (matrix ? matrix.scenarios.map(buildRow) : []),
    [matrix]
  );
  const winnerColumns = matrix?.source.winnerColumns ?? [];

  // Per-group third-place point ranges from the official (real) results.
  const ranges = useMemo(() => {
    const map = {} as Record<GroupLetter, { min: number; max: number }>;
    for (const l of GROUP_LETTERS) map[l] = thirdPlacePointRange(officialGroups[l]);
    return map;
  }, [officialGroups]);

  const officialSet = useMemo(() => qualifyingGroups(officialGroups), [officialGroups]);
  const simulationSet = useMemo(() => {
    const sim = isDnd ? storeGroups : savedSimulation?.groups ?? storeGroups;
    return qualifyingGroups(sim);
  }, [isDnd, storeGroups, savedSimulation]);

  // A combination is possible if every advancing group can still out-point every
  // non-advancing one (each group's third-place points chosen independently).
  const isPossible = useMemo(() => {
    const officialKey = [...officialSet].sort().join('');
    return (groups: Set<GroupLetter>) => {
      let advMinOfMax = Infinity;
      let nonAdvMaxOfMin = -Infinity;
      for (const l of GROUP_LETTERS) {
        if (groups.has(l)) advMinOfMax = Math.min(advMinOfMax, ranges[l].max);
        else nonAdvMaxOfMin = Math.max(nonAdvMaxOfMin, ranges[l].min);
      }
      if (advMinOfMax >= nonAdvMaxOfMin) return true;
      // The currently-projected official combination is always possible.
      return [...groups].sort().join('') === officialKey;
    };
  }, [ranges, officialSet]);

  const thirdTeamByGroup = useMemo(() => {
    const map = {} as Record<GroupLetter, string>;
    for (const l of GROUP_LETTERS) {
      const third = officialGroups[l].teams[2];
      map[l] = third ? teamName(third.code, third.name) : l;
    }
    return map;
  }, [officialGroups, i18n.language]);

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

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sort || sort.key !== columnKey) {
      return <ArrowUp size={9} className="ml-0.5 inline opacity-25" aria-hidden="true" />;
    }
    return sort.dir === 'asc' ? (
      <ArrowUp size={11} className="ml-0.5 inline text-emerald-700" aria-hidden="true" />
    ) : (
      <ArrowDown size={11} className="ml-0.5 inline text-emerald-700" aria-hidden="true" />
    );
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('combinations.title', 'Combinaciones del Anexo C')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t('combinations.title', 'Combinaciones de los 8 mejores terceros')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('combinations.subtitle', 'FIFA World Cup 26 · Anexo C')} ·{' '}
              <span className="font-semibold text-emerald-700">
                {t('combinations.possibleCount', {
                  count: possibleCount,
                  defaultValue: '{{count}} de 495 posibles',
                })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.close', 'Cerrar')}
          >
            <X size={18} />
          </button>
        </div>

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
                checked={onlyPossible}
                onChange={(e) => setOnlyPossible(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              {t('combinations.onlyPossible', 'Solo posibles')}
            </label>
            <button
              type="button"
              onClick={() => setSelected(new Set(officialSet))}
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
                  <SortableTh columnKey="option" onClick={toggleSort} sortIcon={<SortIcon columnKey="option" />}>
                    No.
                  </SortableTh>
                  {GROUP_LETTERS.map((l) => (
                    <SortableTh key={l} columnKey={l} onClick={toggleSort} sortIcon={<SortIcon columnKey={l} />} compact>
                      {l}
                    </SortableTh>
                  ))}
                  <SortableTh columnKey="possible" onClick={toggleSort} sortIcon={<SortIcon columnKey="possible" />}>
                    {t('combinations.possibleQ', '¿Posible?')}
                  </SortableTh>
                  {winnerColumns.map((c) => (
                    <SortableTh key={c} columnKey={c} onClick={toggleSort} sortIcon={<SortIcon columnKey={c} />} compact>
                      {c}
                    </SortableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const possible = isPossible(row.groups);
                  const isExact = exactRow?.option === row.option;
                  return (
                    <tr
                      key={row.option}
                      ref={isExact ? highlightRef : undefined}
                      className={`text-center ${
                        isExact ? 'outline outline-2 -outline-offset-2 outline-amber-400' : ''
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
                        {possible ? t('combinations.yes', 'Sí') : t('combinations.no', 'No')}
                      </td>
                      {winnerColumns.map((c) => (
                        <td
                          key={c}
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
      </div>
    </div>
  );
}

function SortableTh({
  columnKey,
  onClick,
  sortIcon,
  compact,
  children,
}: {
  columnKey: string;
  onClick: (key: string) => void;
  sortIcon: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <th className={`border border-slate-200 ${compact ? 'px-1.5' : 'px-2'} py-1.5 font-bold`}>
      <button
        type="button"
        onClick={() => onClick(columnKey)}
        className="inline-flex w-full items-center justify-center gap-0.5 rounded px-1 py-0.5 transition hover:bg-slate-200/70 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span>{children}</span>
        {sortIcon}
      </button>
    </th>
  );
}

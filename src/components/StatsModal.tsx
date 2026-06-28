import { useMemo, useState } from 'react';
import {
  BarChart3,
  PieChart,
  FlaskConical,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Network,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { teamName } from '../i18n';
import {
  CONFEDERATIONS,
  CONFEDERATION_META,
  type Confederation,
} from '../data/confederations';
import { GROUP_LETTERS } from '../data/groups';
import {
  aggregateBy,
  aggregateMetric,
  buildTeamRecords,
  capacityIsRatio,
  capacityValue,
  confederationImpact,
  confederationSummaries,
  impactHigherIsBetter,
  IMPACT_METRICS,
  potentialParts,
  type Aggregate,
  type ImpactMetric,
  type StatDimension,
  type StatMetric,
  type TeamRecord,
} from '../utils/statistics';
import { DraggableWindow } from './DraggableWindow';
import { Flag } from './Flag';

type ChartType = 'bar' | 'donut';
type Tab = 'global' | 'confed';
type ValueMode = 'absolute' | 'share' | 'potential' | 'potentialCount';

const METRICS: StatMetric[] = ['qualified', 'eliminated', 'points', 'gf', 'ga', 'gd'];
const CHART_TYPES: ChartType[] = ['bar', 'donut'];

// Distinct palette for the 12 groups (the confederation dimension uses its own).
const GROUP_PALETTE = [
  '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0891b2',
  '#db2777', '#65a30d', '#ea580c', '#0d9488', '#7c3aed', '#4f46e5',
];

function colorFor(dimension: StatDimension, key: string): string {
  if (dimension === 'confederation') {
    return CONFEDERATION_META[key as Confederation]?.color ?? '#64748b';
  }
  return GROUP_PALETTE[GROUP_LETTERS.indexOf(key as never)] ?? '#64748b';
}

interface Datum {
  key: string;
  label: string;
  color: string;
  /** Underlying numeric value (drives donut shares and sign checks). */
  raw: number;
  /** Bar fill fraction in [0, 1], precomputed for the active value mode. */
  fraction: number;
  /** Formatted text shown next to the bar / in the donut legend. */
  display: string;
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const groups = useAppStore((state) => state.groups);
  const isDnd = useAppStore((state) => state.isDragAndDropMode);

  const [tab, setTab] = useState<Tab>('global');

  const subtitle = (
    <span className="flex items-center gap-1.5">
      {t('stats.subtitle', 'Análisis por confederación y por grupo')} ·
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${
          isDnd ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
        }`}
      >
        {isDnd ? <FlaskConical size={11} /> : <CheckCircle2 size={11} />}
        {isDnd ? t('stats.sourceSim', 'Predicción') : t('stats.sourceOfficial', 'Oficial')}
      </span>
    </span>
  );

  const tabs: Array<{ id: Tab; icon: typeof Globe2; label: string }> = [
    { id: 'global', icon: Globe2, label: t('stats.tabs.global', 'Estadísticas globales') },
    { id: 'confed', icon: Network, label: t('stats.tabs.confed', 'Confederaciones') },
  ];

  return (
    <DraggableWindow
      title={t('stats.title', 'Estadísticas y gráficos')}
      subtitle={subtitle}
      onClose={onClose}
    >
      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3 pt-2" role="tablist">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold transition ${
              tab === id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'global' ? (
        <GlobalTab groups={groups} />
      ) : (
        <ConfederationTab groups={groups} />
      )}
    </DraggableWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Global tab: flexible chart builder (dimension × metrics × charts).  */
/* ------------------------------------------------------------------ */

function GlobalTab({ groups }: { groups: ReturnType<typeof useAppStore.getState>['groups'] }) {
  const { t } = useTranslation();
  const [dimension, setDimension] = useState<StatDimension>('confederation');
  const [metrics, setMetrics] = useState<Set<StatMetric>>(new Set(['qualified', 'eliminated']));
  const [chartTypes, setChartTypes] = useState<Set<ChartType>>(new Set(['bar', 'donut']));
  const [valueMode, setValueMode] = useState<ValueMode>('absolute');

  const order = dimension === 'confederation' ? CONFEDERATIONS : GROUP_LETTERS;
  const aggregates = useMemo(() => {
    const records = buildTeamRecords(groups);
    return aggregateBy(records, dimension, order as string[]);
  }, [groups, dimension, order]);

  const labelFor = (bucket: Aggregate): string =>
    dimension === 'confederation'
      ? CONFEDERATION_META[bucket.key as Confederation]?.label ?? bucket.key
      : t('group.title', { letter: bucket.key });

  // Builds the chart data for a metric, precomputing each datum's bar fraction
  // and display text for the active value mode so the chart primitives stay dumb.
  const datasetFor = (metric: StatMetric): Datum[] => {
    const baseVals = aggregates.map((bucket) => aggregateMetric(bucket, metric));
    const capVals = aggregates.map((bucket) => capacityValue(bucket, metric));
    const maxAbs = Math.max(1e-9, ...baseVals.map((v) => Math.abs(v)));
    const maxCap = Math.max(1e-9, ...capVals.map((v) => Math.abs(v)));
    const total = baseVals.reduce((sum, v) => sum + v, 0);
    const ratio = capacityIsRatio(metric);

    return aggregates.map((bucket, i) => {
      const base = baseVals[i];
      let raw = base;
      let fraction: number;
      let display: string;
      if (valueMode === 'potential') {
        // Ratio metrics scale against their own ceiling (100%); volume metrics
        // (goals/team) have no ceiling, so scale against the largest bucket.
        raw = capVals[i];
        fraction = ratio ? Math.min(Math.max(raw, 0), 1) : Math.abs(raw) / maxCap;
        display = ratio ? `${Math.round(raw * 100)}%` : raw.toFixed(1);
      } else if (valueMode === 'potentialCount') {
        // Achieved out of the maximum possible, as a raw count ("40/90").
        const parts = potentialParts(bucket, metric);
        if (parts.max !== null) {
          fraction = parts.max > 0 ? parts.got / parts.max : 0;
          display = `${parts.got}/${parts.max}`;
        } else {
          fraction = Math.abs(base) / maxAbs;
          display = `${base}`;
        }
      } else if (valueMode === 'share') {
        fraction = Math.abs(base) / maxAbs;
        display = total > 0 ? fmtPercent(base, total) : `${base}`;
      } else {
        fraction = Math.abs(base) / maxAbs;
        display = `${base}`;
      }
      return {
        key: bucket.key,
        label: labelFor(bucket),
        color: colorFor(dimension, bucket.key),
        raw,
        fraction,
        display,
      };
    });
  };

  const metricLabel = (metric: StatMetric) => t(`stats.metrics.${metric}`);

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const selectedMetrics = METRICS.filter((m) => metrics.has(m));
  const selectedCharts = CHART_TYPES.filter((c) => chartTypes.has(c));
  const hasCards = selectedMetrics.length > 0 && selectedCharts.length > 0;

  return (
    <>
      {/* Controls */}
      <div className="shrink-0 space-y-2.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">
            {t('stats.dimension', 'Agrupar por')}
          </span>
          <div className="inline-flex rounded border border-slate-300 bg-white p-0.5">
            {(['confederation', 'group'] as StatDimension[]).map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => setDimension(dim)}
                className={`rounded px-3 py-1 text-xs font-bold transition ${
                  dimension === dim ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(`stats.dim.${dim}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">
            {t('stats.metricsLabel', 'Atributos')}
          </span>
          <div className="flex flex-wrap gap-1">
            {METRICS.map((metric) => {
              const on = metrics.has(metric);
              return (
                <button
                  key={metric}
                  type="button"
                  onClick={() => toggleSet(metrics, metric, setMetrics)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    on
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {metricLabel(metric)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">
            {t('stats.chartsLabel', 'Gráficos')}
          </span>
          <div className="flex flex-wrap gap-1">
            {CHART_TYPES.map((type) => {
              const on = chartTypes.has(type);
              const Icon = type === 'bar' ? BarChart3 : PieChart;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleSet(chartTypes, type, setChartTypes)}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
                    on
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={13} />
                  {t(`stats.chart.${type}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold text-slate-500">
            {t('stats.valueMode', 'Valores')}
          </span>
          <div className="inline-flex flex-wrap rounded border border-slate-300 bg-white p-0.5">
            {(['absolute', 'share', 'potential', 'potentialCount'] as ValueMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setValueMode(mode)}
                className={`rounded px-3 py-1 text-xs font-bold transition ${
                  valueMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(`stats.value.${mode}`)}
              </button>
            ))}
          </div>
          {(valueMode === 'potential' || valueMode === 'potentialCount') && (
            <span className="text-[11px] italic text-slate-400">
              {t(
                'stats.potentialHint',
                'Logrado sobre el máximo posible de cada confederación · goles por equipo'
              )}
            </span>
          )}
        </div>
      </div>

      {/* Charts grid */}
      <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-slate-50/50 p-4">
        {!hasCards ? (
          <p className="py-12 text-center text-sm italic text-slate-500">
            {t('stats.empty', 'Selecciona al menos un atributo y un tipo de gráfico.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {selectedMetrics.flatMap((metric) =>
              selectedCharts.map((type) => (
                <ChartCard
                  key={`${metric}-${type}`}
                  title={metricLabel(metric)}
                  typeLabel={t(`stats.chart.${type}`)}
                  data={datasetFor(metric)}
                  type={type}
                  allowDonut={valueMode === 'absolute' || valueMode === 'share'}
                  noNegativeNote={t('stats.noNegative', 'El gráfico circular no admite valores negativos.')}
                  noDonutNote={t('stats.noDonutPotential', 'El circular no aplica en modo "por potencial".')}
                  emptyNote={t('stats.noData', 'Sin datos todavía.')}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Confederation tab: per-confederation deep dive.                     */
/* ------------------------------------------------------------------ */

type TeamSortKey = 'team' | 'group' | 'position' | 'gf' | 'ga' | 'points' | 'gd';
interface TeamSort {
  key: TeamSortKey;
  dir: 'asc' | 'desc';
}

// Shared grid template so the team table header and rows stay aligned.
const TEAM_GRID = 'grid-cols-[minmax(0,1fr)_1.5rem_1.75rem_1.9rem_1.9rem_2.1rem_2.3rem]';

function SortHeader({
  sortKey,
  label,
  align = 'right',
  sort,
  onSort,
}: {
  sortKey: TeamSortKey;
  label: string;
  align?: 'left' | 'right';
  sort: TeamSort;
  onSort: (key: TeamSortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-0.5 truncate uppercase transition hover:text-slate-700 ${
        align === 'left' ? 'justify-start' : 'justify-end'
      } ${active ? 'text-emerald-600' : 'text-slate-400'}`}
    >
      <span className="truncate">{label}</span>
      {active &&
        (sort.dir === 'asc' ? <ArrowUp size={9} aria-hidden /> : <ArrowDown size={9} aria-hidden />)}
    </button>
  );
}

function ConfederationTab({ groups }: { groups: ReturnType<typeof useAppStore.getState>['groups'] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<Confederation>>(new Set());
  // Each confederation table keeps its own sort, independent of the others.
  const [sorts, setSorts] = useState<Partial<Record<Confederation, TeamSort>>>({});
  const [impactMetric, setImpactMetric] = useState<ImpactMetric>('points');
  const records = useMemo(() => buildTeamRecords(groups), [groups]);

  const impacts = useMemo(() => {
    // Rank so the best performer for the metric is always on top: highest index
    // for "good" metrics (points, goals for…), lowest for "bad" ones (eliminated,
    // goals against), keeping the green/red reading consistent down the list.
    const sign = impactHigherIsBetter(impactMetric) ? 1 : -1;
    return confederationImpact(groups, impactMetric).sort(
      (a, b) => sign * (b.index - a.index)
    );
  }, [groups, impactMetric]);
  const maxShare = Math.max(
    1e-9,
    ...impacts.flatMap((i) => [i.actualShare, i.potentialShare])
  );

  const DEFAULT_SORT: TeamSort = { key: 'points', dir: 'desc' };
  const sortFor = (c: Confederation): TeamSort => sorts[c] ?? DEFAULT_SORT;

  const onSort = (c: Confederation, key: TeamSortKey) =>
    setSorts((prev) => {
      const current = prev[c] ?? DEFAULT_SORT;
      const next: TeamSort =
        current.key === key
          ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: key === 'team' || key === 'group' ? 'asc' : 'desc' };
      return { ...prev, [c]: next };
    });

  const sortTeams = (arr: TeamRecord[], sort: TeamSort): TeamRecord[] => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const byName = (a: TeamRecord, b: TeamRecord) =>
      teamName(a.code, a.code).localeCompare(teamName(b.code, b.code));
    return [...arr].sort((a, b) => {
      if (sort.key === 'team') return sign * byName(a, b);
      if (sort.key === 'group') return sign * a.group.localeCompare(b.group) || byName(a, b);
      const diff = (a[sort.key] as number) - (b[sort.key] as number);
      return sign * diff || byName(a, b);
    });
  };
  const summaries = useMemo(() => {
    return confederationSummaries(groups).sort(
      (a, b) => b.qualificationRate - a.qualificationRate || b.qualified - a.qualified
    );
  }, [groups]);

  const maxRate = Math.max(1, ...summaries.map((s) => s.qualificationRate));

  const toggleExpanded = (confederation: Confederation) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(confederation)) next.delete(confederation);
      else next.add(confederation);
      return next;
    });
  };

  return (
    <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-auto bg-slate-50/50 p-4">
      <p className="text-xs text-slate-500">
        {t(
          'stats.confed.intro',
          'Rendimiento de cada confederación en relación a cuántos equipos aportó al torneo.'
        )}
      </p>

      {/* Qualification rate ranking */}
      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          {t('stats.confed.rateTitle', 'Tasa de clasificación')}
        </h3>
        <div className="space-y-1.5">
          {summaries.map((s) => {
            const color = colorFor('confederation', s.confederation);
            return (
              <div key={s.confederation} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 truncate text-right font-medium text-slate-600">
                  {CONFEDERATION_META[s.confederation].label}
                </span>
                <div className="relative h-5 flex-1 rounded bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ width: `${(s.qualificationRate / maxRate) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right font-bold tabular-nums text-slate-800">
                  {Math.round(s.qualificationRate * 100)}%
                  <span className="ml-1 font-normal text-slate-400">
                    {s.qualified}/{s.teams}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Impact vs potential */}
      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">
            {t('stats.confed.impactTitle', 'Rendimiento según su tamaño')}
          </h3>
          <div className="inline-flex flex-wrap rounded border border-slate-300 bg-white p-0.5">
            {IMPACT_METRICS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setImpactMetric(m)}
                className={`rounded px-2.5 py-0.5 text-[11px] font-bold transition ${
                  impactMetric === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(`stats.metrics.${m}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-slate-400">
          {t(
            'stats.confed.impactHint2',
            'La barra es la cuota real del total; la marca ▏ es lo que cabría esperar por su número de equipos. Pasar la marca = rinde por encima de su tamaño.'
          )}
        </p>
        <div className="space-y-2.5">
          {impacts.map((im) => {
            const color = colorFor('confederation', im.confederation);
            const higherBetter = impactHigherIsBetter(impactMetric);
            const good = higherBetter ? im.index >= 1 : im.index <= 1;
            const deltaPct = Math.round((im.index - 1) * 100);
            const realPct = Math.round(im.actualShare * 1000) / 10;
            const expPct = Math.round(im.potentialShare * 1000) / 10;
            return (
              <div key={im.confederation} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 truncate text-right font-medium text-slate-600">
                  {CONFEDERATION_META[im.confederation].label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="relative h-5 rounded bg-slate-100">
                    {/* actual share (solid bar) */}
                    <div
                      className="absolute inset-y-0 left-0 rounded"
                      style={{ width: `${(im.actualShare / maxShare) * 100}%`, backgroundColor: color }}
                    />
                    {/* expected-by-size marker */}
                    <div
                      className="absolute inset-y-[-2px] w-[2px] bg-slate-800"
                      style={{ left: `${(im.potentialShare / maxShare) * 100}%` }}
                      title={t('stats.confed.expectedTick', 'Esperado por su tamaño')}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {t('stats.confed.realVsExpected', {
                      real: realPct,
                      expected: expPct,
                      defaultValue: 'real {{real}}% · esperado {{expected}}%',
                    })}
                  </div>
                </div>
                <span
                  className={`w-12 shrink-0 text-right font-bold tabular-nums ${
                    good ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                  title={`${im.index.toFixed(2)}×`}
                >
                  {deltaPct > 0 ? `+${deltaPct}` : deltaPct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-confederation cards */}
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        {summaries.map((s) => {
          const color = colorFor('confederation', s.confederation);
          const isExpanded = expanded.has(s.confederation);
          const cardSort = sortFor(s.confederation);
          const teams = sortTeams(
            records.filter((record) => record.confederation === s.confederation),
            cardSort
          );
          return (
            <section
              key={s.confederation}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              <header className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                  <h4 className="text-sm font-bold text-slate-800">
                    {CONFEDERATION_META[s.confederation].label}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tabular-nums" style={{ color }}>
                    {Math.round(s.qualificationRate * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(s.confederation)}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-expanded={isExpanded}
                    aria-label={t(
                      isExpanded ? 'stats.confed.collapseTeams' : 'stats.confed.expandTeams'
                    )}
                    title={t(
                      isExpanded ? 'stats.confed.collapseTeams' : 'stats.confed.expandTeams'
                    )}
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </header>
              <p className="mb-1 text-[11px] text-slate-500">
                {t('stats.confed.qualifiedOf', {
                  qualified: s.qualified,
                  teams: s.teams,
                  defaultValue: '{{qualified}} de {{teams}} equipos clasificados',
                })}
              </p>
              <p className="mb-2 text-[11px] text-slate-500">
                {t('stats.confed.efficiencyLine', {
                  pct: Math.round(s.pointsEfficiency * 100),
                  got: s.points,
                  max: s.maxPoints,
                  defaultValue: 'Rendimiento: {{pct}}% de los puntos posibles ({{got}}/{{max}})',
                })}
              </p>
              <dl className="grid grid-cols-3 gap-y-2 text-center">
                <Stat label={t('stats.confed.share', 'Cuota R32')} value={`${Math.round(s.share * 100)}%`} />
                <Stat label={t('stats.confed.eliminated', 'Eliminados')} value={s.eliminated} />
                <Stat label={t('stats.confed.avgPoints', 'Pts/equipo')} value={s.avgPoints.toFixed(1)} />
                <Stat label={t('stats.metrics.gf', 'Goles a favor')} value={s.gf} compact />
                <Stat label={t('stats.metrics.ga', 'Goles en contra')} value={s.ga} compact />
                <Stat
                  label={t('stats.metrics.gd', 'Diferencia de goles')}
                  value={s.gd > 0 ? `+${s.gd}` : `${s.gd}`}
                  compact
                />
              </dl>
              {s.topTeam && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  {t('stats.confed.topTeam', 'Mejor equipo')}:{' '}
                  <span className="font-semibold text-slate-700">
                    {teamName(s.topTeam.code, s.topTeam.code)}
                  </span>{' '}
                  <span className="tabular-nums text-slate-400">({s.topTeam.points} pts)</span>
                </p>
              )}
              {isExpanded && (
                <div className="mt-3 overflow-hidden border-t border-slate-100 pt-2">
                  <div className={`grid ${TEAM_GRID} gap-1 px-1 pb-1 text-[10px] font-semibold`}>
                    <SortHeader sortKey="team" label={t('thirds.team', 'Equipo')} align="left" sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="group" label={t('thirds.group', 'Gr')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="position" label={t('stats.confed.position', 'Pos')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="gf" label={t('stats.confed.gf', 'GF')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="ga" label={t('stats.confed.ga', 'GC')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="points" label={t('thirds.points', 'Pts')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                    <SortHeader sortKey="gd" label={t('thirds.gd', 'DG')} sort={cardSort} onSort={(k) => onSort(s.confederation, k)} />
                  </div>
                  <div className="space-y-0.5">
                    {teams.map((team) => (
                      <div
                        key={team.code}
                        className={`grid ${TEAM_GRID} items-center gap-1 rounded px-1 py-1.5 text-right text-xs tabular-nums text-slate-600 ${
                          team.qualified ? 'bg-emerald-50' : 'bg-rose-50'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-left font-semibold text-slate-700">
                          <Flag code={team.code} className="h-3.5 w-5 shrink-0 object-cover" />
                          <span className="truncate">{teamName(team.code, team.code)}</span>
                        </span>
                        <span>{team.group}</span>
                        <span>{team.position}</span>
                        <span>{team.gf}</span>
                        <span>{team.ga}</span>
                        <span className="font-bold text-slate-800">{team.points}</span>
                        <span>{team.gd > 0 ? `+${team.gd}` : team.gd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div>
      <dd className="text-base font-bold tabular-nums text-slate-800">{value}</dd>
      <dt className={`text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{label}</dt>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared chart primitives.                                            */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  typeLabel,
  data,
  type,
  allowDonut,
  noNegativeNote,
  noDonutNote,
  emptyNote,
}: {
  title: string;
  typeLabel: string;
  data: Datum[];
  type: ChartType;
  allowDonut: boolean;
  noNegativeNote: string;
  noDonutNote: string;
  emptyNote: string;
}) {
  const hasNegative = data.some((d) => d.raw < 0);
  const allZero = data.every((d) => d.raw === 0);
  const note = (text: string) => (
    <p className="py-6 text-center text-xs italic text-slate-400">{text}</p>
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {typeLabel}
        </span>
      </header>
      {allZero ? (
        note(emptyNote)
      ) : type === 'bar' ? (
        <BarChart data={data} />
      ) : !allowDonut ? (
        note(noDonutNote)
      ) : hasNegative ? (
        note(noNegativeNote)
      ) : (
        <DonutChart data={data} />
      )}
    </section>
  );
}

/** Share of the total as a percentage, e.g. for the "% of total" value mode. */
function fmtPercent(value: number, total: number): string {
  return `${Math.round((value / total) * 1000) / 10}%`;
}

function BarChart({ data }: { data: Datum[] }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-right font-medium text-slate-600">
            {d.label}
          </span>
          <div className="relative h-5 flex-1 rounded bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${d.fraction * 100}%`, backgroundColor: d.color }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-bold tabular-nums text-slate-800">
            {d.display}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Datum[] }) {
  const radius = 60;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.raw, 0);
  const positiveData = data.filter((d) => d.raw > 0);
  const segments = positiveData.map((d, index) => {
      const fraction = total > 0 ? d.raw / total : 0;
      const len = fraction * circumference;
      const offset = positiveData
        .slice(0, index)
        .reduce((sum, previous) => sum + (total > 0 ? previous.raw / total : 0) * circumference, 0);
      return { ...d, len, gap: circumference - len, dashoffset: -offset };
    });

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img">
        <g transform="rotate(-90 80 80)">
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.len} ${s.gap}`}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-700 text-lg font-bold"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1 text-xs">
        {positiveData.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="font-medium text-slate-600">{d.label}</span>
            <span className="font-bold tabular-nums text-slate-800">{d.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { BarChart3, PieChart, FlaskConical, CheckCircle2, Globe2, Network } from 'lucide-react';
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
  confederationSummaries,
  type Aggregate,
  type StatDimension,
  type StatMetric,
} from '../utils/statistics';
import { DraggableWindow } from './DraggableWindow';

type ChartType = 'bar' | 'donut';
type Tab = 'global' | 'confed';

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
  value: number;
  color: string;
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
  const [percent, setPercent] = useState(false);

  const order = dimension === 'confederation' ? CONFEDERATIONS : GROUP_LETTERS;
  const aggregates = useMemo(() => {
    const records = buildTeamRecords(groups);
    return aggregateBy(records, dimension, order as string[]);
  }, [groups, dimension, order]);

  const labelFor = (bucket: Aggregate): string =>
    dimension === 'confederation'
      ? CONFEDERATION_META[bucket.key as Confederation]?.label ?? bucket.key
      : t('group.title', { letter: bucket.key });

  const datasetFor = (metric: StatMetric): Datum[] =>
    aggregates.map((bucket) => ({
      key: bucket.key,
      label: labelFor(bucket),
      value: aggregateMetric(bucket, metric),
      color: colorFor(dimension, bucket.key),
    }));

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
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={percent}
              onChange={(e) => setPercent(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            {t('stats.percent', 'Mostrar porcentajes')}
          </label>
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
                  percent={percent}
                  noNegativeNote={t('stats.noNegative', 'El gráfico circular no admite valores negativos.')}
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

function ConfederationTab({ groups }: { groups: ReturnType<typeof useAppStore.getState>['groups'] }) {
  const { t } = useTranslation();
  const summaries = useMemo(() => {
    return confederationSummaries(groups).sort(
      (a, b) => b.qualificationRate - a.qualificationRate || b.qualified - a.qualified
    );
  }, [groups]);

  const maxRate = Math.max(1, ...summaries.map((s) => s.qualificationRate));

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

      {/* Per-confederation cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summaries.map((s) => {
          const color = colorFor('confederation', s.confederation);
          return (
            <section
              key={s.confederation}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              <header className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                  <h4 className="text-sm font-bold text-slate-800">
                    {CONFEDERATION_META[s.confederation].label}
                  </h4>
                </div>
                <span className="text-2xl font-black tabular-nums" style={{ color }}>
                  {Math.round(s.qualificationRate * 100)}%
                </span>
              </header>
              <p className="mb-2 text-[11px] text-slate-500">
                {t('stats.confed.qualifiedOf', {
                  qualified: s.qualified,
                  teams: s.teams,
                  defaultValue: '{{qualified}} de {{teams}} equipos clasificados',
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
  percent,
  noNegativeNote,
  emptyNote,
}: {
  title: string;
  typeLabel: string;
  data: Datum[];
  type: ChartType;
  percent: boolean;
  noNegativeNote: string;
  emptyNote: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hasNegative = data.some((d) => d.value < 0);
  const allZero = data.every((d) => d.value === 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {typeLabel}
        </span>
      </header>
      {allZero ? (
        <p className="py-6 text-center text-xs italic text-slate-400">{emptyNote}</p>
      ) : type === 'bar' ? (
        <BarChart data={data} percent={percent} total={total} />
      ) : hasNegative ? (
        <p className="py-6 text-center text-xs italic text-slate-400">{noNegativeNote}</p>
      ) : (
        <DonutChart data={data} percent={percent} total={total} />
      )}
    </section>
  );
}

/**
 * Share of the total as a percentage. Only meaningful for additive, non-negative
 * metrics; when the total is not positive (e.g. goal difference sums to zero
 * across all teams) the share is undefined, so callers fall back to the raw
 * value via `canShowPercent`.
 */
function fmtPercent(value: number, total: number): string {
  return `${Math.round((value / total) * 1000) / 10}%`;
}

function canShowPercent(percent: boolean, total: number): boolean {
  return percent && total > 0;
}

function BarChart({ data, percent, total }: { data: Datum[]; percent: boolean; total: number }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="space-y-1.5">
      {data.map((d) => {
        const width = `${(Math.abs(d.value) / max) * 100}%`;
        const display = canShowPercent(percent, total) ? fmtPercent(d.value, total) : `${d.value}`;
        return (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-right font-medium text-slate-600">
              {d.label}
            </span>
            <div className="relative h-5 flex-1 rounded bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{ width, backgroundColor: d.color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-bold tabular-nums text-slate-800">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, percent, total }: { data: Datum[]; percent: boolean; total: number }) {
  const radius = 60;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = total > 0 ? d.value / total : 0;
      const len = fraction * circumference;
      const seg = { ...d, len, gap: circumference - len, dashoffset: -offset };
      offset += len;
      return seg;
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
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <li key={d.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="font-medium text-slate-600">{d.label}</span>
              <span className="font-bold tabular-nums text-slate-800">
                {canShowPercent(percent, total) ? fmtPercent(d.value, total) : d.value}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

import { Info, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { teamName } from '../i18n';
import { GROUP_LETTERS } from '../data/groups';
import { Flag } from './Flag';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Group, ThirdPlaceRanking } from '../types';

interface ThirdPlaceRowProps {
  ranking: ThirdPlaceRanking;
  draggable: boolean;
  pendingMatchCount: number;
}

function ThirdPlaceRow({ ranking, draggable, pendingMatchCount }: ThirdPlaceRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ranking.team.code, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    position: isDragging ? ('relative' as const) : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const isLocked = pendingMatchCount === 0;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-100 ${
        ranking.qualifies ? 'bg-emerald-50' : 'bg-white'
      }`}
    >
      <td className="px-1 py-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${
            ranking.qualifies ? 'bg-emerald-700' : 'bg-slate-500'
          }`}
        >
          {ranking.rank}
        </span>
      </td>
      <td className="px-1 py-2">
        <div className="flex items-center gap-1.5">
          <Flag code={ranking.team.code} className="h-3.5 w-auto rounded-[1px]" />
          <span className="font-medium text-slate-800">{teamName(ranking.team.code, ranking.team.name)}</span>
        </div>
      </td>
      <td className="px-1 py-2 text-center text-slate-600">{ranking.team.group}</td>
      <td className="px-1 py-2 text-right font-bold tabular-nums">{ranking.points}</td>
      <td className="px-1 py-2 text-right tabular-nums text-slate-700">
        {ranking.gd > 0 ? `+${ranking.gd}` : ranking.gd}
      </td>
      <td className="px-1 py-2 text-right tabular-nums text-slate-600">{ranking.gf}</td>
      <td className="px-1 py-2 text-right tabular-nums text-slate-600">
        {ranking.conductScore}
      </td>
      {/* Pending indicator column */}
      <td className="px-1 py-2 text-center">
        {isLocked ? (
          <span
            title={t('thirds.locked', 'Resultados definitivos')}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700"
          >
            ✓
          </span>
        ) : (
          <span
            title={t('thirds.pending', { count: pendingMatchCount })}
            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1 text-[9px] font-bold text-amber-700"
          >
            {pendingMatchCount}✦
          </span>
        )}
      </td>
      {draggable && (
        <td className="px-1 py-2 text-center">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="icon-button cursor-grab text-slate-500 active:cursor-grabbing hover:bg-slate-100 p-1 rounded"
            aria-label="Drag team"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
        </td>
      )}
    </tr>
  );
}

/** Returns how many matches are still unplayed for a team in its group */
function pendingMatchesForTeam(group: Group, teamCode: string): number {
  return group.matches.filter(
    (m) =>
      (m.homeCode === teamCode || m.awayCode === teamCode) &&
      m.status !== 'completed'
  ).length;
}

export function ThirdPlaceTable() {
  const { t } = useTranslation();
  const rankings = useAppStore((state) => state.thirdPlaceRankings);
  const groups = useAppStore((state) => state.groups);
  const manual = useAppStore((state) => state.isDragAndDropMode);
  const reorderThirdPlaces = useAppStore((state) => state.reorderThirdPlaces);

  const completed = GROUP_LETTERS.reduce(
    (total, letter) =>
      total + groups[letter].matches.filter((match) => match.status === 'completed').length,
    0
  );
  const qualificationActive = manual || completed === 72;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = rankings.findIndex((r) => r.team.code === active.id);
    const newIndex = rankings.findIndex((r) => r.team.code === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      const newRankings = arrayMove(rankings, oldIndex, newIndex);
      reorderThirdPlaces(newRankings.map((r) => r.team.code));
    }
  };

  const hasPending = rankings.some((r) => {
    const group = groups[r.team.group];
    return pendingMatchesForTeam(group, r.team.code) > 0;
  });

  return (
    <div className="space-y-3">
      {!qualificationActive && (
        <div className="flex gap-2 rounded border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t('thirds.incomplete', { completed })}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full min-w-[300px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-600">
                <th className="px-1 py-2 text-left font-semibold">{t('thirds.rank')}</th>
                <th className="px-1 py-2 text-left font-semibold">{t('thirds.team')}</th>
                <th className="px-1 py-2 text-center font-semibold">{t('thirds.group')}</th>
                <th className="px-1 py-2 text-right font-semibold">{t('thirds.points')}</th>
                <th className="px-1 py-2 text-right font-semibold">{t('thirds.gd')}</th>
                <th className="px-1 py-2 text-right font-semibold">{t('thirds.gf')}</th>
                <th className="px-1 py-2 text-right font-semibold">FP</th>
                <th className="px-1 py-2 text-center font-semibold w-8" title={t('thirds.statusHeader', 'Partidos pendientes')}>⏳</th>
                {manual && <th className="px-1 py-2 w-8" />}
              </tr>
            </thead>
            <SortableContext
              items={rankings.map((r) => r.team.code)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {rankings.map((ranking) => {
                  const group = groups[ranking.team.group];
                  const pendingMatchCount = pendingMatchesForTeam(group, ranking.team.code);
                  return (
                    <ThirdPlaceRow
                      key={ranking.team.code}
                      ranking={ranking}
                      draggable={manual}
                      pendingMatchCount={pendingMatchCount}
                    />
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs leading-relaxed text-slate-600">{t('thirds.tiebreakers')}</p>
        {hasPending && (
          <p className="text-xs leading-relaxed text-amber-700">
            <span className="font-bold">✦</span>{' '}
            {t('thirds.pendingNote', 'El número indica los partidos que le quedan por jugar a ese equipo. Su posición aún puede cambiar.')}
          </p>
        )}
        <p className="text-xs leading-relaxed text-emerald-700">
          <span className="font-bold">✓</span>{' '}
          {t('thirds.lockedNote', 'El equipo ha jugado todos sus partidos de grupo. Su clasificación está fijada.')}
        </p>
      </div>
    </div>
  );
}

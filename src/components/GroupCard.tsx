import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Group, Team } from '../types';
import { useAppStore } from '../store/appStore';
import { computeStats, isGroupComplete } from '../utils/scoringRules';
import { teamName } from '../i18n';
import { MatchInput } from './MatchInput';

const POSITION_STYLES = [
  'bg-emerald-700',
  'bg-emerald-700',
  'bg-amber-500 text-slate-950',
  'bg-slate-400',
];

export function GroupCard({ group }: { group: Group }) {
  const { t } = useTranslation();
  const isDnd = useAppStore((state) => state.isDragAndDropMode);
  const reorder = useAppStore((state) => state.reorderTeamInGroup);
  const isCollapsed = useAppStore((state) => state.collapsedGroups[group.letter]);
  const toggleCollapse = useAppStore((state) => state.toggleGroupCollapse);
  const stats = computeStats(group.teams, group.matches);
  const statByCode = new Map(stats.map((entry) => [entry.team.code, entry]));
  const completed = group.matches.filter((match) => match.status === 'completed').length;
  const nameByCode = (code: string) => {
    const team = group.teams.find((entry) => entry.code === code);
    return team ? teamName(team.code, team.name) : code;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = group.teams.findIndex((team) => team.code === active.id);
    const newIndex = group.teams.findIndex((team) => team.code === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      reorder(group.letter, arrayMove(group.teams, oldIndex, newIndex));
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleCollapse(group.letter)}
            className="text-slate-400 hover:text-slate-600 transition p-0.5 rounded hover:bg-slate-100"
            aria-label={isCollapsed ? t('group.expand', 'Expandir') : t('group.collapse', 'Contraer')}
            title={isCollapsed ? t('group.expand', 'Expandir') : t('group.collapse', 'Contraer')}
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <h3 className="text-sm font-bold text-slate-900">
            {t('group.title', { letter: group.letter })}
          </h3>
        </div>
        <span
          className={`text-xs font-medium ${isGroupComplete(group) ? 'text-emerald-700' : 'text-slate-500'}`}
        >
          {isDnd ? t('group.manual') : `${completed}/6`}
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={group.teams.map((team) => team.code)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 bg-slate-50 p-2">
            {group.teams.map((team, index) => {
              const teamStats = statByCode.get(team.code);
              return (
                <StandingRow
                  key={team.code}
                  team={team}
                  name={nameByCode(team.code)}
                  index={index}
                  draggable={isDnd}
                  pts={teamStats?.points ?? 0}
                  gd={teamStats?.gd ?? 0}
                  gf={teamStats?.gf ?? 0}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {!isCollapsed && (
        <div className="px-3 py-1">
          {group.matches.map((match) => (
            <MatchInput key={match.id} match={match} nameByCode={nameByCode} />
          ))}
        </div>
      )}
    </article>
  );
}

function StandingRow({
  team,
  name,
  index,
  draggable,
  pts,
  gd,
  gf,
}: {
  team: Team;
  name: string;
  index: number;
  draggable: boolean;
  pts: number;
  gd: number;
  gf: number;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.code, disabled: !draggable });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
      }}
      className={`grid min-h-9 grid-cols-[1.25rem_minmax(0,1fr)_1.75rem_2rem_1.75rem_2rem] items-center gap-1 rounded border px-1.5 text-xs ${
        index === 2 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white ${POSITION_STYLES[index]}`}>
        {index + 1}
      </span>
      <span className="truncate font-medium text-slate-800">{name}</span>
      <span className="text-right font-bold tabular-nums text-slate-900">{pts}</span>
      <span className="text-right tabular-nums text-slate-600">{gd > 0 ? `+${gd}` : gd}</span>
      <span className="text-right tabular-nums text-slate-500">{gf}</span>
      {draggable ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="icon-button cursor-grab text-slate-500 active:cursor-grabbing"
          aria-label={t('group.dragTeam', { team: name })}
          title={t('group.dragTeam', { team: name })}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

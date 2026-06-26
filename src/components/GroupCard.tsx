import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { Group, Team } from '../types';
import { useAppStore } from '../store/appStore';
import { computeStats } from '../utils/scoringRules';
import { teamName } from '../i18n';
import { MatchInput } from './MatchInput';

const POS_BADGE = ['bg-emerald-600', 'bg-emerald-600', 'bg-amber-500', 'bg-slate-400'];

export function GroupCard({ group }: { group: Group }) {
  const { t } = useTranslation();
  const isDnd = useAppStore((s) => s.isDragAndDropMode);
  const reorder = useAppStore((s) => s.reorderTeamInGroup);

  const stats = computeStats(group.teams, group.matches);
  const statByCode = new Map(stats.map((s) => [s.team.code, s]));
  const nameByCode = (code: string) => {
    const team = group.teams.find((tm) => tm.code === code);
    return team ? teamName(team.code, team.name) : code;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = group.teams.findIndex((t) => t.code === active.id);
    const newIndex = group.teams.findIndex((t) => t.code === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder(group.letter, arrayMove(group.teams, oldIndex, newIndex));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-bold text-pitch-dark">
          {t('group.title', { letter: group.letter })}
        </span>
        {isDnd && (
          <span className="text-[10px] text-slate-400">{t('group.dragHint')}</span>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={group.teams.map((t) => t.code)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {group.teams.map((team, i) => (
              <StandingRow
                key={team.code}
                team={team}
                name={nameByCode(team.code)}
                index={i}
                draggable={isDnd}
                pts={statByCode.get(team.code)?.points ?? 0}
                gd={statByCode.get(team.code)?.gd ?? 0}
                gf={statByCode.get(team.code)?.gf ?? 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!isDnd && (
        <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-1.5">
          {group.matches.map((m) => (
            <MatchInput key={m.id} match={m} nameByCode={nameByCode} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  team: Team;
  name: string;
  index: number;
  draggable: boolean;
  pts: number;
  gd: number;
  gf: number;
}

function StandingRow({ team, name, index, draggable, pts, gd, gf }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: team.code, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const isThird = index === 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
        isThird ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white ${POS_BADGE[index]}`}
      >
        {index + 1}
      </span>
      <span className="flex-1 truncate font-medium text-slate-700">{name}</span>
      <span className="w-6 text-right font-bold tabular-nums text-slate-800">{pts}</span>
      <span className="w-7 text-right tabular-nums text-slate-500">
        {gd > 0 ? `+${gd}` : gd}
      </span>
      <span className="w-5 text-right tabular-nums text-slate-400">{gf}</span>
    </div>
  );
}

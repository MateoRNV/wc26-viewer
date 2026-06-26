import { useTranslation } from 'react-i18next';
import type { BracketSlot, ResolvedMatchup } from '../types';

interface Props {
  matchups: ResolvedMatchup[];
  nameByCode: (code: string | null) => string | null;
}

export function BracketTree({ matchups, nameByCode }: Props) {
  const { t } = useTranslation();

  const slotLabel = (slot: BracketSlot): string => {
    if (slot.type === 'winner') return `1${slot.group}`;
    if (slot.type === 'runner-up') return `2${slot.group}`;
    return t('bracket.slotThird', { group: slot.group });
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {matchups.map((m) => (
        <div key={m.matchNumber} className="bracket-match">
          <SlotRow
            num={`${t('bracket.matchPrefix')}${m.matchNumber}`}
            slot={m.team1}
            name={nameByCode(m.team1Code)}
            label={slotLabel(m.team1)}
          />
          <SlotRow
            slot={m.team2}
            name={nameByCode(m.team2Code)}
            label={slotLabel(m.team2)}
          />
        </div>
      ))}
    </div>
  );
}

function SlotRow({
  num,
  slot,
  name,
  label,
}: {
  num?: string;
  slot: BracketSlot;
  name: string | null;
  label: string;
}) {
  const { t } = useTranslation();
  const isThird = slot.type === 'third';
  return (
    <div className="bracket-row">
      <span className="flex items-center gap-1.5">
        <span className="bracket-num">{num ?? ''}</span>
        <span
          className={`inline-block min-w-[34px] rounded px-1 text-center text-[10px] font-bold ${
            isThird ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {label}
        </span>
        <span className={isThird ? 'bracket-slot-third' : 'font-medium text-slate-700'}>
          {name ?? <span className="bracket-pending">{t('bracket.pending')}</span>}
        </span>
      </span>
    </div>
  );
}

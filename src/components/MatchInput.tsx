import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConductCards, Match } from '../types';
import { useAppStore } from '../store/appStore';
import { Flag } from './Flag';

interface Props {
  match: Match;
  nameByCode: (code: string) => string;
}

const CARD_FIELDS: Array<keyof ConductCards> = [
  'yellow',
  'indirectRed',
  'directRed',
  'yellowDirectRed',
];

export function MatchInput({ match, nameByCode }: Props) {
  const { t } = useTranslation();
  const [showConduct, setShowConduct] = useState(false);
  const updateResult = useAppStore((state) => state.updateMatchResult);
  const updateConduct = useAppStore((state) => state.updateMatchConduct);
  const isDnd = useAppStore((state) => state.isDragAndDropMode);

  const parseGoals = (value: string) => {
    if (value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const setCards = (
    side: 'home' | 'away',
    field: keyof ConductCards,
    value: string
  ) => {
    const parsed = Math.max(0, Number.parseInt(value, 10) || 0);
    updateConduct(match.id, side, { ...match.conduct[side], [field]: parsed });
  };

  return (
    <div className="border-t border-slate-100 py-1.5 first:border-t-0">
      <div className="grid grid-cols-[minmax(0,1fr)_1rem_2.5rem_auto_2.5rem_1rem_minmax(0,1fr)_2rem] items-center gap-1 text-xs">
        <span className="truncate text-right text-slate-700">
          {nameByCode(match.homeCode)}
        </span>
        <Flag code={match.homeCode} />
        <ScoreInput
          value={match.homeGoals}
          label={t('match.goalsAria', { team: nameByCode(match.homeCode) })}
          onChange={(value) =>
            updateResult(match.id, parseGoals(value), match.awayGoals)
          }
          disabled={!isDnd}
        />
        <span className="text-slate-400">:</span>
        <ScoreInput
          value={match.awayGoals}
          label={t('match.goalsAria', { team: nameByCode(match.awayCode) })}
          onChange={(value) =>
            updateResult(match.id, match.homeGoals, parseGoals(value))
          }
          disabled={!isDnd}
        />
        <Flag code={match.awayCode} />
        <span className="truncate text-slate-700">{nameByCode(match.awayCode)}</span>
        <button
          type="button"
          className={`icon-button ${showConduct ? 'text-amber-700' : 'text-slate-400'}`}
          onClick={() => setShowConduct((value) => !value)}
          aria-expanded={showConduct}
          aria-label={t('match.conduct')}
          title={t('match.conduct')}
        >
          <ShieldAlert size={15} aria-hidden="true" />
        </button>
      </div>
      {showConduct && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2">
          <div className="mb-1 grid grid-cols-[minmax(5rem,1fr)_repeat(4,2.25rem)] gap-1 text-center text-[10px] font-semibold text-amber-900">
            <span className="text-left">{t('match.conduct')}</span>
            {CARD_FIELDS.map((field) => (
              <span key={field}>{t(`match.cards.${field}`)}</span>
            ))}
          </div>
          {(['home', 'away'] as const).map((side) => (
            <div
              key={side}
              className="grid grid-cols-[minmax(5rem,1fr)_repeat(4,2.25rem)] items-center gap-1 py-0.5"
            >
              <span className="truncate text-[11px] text-amber-950">
                {nameByCode(side === 'home' ? match.homeCode : match.awayCode)}
              </span>
              {CARD_FIELDS.map((field) => (
                <input
                  key={field}
                  type="number"
                  min={0}
                  value={match.conduct[side][field]}
                  onChange={(event) => setCards(side, field, event.target.value)}
                  disabled={!isDnd}
                  className="h-7 w-full rounded border border-amber-200 bg-white text-center text-xs tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                  aria-label={`${nameByCode(side === 'home' ? match.homeCode : match.awayCode)} ${t(`match.cards.${field}`)}`}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreInput({
  value,
  label,
  onChange,
  disabled,
}: {
  value: number | null;
  label: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={value ?? ''}
      placeholder="-"
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-9 w-10 rounded border border-slate-300 bg-white text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
      aria-label={label}
    />
  );
}

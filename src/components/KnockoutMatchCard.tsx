import { useTranslation } from 'react-i18next';
import type { KnockoutDecision, KnockoutMatchView, KnockoutResult } from '../types';
import { useAppStore } from '../store/appStore';
import { Flag } from './Flag';

export function KnockoutMatchCard({
  match,
  nameByCode,
  minimized = false,
}: {
  match: KnockoutMatchView;
  nameByCode: (code: string | null) => string;
  minimized?: boolean;
}) {
  const { t } = useTranslation();
  const update = useAppStore((state) => state.updateKnockoutResult);
  const isDnd = useAppStore((state) => state.isDragAndDropMode);
  const ready = Boolean(match.homeCode && match.awayCode);
  const disabled = !isDnd || !ready;

  if (minimized) {
    return (
      <article className="rounded border border-slate-200 bg-white px-2.5 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] text-slate-400">M{match.matchNumber}</span>
          {match.winnerCode && (
            <span className="text-[10px] font-bold text-emerald-700">✓</span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs leading-tight ${match.winnerCode === match.homeCode ? 'font-bold text-emerald-800' : 'text-slate-700'}`}>
          {match.homeCode && <Flag code={match.homeCode} className="h-3 w-auto shrink-0 rounded-[1px]" />}
          <span className="min-w-0 flex-1 truncate">{nameByCode(match.homeCode)}</span>
          {match.homeGoals !== null && (
            <span className="shrink-0 tabular-nums font-bold text-slate-900">{match.homeGoals}</span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs leading-tight ${match.winnerCode === match.awayCode ? 'font-bold text-emerald-800' : 'text-slate-700'}`}>
          {match.awayCode && <Flag code={match.awayCode} className="h-3 w-auto shrink-0 rounded-[1px]" />}
          <span className="min-w-0 flex-1 truncate">{nameByCode(match.awayCode)}</span>
          {match.awayGoals !== null && (
            <span className="shrink-0 tabular-nums font-bold text-slate-900">{match.awayGoals}</span>
          )}
        </div>
      </article>
    );
  }

  const commit = (patch: Partial<KnockoutResult>) => {
    const next = { ...match, ...patch };
    const hasScore = next.homeGoals !== null && next.awayGoals !== null;
    const hasWinner = hasScore && (
      next.homeGoals !== next.awayGoals ||
      (next.decision === 'penalties' &&
        next.penaltiesHome !== null &&
        next.penaltiesAway !== null &&
        next.penaltiesHome !== next.penaltiesAway)
    );
    update(match.matchNumber, {
      ...patch,
      status: ready && hasWinner ? 'completed' : 'unplayed',
    });
  };

  const parse = (value: string) => {
    if (value === '') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : Math.max(0, parsed);
  };

  const setDecision = (decision: KnockoutDecision) => {
    commit({
      decision,
      penaltiesHome: decision === 'penalties' ? match.penaltiesHome : null,
      penaltiesAway: decision === 'penalties' ? match.penaltiesAway : null,
    });
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">M{match.matchNumber}</span>
        {match.winnerCode && (
          <span className="text-xs font-semibold text-emerald-700">
            {t('bracket.winner')}: {nameByCode(match.winnerCode)}
          </span>
        )}
      </div>
      <TeamScoreRow
        code={match.homeCode}
        name={nameByCode(match.homeCode)}
        label={t('match.goalsAria', { team: nameByCode(match.homeCode) })}
        value={match.homeGoals}
        disabled={disabled}
        winner={match.winnerCode === match.homeCode}
        onChange={(value) => commit({ homeGoals: parse(value) })}
      />
      <TeamScoreRow
        code={match.awayCode}
        name={nameByCode(match.awayCode)}
        label={t('match.goalsAria', { team: nameByCode(match.awayCode) })}
        value={match.awayGoals}
        disabled={disabled}
        winner={match.winnerCode === match.awayCode}
        onChange={(value) => commit({ awayGoals: parse(value) })}
      />

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5">
          {(['regular', 'extra-time', 'penalties'] as const).map((decision) => (
            <button
              key={decision}
              type="button"
              disabled={disabled}
              onClick={() => setDecision(decision)}
              className={`h-7 min-w-10 rounded px-2 text-[11px] font-bold transition disabled:opacity-40 ${
                match.decision === decision
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title={t(`bracket.decisions.${decision}`)}
              aria-label={t(`bracket.decisions.${decision}`)}
            >
              {t(`bracket.decisionShort.${decision}`)}
            </button>
          ))}
        </div>
        {match.decision === 'penalties' && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span>{t('bracket.penalties')}</span>
            <MiniScore
              value={match.penaltiesHome}
              disabled={disabled}
              label={`${t('bracket.penalties')} ${nameByCode(match.homeCode)}`}
              onChange={(value) => commit({ penaltiesHome: parse(value) })}
            />
            <span>:</span>
            <MiniScore
              value={match.penaltiesAway}
              disabled={disabled}
              label={`${t('bracket.penalties')} ${nameByCode(match.awayCode)}`}
              onChange={(value) => commit({ penaltiesAway: parse(value) })}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function TeamScoreRow({
  code,
  name,
  label,
  value,
  disabled,
  winner,
  onChange,
}: {
  code: string | null;
  name: string;
  label: string;
  value: number | null;
  disabled: boolean;
  winner: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`flex min-h-11 items-center gap-2 border-t border-slate-100 first:border-0 ${winner ? 'font-bold text-emerald-800' : 'text-slate-800'}`}>
      {code && <Flag code={code} className="h-3.5 w-auto rounded-[1px] shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value ?? ''}
        placeholder="-"
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-11 rounded border border-slate-300 text-center font-bold tabular-nums outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
      />
    </div>
  );
}

function MiniScore({
  value,
  disabled,
  label,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ''}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-8 rounded border border-slate-300 text-center font-semibold tabular-nums"
    />
  );
}

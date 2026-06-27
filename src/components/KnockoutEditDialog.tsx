import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { KnockoutDecision, KnockoutMatchView, KnockoutResult } from '../types';
import { useAppStore } from '../store/appStore';
import { Flag } from './Flag';

export function KnockoutEditDialog({
  match,
  nameByCode,
  onClose,
}: {
  match: KnockoutMatchView;
  nameByCode: (code: string | null) => string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const update = useAppStore((state) => state.updateKnockoutResult);
  const ready = Boolean(match.homeCode && match.awayCode);

  // Close on Escape
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commit = (patch: Partial<KnockoutResult>) => {
    const next = { ...match, ...patch };
    const hasScore = next.homeGoals !== null && next.awayGoals !== null;
    const hasWinner =
      hasScore &&
      (next.homeGoals !== next.awayGoals ||
        (next.decision === 'penalties' &&
          next.penaltiesHome !== null &&
          next.penaltiesAway !== null &&
          next.penaltiesHome !== next.penaltiesAway));
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`M${match.matchNumber}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-slate-500">M{match.matchNumber}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.close', 'Cerrar')}
          >
            <X size={16} />
          </button>
        </div>

        <TeamScoreRow
          code={match.homeCode}
          name={nameByCode(match.homeCode)}
          label={t('match.goalsAria', { team: nameByCode(match.homeCode) })}
          value={match.homeGoals}
          winner={match.winnerCode === match.homeCode}
          onChange={(value) => commit({ homeGoals: parse(value) })}
        />
        <TeamScoreRow
          code={match.awayCode}
          name={nameByCode(match.awayCode)}
          label={t('match.goalsAria', { team: nameByCode(match.awayCode) })}
          value={match.awayGoals}
          winner={match.winnerCode === match.awayCode}
          onChange={(value) => commit({ awayGoals: parse(value) })}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5">
            {(['regular', 'extra-time', 'penalties'] as const).map((decision) => (
              <button
                key={decision}
                type="button"
                onClick={() => setDecision(decision)}
                className={`h-7 min-w-10 rounded px-2 text-[11px] font-bold transition ${
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
                label={`${t('bracket.penalties')} ${nameByCode(match.homeCode)}`}
                onChange={(value) => commit({ penaltiesHome: parse(value) })}
              />
              <span>:</span>
              <MiniScore
                value={match.penaltiesAway}
                label={`${t('bracket.penalties')} ${nameByCode(match.awayCode)}`}
                onChange={(value) => commit({ penaltiesAway: parse(value) })}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          {t('common.done', 'Listo')}
        </button>
      </div>
    </div>
  );
}

function TeamScoreRow({
  code,
  name,
  label,
  value,
  winner,
  onChange,
}: {
  code: string | null;
  name: string;
  label: string;
  value: number | null;
  winner: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={`flex min-h-12 items-center gap-2 border-t border-slate-100 first:border-0 ${
        winner ? 'font-bold text-emerald-800' : 'text-slate-800'
      }`}
    >
      {code && <Flag code={code} className="h-4 w-auto shrink-0 rounded-[1px]" />}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value ?? ''}
        placeholder="-"
        aria-label={label}
        autoFocus={!winner}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-12 rounded border border-slate-300 text-center font-bold tabular-nums outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

function MiniScore({
  value,
  label,
  onChange,
}: {
  value: number | null;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ''}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-8 rounded border border-slate-300 text-center font-semibold tabular-nums"
    />
  );
}

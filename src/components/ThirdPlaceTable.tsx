import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { teamName } from '../i18n';

export function ThirdPlaceTable() {
  const { t } = useTranslation();
  const rankings = useAppStore((s) => s.thirdPlaceRankings);

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-slate-400">
            <th className="py-1 text-left font-semibold">{t('thirds.rank')}</th>
            <th className="py-1 text-left font-semibold">{t('thirds.team')}</th>
            <th className="py-1 text-center font-semibold">{t('thirds.group')}</th>
            <th className="py-1 text-right font-semibold">{t('thirds.points')}</th>
            <th className="py-1 text-right font-semibold">{t('thirds.gd')}</th>
            <th className="py-1 text-right font-semibold">{t('thirds.gf')}</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => (
            <tr
              key={r.team.code}
              className={`border-t border-slate-100 ${
                r.qualifies ? 'bg-emerald-50' : 'opacity-60'
              }`}
            >
              <td className="py-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white ${
                    r.qualifies ? 'bg-qualify' : 'bg-eliminate'
                  }`}
                >
                  {r.rank}
                </span>
              </td>
              <td className="py-1.5 font-medium text-slate-700">
                {teamName(r.team.code, r.team.name)}
              </td>
              <td className="py-1.5 text-center text-slate-500">{r.team.group}</td>
              <td className="py-1.5 text-right font-bold tabular-nums">{r.points}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-500">
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-400">{r.gf}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-qualify" />{' '}
          {t('thirds.qualifyLegend')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-eliminate" />{' '}
          {t('thirds.eliminatedLegend')}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-400">{t('thirds.tiebreakers')}</p>
    </div>
  );
}

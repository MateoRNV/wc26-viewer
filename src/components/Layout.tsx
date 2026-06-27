import { useState } from 'react';
import { ListOrdered, Trophy, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GroupsPanel } from './GroupsPanel';
import { ThirdPlaceTable } from './ThirdPlaceTable';
import { BracketPanel } from './BracketPanel';
import { useAppStore } from '../store/appStore';

type View = 'groups' | 'thirds' | 'bracket';

export function Layout() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<View>('groups');
  const [groupsViewOverride, setGroupsViewOverride] = useState<{
    mode: boolean;
    view: 'groups' | 'matches';
  } | null>(null);
  const collapsedGroups = useAppStore((state) => state.collapsedGroups);
  const collapseAll = useAppStore((state) => state.collapseAllGroups);
  const isDnd = useAppStore((state) => state.isDragAndDropMode);

  // Sync the groups sub-view with the mode: Official → standings, Predict → remaining matches.
  const groupsView = groupsViewOverride?.mode === isDnd
    ? groupsViewOverride.view
    : isDnd
      ? 'matches'
      : 'groups';

  const anyExpanded = Object.values(collapsedGroups).some((collapsed) => !collapsed);

  const panels: Array<{ id: View; icon: typeof UsersRound; content: React.ReactNode }> = [
    { id: 'groups', icon: UsersRound, content: <GroupsPanel viewMode={groupsView} /> },
    { id: 'thirds', icon: ListOrdered, content: <ThirdPlaceTable /> },
    { id: 'bracket', icon: Trophy, content: <BracketPanel /> },
  ];

  return (
    <main className="mx-auto w-full max-w-[1800px] flex-1 bg-white lg:grid lg:h-[calc(100vh-57px)] lg:max-h-[calc(100vh-57px)] lg:min-h-0 lg:flex-none lg:grid-cols-[minmax(410px,1.15fr)_minmax(330px,.8fr)_minmax(420px,1.15fr)] lg:overflow-hidden">
      <nav className="sticky top-0 z-30 grid grid-cols-3 border-b border-slate-200 bg-white p-2 lg:hidden" aria-label={t('panels.navigation')}>
        {panels.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveView(id)}
            className={`flex h-11 items-center justify-center gap-2 rounded text-xs font-semibold ${
              activeView === id ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            <Icon size={17} aria-hidden="true" />
            {t(`panels.nav.${id}`)}
          </button>
        ))}
      </nav>

      {panels.map(({ id, content }) => (
        <section
          key={id}
          className={`${activeView === id ? 'block' : 'hidden'} scroll-thin p-3 lg:block lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-slate-200 lg:p-4 lg:last:border-r-0`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-baseline gap-1.5">
              {t(`panels.${id}`)}
              {id === 'bracket' && (
                <span className="text-[11px] font-normal italic text-slate-400">
                  provisionales
                </span>
              )}
            </h2>
            {id === 'groups' && (
              <div className="flex gap-2">
                {groupsView === 'groups' && (
                  <button
                    type="button"
                    onClick={() => collapseAll(anyExpanded)}
                    className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
                  >
                    {anyExpanded ? t('group.collapseAll', 'Contraer todos') : t('group.expandAll', 'Expandir todos')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setGroupsViewOverride({
                      mode: isDnd,
                      view: groupsView === 'groups' ? 'matches' : 'groups',
                    })
                  }
                  className="rounded bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  {groupsView === 'groups'
                    ? t('group.viewMatches', 'Ver partidos restantes')
                    : t('group.viewGroups', 'Ver grupos')}
                </button>
              </div>
            )}
          </div>
          {content}
        </section>
      ))}
    </main>
  );
}

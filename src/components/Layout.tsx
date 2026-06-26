import { useTranslation } from 'react-i18next';
import { GroupsPanel } from './GroupsPanel';
import { ThirdPlaceTable } from './ThirdPlaceTable';
import { BracketPanel } from './BracketPanel';

export function Layout() {
  const { t } = useTranslation();
  return (
    <main className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
      <section className="scroll-thin min-h-0 overflow-y-auto rounded-xl bg-white p-3 shadow-sm">
        <PanelTitle>{t('panels.groups')}</PanelTitle>
        <GroupsPanel />
      </section>

      <section className="scroll-thin min-h-0 overflow-y-auto rounded-xl bg-white p-3 shadow-sm">
        <PanelTitle>{t('panels.thirds')}</PanelTitle>
        <ThirdPlaceTable />
      </section>

      <section className="scroll-thin min-h-0 overflow-y-auto rounded-xl bg-white p-3 shadow-sm">
        <PanelTitle>{t('panels.bracket')}</PanelTitle>
        <BracketPanel />
      </section>
    </main>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  );
}

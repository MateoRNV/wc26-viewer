import { Hand, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';

export function ModeToggle() {
  const { t } = useTranslation();
  const isDnd = useAppStore((state) => state.isDragAndDropMode);
  const toggleMode = useAppStore((state) => state.toggleMode);

  return (
    <div className="inline-flex rounded border border-white/20 bg-black/10 p-0.5" role="group" aria-label={t('modes.label')}>
      <ModeButton
        active={!isDnd}
        label={t('modes.simulator')}
        icon={<SlidersHorizontal size={15} aria-hidden="true" />}
        onClick={() => toggleMode(false)}
      />
      <ModeButton
        active={isDnd}
        label={t('modes.sandbox')}
        icon={<Hand size={15} aria-hidden="true" />}
        onClick={() => toggleMode(true)}
      />
    </div>
  );
}

function ModeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-8 items-center gap-1.5 rounded px-2 text-xs font-semibold transition sm:px-3 ${
        active ? 'bg-white text-emerald-950 shadow-sm' : 'text-white/80 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

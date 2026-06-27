import { useState } from 'react';
import { Link2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';

function encodeState(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function ProjectActions() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const resetAll = useAppStore((state) => state.resetAll);
  const exportState = useAppStore((state) => state.exportState);

  const flash = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = `state=${encodeState(exportState())}`;
    await navigator.clipboard.writeText(url.toString());
    flash(t('actions.linkCopied'));
  };

  const reset = () => {
    if (window.confirm(t('actions.resetConfirm'))) {
      resetAll();
      flash(t('actions.resetDone'));
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <ActionButton label={t('actions.reset')} icon={RotateCcw} onClick={reset} />
      <ActionButton label={t('actions.share')} icon={Link2} onClick={share} />
      {message && (
        <div role="status" className="absolute right-0 top-11 z-50 whitespace-nowrap rounded bg-slate-950 px-3 py-2 text-xs text-white shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof RotateCcw;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2.5 text-xs font-semibold text-white/90 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
      title={label}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

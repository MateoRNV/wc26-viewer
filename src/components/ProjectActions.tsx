import { useRef, useState } from 'react';
import { Download, Link2, RotateCcw, Upload } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const resetAll = useAppStore((state) => state.resetAll);
  const exportState = useAppStore((state) => state.exportState);
  const importState = useAppStore((state) => state.importState);

  const flash = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wc2026-simulation.json';
    anchor.click();
    URL.revokeObjectURL(url);
    flash(t('actions.exported'));
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      importState(await file.text());
      flash(t('actions.imported'));
    } catch {
      window.alert(t('actions.importError'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
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
    <div className="relative flex items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => importFile(event.target.files?.[0])}
      />
      <ActionButton label={t('actions.reset')} icon={RotateCcw} onClick={reset} />
      <ActionButton
        label={t('actions.import')}
        icon={Upload}
        onClick={() => inputRef.current?.click()}
      />
      <ActionButton label={t('actions.export')} icon={Download} onClick={download} />
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
  icon: typeof Download;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
      aria-label={label}
      title={label}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

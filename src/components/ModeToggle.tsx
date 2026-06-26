import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';

export function ModeToggle() {
  const { t } = useTranslation();
  const isDnd = useAppStore((s) => s.isDragAndDropMode);
  const toggleMode = useAppStore((s) => s.toggleMode);

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/15 p-1 text-sm">
      <button
        type="button"
        onClick={() => toggleMode(false)}
        className={`rounded-full px-3 py-1 font-medium transition ${
          !isDnd ? 'bg-white text-pitch-dark shadow' : 'text-white/80 hover:text-white'
        }`}
      >
        🎮 {t('modes.simulator')}
      </button>
      <button
        type="button"
        onClick={() => toggleMode(true)}
        className={`rounded-full px-3 py-1 font-medium transition ${
          isDnd ? 'bg-white text-pitch-dark shadow' : 'text-white/80 hover:text-white'
        }`}
      >
        ✋ {t('modes.sandbox')}
      </button>
    </div>
  );
}

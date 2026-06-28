import { useCallback, useEffect, useRef, useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Desired width in px (capped at 96vw on small screens). */
  width?: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * A floating, draggable window styled like the app's modals. Grab the title bar
 * to move it anywhere on the page, like a desktop window. A "focus" toggle in
 * the title bar adds a dimming backdrop that blocks the page behind; with focus
 * off the window floats freely and the rest of the page stays interactive.
 */
export function DraggableWindow({ title, subtitle, onClose, children, width = 1100 }: Props) {
  const { t } = useTranslation();
  const winRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<Point | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [pos, setPos] = useState<Point>(() => ({
    x: Math.max(8, (window.innerWidth - Math.min(width, window.innerWidth * 0.96)) / 2),
    y: Math.max(8, window.innerHeight * 0.05),
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Clamp a candidate position so the window can never be dragged fully out of
  // sight: at least ~25% of its width stays on screen horizontally (so up to
  // 75% can hide off an edge), and the title bar never leaves the top, keeping
  // it always grabbable to pull the window back — same spirit as a desktop OS.
  const clampPos = useCallback((x: number, y: number): Point => {
    const node = winRef.current;
    if (!node) return { x, y };
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const minVisibleX = w * 0.25;
    const minVisibleY = Math.min(h * 0.25, h);
    return {
      x: Math.min(Math.max(x, minVisibleX - w), window.innerWidth - minVisibleX),
      y: Math.min(Math.max(y, 0), window.innerHeight - minVisibleY),
    };
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragOffset.current) return;
      setPos(clampPos(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y));
    },
    [clampPos]
  );

  const stopDrag = useCallback(() => {
    dragOffset.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
  }, [onPointerMove]);

  // Re-clamp if the viewport shrinks so a window parked near an edge stays reachable.
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos]);

  const startDrag = (e: React.PointerEvent) => {
    // Ignore drags that start on interactive controls in the title bar.
    if ((e.target as HTMLElement).closest('button, input, label')) return;
    const node = winRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    e.preventDefault();
  };

  useEffect(() => () => stopDrag(), [stopDrag]);

  return (
    <>
      {focusMode && (
        <div className="fixed inset-0 z-[55] bg-black/40" role="presentation" />
      )}
      <div
        ref={winRef}
        className="fixed z-[60] flex max-h-[92vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
        style={{
          left: pos.x,
          top: pos.y,
          width: `min(${width}px, 96vw)`,
        }}
        role="dialog"
        aria-modal={focusMode}
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {/* Title bar (drag handle) */}
        <div
          onPointerDown={startDrag}
          className="flex cursor-move touch-none select-none items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="flex min-w-0 items-start gap-2">
            <GripHorizontal size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
              {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label
              className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              title={t('window.focusHint', 'Atenúa y bloquea la página detrás')}
            >
              <input
                type="checkbox"
                checked={focusMode}
                onChange={(e) => setFocusMode(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              {t('window.focus', 'Enfocar')}
            </label>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label={t('common.close', 'Cerrar')}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}

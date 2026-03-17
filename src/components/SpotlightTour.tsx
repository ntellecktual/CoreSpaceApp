import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type SpotlightPlacement = 'right' | 'left' | 'top' | 'bottom';

export type SpotlightStep = {
  target: string;          // DOM element ID (nativeID in RN maps to `id` in web DOM)
  title: string;
  content: string;
  placement?: SpotlightPlacement;
  padding?: number;
};

type TargetRect = { x: number; y: number; w: number; h: number };

// ── Context ───────────────────────────────────────────────────────────────────
type SpotlightTourContextType = {
  openSpotlightTour: () => void;
  closeSpotlightTour: () => void;
};

const SpotlightTourContext = createContext<SpotlightTourContextType>({
  openSpotlightTour: () => {},
  closeSpotlightTour: () => {},
});

export const useSpotlightTour = () => useContext(SpotlightTourContext);

// ── Provider + Overlay ────────────────────────────────────────────────────────
type Props = { steps: SpotlightStep[]; children?: React.ReactNode };

export const SpotlightTourProvider: React.FC<Props> = ({ steps, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rect, setRect] = useState<TargetRect>({ x: -9999, y: -9999, w: 0, h: 0 });
  const [targetFound, setTargetFound] = useState(true);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Refs for DOM elements — positions applied via setAttribute to avoid JSX inline styles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ringRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interceptorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipRef = useRef<any>(null);

  const TOOLTIP_W = 290;
  const TOOLTIP_H = 210;
  const GAP = 18;
  const M = 12;

  // ── Measuring ────────────────────────────────────────────────────────────
  const measureTarget = useCallback((stepIdx: number) => {
    if (typeof document === 'undefined') return;
    const s = steps[stepIdx];
    if (!s) return;
    const el = document.getElementById(s.target);
    if (!el) {
      setTargetFound(false);
      setRect({ x: -9999, y: -9999, w: 0, h: 0 });
      return;
    }
    setTargetFound(true);
    const r = el.getBoundingClientRect();
    const pad = s.padding ?? 10;
    setRect({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
  }, [steps]);

  useEffect(() => {
    if (!isOpen) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => measureTarget(currentIdx));
  }, [isOpen, currentIdx, measureTarget]);

  // ── Apply positions to DOM via refs (no JSX inline styles) ───────────────
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const s = steps[currentIdx];
    const placement = s?.placement ?? 'right';

    let tipLeft = 0;
    let tipTop = 0;

    if (placement === 'right') {
      tipLeft = rect.x + rect.w + GAP;
      tipTop = rect.y + rect.h / 2 - TOOLTIP_H / 2;
    } else if (placement === 'left') {
      tipLeft = rect.x - TOOLTIP_W - GAP;
      tipTop = rect.y + rect.h / 2 - TOOLTIP_H / 2;
    } else if (placement === 'bottom') {
      tipLeft = rect.x + rect.w / 2 - TOOLTIP_W / 2;
      tipTop = rect.y + rect.h + GAP;
    } else {
      tipLeft = rect.x + rect.w / 2 - TOOLTIP_W / 2;
      tipTop = rect.y - TOOLTIP_H - GAP;
    }

    if (!targetFound) {
      tipLeft = (vp.w - TOOLTIP_W) / 2;
      tipTop = (vp.h - TOOLTIP_H) / 2;
    }

    const cLeft = Math.max(M, Math.min(tipLeft, vp.w - TOOLTIP_W - M));
    const cTop = Math.max(M, Math.min(tipTop, vp.h - TOOLTIP_H - M));

    const raf = requestAnimationFrame(() => {
      const posStr = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;
      if (ringRef.current?.setAttribute) ringRef.current.setAttribute('style', posStr);
      if (interceptorRef.current?.setAttribute) interceptorRef.current.setAttribute('style', posStr);
      if (tooltipRef.current?.setAttribute) {
        tooltipRef.current.setAttribute('style', `left:${cLeft}px;top:${cTop}px;width:${TOOLTIP_W}px`);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, rect, vp, currentIdx, steps, targetFound, TOOLTIP_W, TOOLTIP_H, GAP, M]);

  // ── Viewport tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const onResize = () => measureTarget(currentIdx);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, currentIdx, measureTarget]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const openSpotlightTour = useCallback(() => {
    setCurrentIdx(0);
    setIsOpen(true);
  }, []);

  const closeSpotlightTour = useCallback(() => setIsOpen(false), []);

  // Auto-close after last step instead of staying stuck
  const next = useCallback(() => {
    setCurrentIdx((i) => {
      const n = i + 1;
      if (n >= steps.length) {
        setIsOpen(false);
        return 0;
      }
      return n;
    });
  }, [steps.length]);

  const prev = useCallback(() => setCurrentIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') closeSpotlightTour();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, next, prev, closeSpotlightTour]);

  const step = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === steps.length - 1;
  const placement = step?.placement ?? 'right';
  const arrowDir = placement === 'right' ? 'left'
    : placement === 'left' ? 'right'
    : placement === 'bottom' ? 'top'
    : 'bottom';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SpotlightTourContext.Provider value={{ openSpotlightTour, closeSpotlightTour }}>
      {children}
      {isOpen && step && typeof document !== 'undefined' && (
        <>
          {/* SVG dark overlay — click OUTSIDE the spotlight hole to close */}
          <svg className="spotlight-svg" aria-hidden="true" onClick={closeSpotlightTour}>
            {targetFound && (
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={Math.max(0, rect.w)}
                    height={Math.max(0, rect.h)}
                    rx="12"
                    fill="black"
                  />
                </mask>
              </defs>
            )}
            <rect
              width="100%"
              height="100%"
              fill="rgba(8,4,18,0.78)"
              mask={targetFound ? 'url(#spotlight-mask)' : undefined}
            />
          </svg>

          {/* Pulsing ring — positioned via ref */}
          {targetFound && <div className="spotlight-ring" ref={ringRef} />}

          {/* Click interceptor — sits OVER the transparent hole.
              Blocks click-through to page controls; advances the tour instead. */}
          {targetFound && (
            <div
              className="spotlight-interceptor"
              ref={interceptorRef}
              onClick={next}
              role="button"
              tabIndex={0}
              aria-label="Click to advance to next tour step"
            />
          )}

          {/* Tooltip — positioned via ref */}
          <div
            className={`spotlight-tooltip spotlight-tooltip-${arrowDir}`}
            ref={tooltipRef}
            role="dialog"
            aria-label={`Tour step: ${step.title}`}
          >
            <div className="spotlight-tooltip-header">
              <span className="spotlight-step-badge">{currentIdx + 1} / {steps.length}</span>
              <button className="spotlight-close-btn" onClick={closeSpotlightTour} aria-label="Close spotlight tour">
                ✕
              </button>
            </div>
            <h3 className="spotlight-title">{step.title}</h3>
            <p className="spotlight-content">{step.content}</p>
            {targetFound && <p className="spotlight-click-hint">Click the highlighted area or use Next →</p>}
            <div className="spotlight-footer">
              <button
                className="spotlight-btn spotlight-btn-back"
                onClick={prev}
                disabled={isFirst}
                aria-label="Previous step"
              >
                ← Back
              </button>
              {isLast ? (
                <button className="spotlight-btn spotlight-btn-primary" onClick={closeSpotlightTour}>
                  Done ✓
                </button>
              ) : (
                <button className="spotlight-btn spotlight-btn-primary" onClick={next} aria-label="Next step">
                  Next →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </SpotlightTourContext.Provider>
  );
};

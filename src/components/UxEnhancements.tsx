import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Text, View } from 'react-native';

// ─── Toast System ─────────────────────────────────────────────────
export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';
export type ToastItem = { id: string; message: string; severity: ToastSeverity; undoAction?: () => void };

let _addToast: ((msg: string, severity: ToastSeverity, undoAction?: () => void) => void) | null = null;
export function showToast(message: string, severity: ToastSeverity = 'info', undoAction?: () => void) {
  _addToast?.(message, severity, undoAction);
}

const severityConfig: Record<ToastSeverity, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.4)', icon: '✓' },
  error: { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.4)', icon: '✕' },
  warning: { bg: 'rgba(234,179,8,0.14)', border: 'rgba(234,179,8,0.4)', icon: '⚠' },
  info: { bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.4)', icon: 'ℹ' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    _addToast = (message, severity, undoAction) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, severity, undoAction }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
    return () => { _addToast = null; };
  }, []);

  if (Platform.OS !== 'web' || toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 11000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto' }}>
      {toasts.map((t) => {
        const cfg = severityConfig[t.severity];
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
              padding: '10px 16px', minWidth: 260, maxWidth: 380,
              backdropFilter: 'blur(14px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'cs-toast-in 0.3s ease', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>{cfg.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#F1E8FF', lineHeight: 1.4 }}>{t.message}</span>
            {t.undoAction && (
              <button
                onClick={() => { t.undoAction?.(); setToasts((prev) => prev.filter((x) => x.id !== t.id)); }}
                style={{ border: 'none', background: 'rgba(255,255,255,0.12)', color: '#E878F6', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Undo
              </button>
            )}
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 14, cursor: 'pointer', padding: 2 }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 16, borderRadius = 8 }: { width?: number | string; height?: number; borderRadius?: number }) {
  if (Platform.OS !== 'web') {
    return <View style={{ width: width as any, height, borderRadius, backgroundColor: 'rgba(255,255,255,0.06)' }} />;
  }
  return (
    <div style={{ width: typeof width === 'number' ? width : width, height, borderRadius, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'cs-skeleton 1.5s ease infinite' }} />
  );
}

export function SkeletonCard() {
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(10,14,24,0.72)', padding: 14, gap: 10 }}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={10} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={50} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 8, padding: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Skeleton width={70} height={20} borderRadius={10} />
            <Skeleton width="50%" height={14} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={80} height={10} />
            <Skeleton width={60} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────
export function Sparkline({ data, width = 80, height = 24, color = '#8C5BF5' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (Platform.OS !== 'web' || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={data.length > 0 ? (((data.length - 1) / (data.length - 1)) * width).toString() : '0'} cy={data.length > 0 ? (height - ((data[data.length - 1] - min) / range) * (height - 4) - 2).toString() : '0'} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────
export function Breadcrumb({ items, onNavigate }: { items: { label: string; key: string }[]; onNavigate?: (key: string) => void }) {
  if (Platform.OS !== 'web') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: '6px 0' }}>
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          {i > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>›</span>}
          {i < items.length - 1 ? (
            <span
              onClick={() => onNavigate?.(item.key)}
              style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#E878F6'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
            >
              {item.label}
            </span>
          ) : (
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Saving Indicator ─────────────────────────────────────────────
export function SavingIndicator({ saving }: { saving: boolean }) {
  if (Platform.OS !== 'web') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: saving ? '#E878F6' : '#86EFAC',
      transition: 'opacity 0.3s', opacity: saving ? 1 : 0.7,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {saving ? (
        <>
          <div style={{ width: 12, height: 12, border: '2px solid rgba(232,120,246,0.3)', borderTopColor: '#E878F6', borderRadius: '50%', animation: 'cs-spin 0.8s linear infinite' }} />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 14 }}>✓</span>
          <span>Saved</span>
        </>
      )}
    </div>
  );
}

// ─── CSS Keyframes Injection ──────────────────────────────────────
export function injectUxAnimations() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const id = 'cs-ux-animations';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes cs-toast-in { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes cs-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes cs-spin { to { transform: rotate(360deg); } }
    @keyframes cs-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cs-slide-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes cs-scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes cs-count-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cs-pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(140,91,245,0); } 50% { box-shadow: 0 0 0 4px rgba(140,91,245,0.22); } }
    @keyframes cs-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    [data-animate-in] { animation: cs-fade-in 0.35s ease both; }
    [data-animate-stagger] > * { animation: cs-fade-in 0.35s ease both; }
    [data-animate-stagger] > *:nth-child(1) { animation-delay: 0ms; }
    [data-animate-stagger] > *:nth-child(2) { animation-delay: 50ms; }
    [data-animate-stagger] > *:nth-child(3) { animation-delay: 100ms; }
    [data-animate-stagger] > *:nth-child(4) { animation-delay: 150ms; }
    [data-animate-stagger] > *:nth-child(5) { animation-delay: 200ms; }
    [data-animate-stagger] > *:nth-child(6) { animation-delay: 250ms; }
    [data-animate-stagger] > *:nth-child(7) { animation-delay: 300ms; }
    [data-animate-stagger] > *:nth-child(8) { animation-delay: 350ms; }
    [data-animate-stagger] > *:nth-child(n+9) { animation-delay: 400ms; }

    [data-kpi-animate] { animation: cs-count-up 0.5s ease both; }
    [data-scale-in] { animation: cs-scale-in 0.3s ease both; }
    [data-slide-in] { animation: cs-slide-in 0.3s ease both; }

    /* DnD styles */
    [data-dnd-dragging] { opacity: 0.5; transform: scale(0.95); transition: opacity 0.15s, transform 0.15s; }
    [data-dnd-over] { border-color: rgba(140,91,245,0.6) !important; background-color: rgba(140,91,245,0.08) !important; transition: border-color 0.15s, background-color 0.15s; }
    [data-dnd-card] { cursor: grab; transition: box-shadow 0.15s, transform 0.15s; }
    [data-dnd-card]:active { cursor: grabbing; box-shadow: 0 4px 16px rgba(140,91,245,0.3); }

    /* Sort header hover */
    [data-sortable] { cursor: pointer; user-select: none; transition: color 0.15s; }
    [data-sortable]:hover { color: #E878F6 !important; }

    /* Light mode improvements */
    [data-theme="day"] { --surface: #FAFBFC; --surface-raised: #FFFFFF; --border: rgba(0,0,0,0.08); --text: #1A1230; --text-dim: rgba(0,0,0,0.5); --accent-soft: rgba(140,91,245,0.08); }
    [data-theme="night"] { --surface: #0A0E18; --surface-raised: rgba(255,255,255,0.04); --border: rgba(255,255,255,0.08); --text: #E2D9F3; --text-dim: rgba(255,255,255,0.45); --accent-soft: rgba(140,91,245,0.18); }

    /* ── Modern interaction utilities ── */

    /* Button hover lift + colour-shift */
    .cs-btn-primary {
      transition: background 0.18s ease, transform 0.14s ease, box-shadow 0.18s ease;
    }
    .cs-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(140,91,245,0.35);
      filter: brightness(1.08);
    }
    .cs-btn-primary:active { transform: translateY(0); box-shadow: none; }

    .cs-btn-secondary {
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
    }
    .cs-btn-secondary:hover {
      border-color: rgba(140,91,245,0.55) !important;
      background: rgba(140,91,245,0.08) !important;
      transform: translateY(-1px);
    }
    .cs-btn-secondary:active { transform: translateY(0); }

    /* Card hover lift */
    .cs-card-hover {
      transition: box-shadow 0.2s ease, transform 0.18s ease;
    }
    .cs-card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    }

    /* Input focus glow */
    .cs-input {
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .cs-input:focus {
      outline: none;
      border-color: rgba(140,91,245,0.65) !important;
      box-shadow: 0 0 0 3px rgba(140,91,245,0.18);
    }

    /* Nav item smooth highlight */
    .cs-nav-item {
      transition: background 0.15s ease, color 0.15s ease, border-left-color 0.15s ease;
    }
    .cs-nav-item:hover {
      background: rgba(140,91,245,0.08) !important;
    }

    /* Pill toggle */
    .cs-pill {
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .cs-pill:hover {
      border-color: rgba(140,91,245,0.55) !important;
    }

    /* Status dot pulse for active states */
    .cs-dot-active {
      animation: cs-pulse-glow 2s ease infinite;
    }

    /* Gradient text utility */
    .cs-gradient-text {
      background: linear-gradient(135deg, #A78BFA 0%, #E878F6 60%, #60A5FA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Glass card surface */
    .cs-glass {
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    /* Scrollbar modernisation */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(140,91,245,0.25); border-radius: 6px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(140,91,245,0.45); }

    /* Selection highlight */
    ::selection { background: rgba(140,91,245,0.28); color: inherit; }

    /* Smooth focus-visible ring for accessibility */
    :focus-visible {
      outline: 2px solid rgba(140,91,245,0.70);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

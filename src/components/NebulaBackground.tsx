import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';

type NebulaProps = { mode?: 'night' | 'day' };

/* Inject keyframes once — shared across all screens */
const STYLE_ID = 'cs-nebula-css';
function ensureCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes cs-nebula-drift {
      0%   { background-position: 0% 50%, 100% 50%, 50% 100%; }
      33%  { background-position: 50% 0%, 0% 100%, 100% 0%; }
      66%  { background-position: 100% 50%, 50% 0%, 0% 50%; }
      100% { background-position: 0% 50%, 100% 50%, 50% 100%; }
    }
    @keyframes cs-twinkle-a {
      0%, 100% { opacity: var(--cs-star-lo); }
      50%      { opacity: var(--cs-star-hi); }
    }
    @keyframes cs-twinkle-b {
      0%, 100% { opacity: var(--cs-star-hi); }
      40%      { opacity: var(--cs-star-lo); }
      70%      { opacity: calc(var(--cs-star-hi) * 0.8); }
    }
    @keyframes cs-twinkle-c {
      0%   { opacity: var(--cs-star-lo); }
      30%  { opacity: var(--cs-star-hi); }
      60%  { opacity: calc(var(--cs-star-lo) * 1.2); }
      100% { opacity: var(--cs-star-lo); }
    }
    .cs-nebula-night {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.30), transparent 60%),
        radial-gradient(ellipse 100% 90% at 80% 70%, rgba(59,130,246,0.22), transparent 55%),
        radial-gradient(ellipse 90% 100% at 50% 90%, rgba(168,85,247,0.18), transparent 50%);
      background-size: 200% 200%, 200% 200%, 200% 200%;
      animation: cs-nebula-drift 30s ease-in-out infinite;
    }
    .cs-nebula-day {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 120% 80% at 20% 30%, rgba(168,120,255,0.14), transparent 60%),
        radial-gradient(ellipse 100% 90% at 80% 70%, rgba(96,165,250,0.10), transparent 55%),
        radial-gradient(ellipse 90% 100% at 50% 90%, rgba(192,160,255,0.10), transparent 50%);
      background-size: 200% 200%, 200% 200%, 200% 200%;
      animation: cs-nebula-drift 30s ease-in-out infinite;
    }
    .cs-stars-layer {
      position: absolute; inset: 0; overflow: hidden; pointer-events: none;
    }
    .cs-star {
      position: absolute; border-radius: 50%; pointer-events: none;
    }
    .cs-vignette-night {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 30%, rgba(5,6,8,0.70) 100%);
    }
    .cs-vignette-day {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(245,241,255,0.50) 100%);
    }
  `;
  document.head.appendChild(s);
}

/* Seeded PRNG (mulberry32) for realistic scatter */
function prng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TWINKLE_ANIMS = ['cs-twinkle-a', 'cs-twinkle-b', 'cs-twinkle-c'];

type Star = {
  top: string; left: string; size: number;
  anim: string; dur: string; delay: string;
  lo: number; hi: number;
};

function makeStars(count: number): Star[] {
  const rand = prng(42);
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    const lo = 0.08 + rand() * 0.18;          // base opacity 0.08–0.26
    const hi = lo + 0.10 + rand() * 0.18;     // peak opacity adds 0.10–0.28
    out.push({
      top: `${rand() * 100}%`,
      left: `${rand() * 100}%`,
      size: 0.5 + rand() * 1.5 + (rand() < 0.08 ? 1 : 0), // mostly 0.5–2px, rare 2.5px
      anim: TWINKLE_ANIMS[Math.floor(rand() * 3)],
      dur: `${2.5 + rand() * 5}s`,            // 2.5–7.5s per star
      delay: `${rand() * 8}s`,                 // spread across 0–8s
      lo, hi,
    });
  }
  return out;
}
const STARS = makeStars(90);

export function NebulaBackground({ mode = 'night' }: NebulaProps) {
  useEffect(() => { ensureCSS(); }, []);

  const isDay = mode === 'day';
  const starBase = isDay ? [120, 90, 180] : [255, 255, 255];

  return (
    <>
      <div className={isDay ? 'cs-nebula-day' : 'cs-nebula-night'} />
      <div className="cs-stars-layer">
        {STARS.map((s, i) => {
          const dimFactor = isDay ? 0.4 : 1;
          return (
            <div
              key={i}
              className="cs-star"
              style={{
                top: s.top, left: s.left,
                width: s.size, height: s.size,
                background: `rgba(${starBase[0]},${starBase[1]},${starBase[2]},${(s.lo * dimFactor).toFixed(2)})`,
                animation: `${s.anim} ${s.dur} ease-in-out ${s.delay} infinite`,
                '--cs-star-lo': (s.lo * dimFactor).toFixed(2),
                '--cs-star-hi': (s.hi * dimFactor).toFixed(2),
              } as React.CSSProperties}
            />
          );
        })}
      </div>
      <div className={isDay ? 'cs-vignette-day' : 'cs-vignette-night'} />
    </>
  );
}

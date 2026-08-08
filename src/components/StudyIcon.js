// small glyphs for studies: ~15 family shapes chosen by render style, with
// per-id overrides for signature visuals. New studies get a sensible icon
// automatically; add an ID_ICON entry to override.

import React from 'react';

const I = ({ children }) => (
  <svg
    className="ofc-line-icon"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const GREEN = '#22c55e';
const RED = '#ef4444';
const AQUA = '#26c6da';
const AMBER = '#f5b942';
const PINK = '#ec407a';
const SKY = '#38bdf8';
const STEEL = '#5e8ca8';
const TEAL = '#14b8a6';
const ORANGE = '#f59e0b';
const VIOLET = '#a78bda';
const PURPLE = '#a855f7';

// the heat glyph needs a gradient def, and SVG ids are document-global —
// several icons can render at once, so each instance mints its own id
// (React.useId needs 18; the counter keeps the >=17 peer range working)
let heatGradSeq = 0;
const GradientLineGlyph = () => {
  const idRef = React.useRef(null);
  if (idRef.current === null) idRef.current = `ofc_heat_grad_${++heatGradSeq}`;
  const gid = idRef.current;
  return (
    <I>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8a8a" />
          <stop offset="0.55" stopColor="#eab308" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <path d="M3 17c4 0 5-5 8-5 4 0 5-6 10-8" stroke={`url(#${gid})`} strokeWidth="2.2" />
    </I>
  );
};

const GLYPHS = {
  // smooth curve threading a faint zigzag price line
  overlayLine: (
    <I>
      <path d="M3 15l5-7 5 5 8-9" opacity="0.35" />
      <path d="M3 17c5 0 6-8 10-8s5 4 8 2" stroke={SKY} strokeWidth="1.9" />
    </I>
  ),
  // overlay line with an anchor dot at its start
  anchored: (
    <I>
      <path d="M5 16c5 0 6-7 9-7s4 3 7 1" stroke={PURPLE} strokeWidth="1.9" />
      <circle cx="5" cy="16" r="2.4" fill={PURPLE} stroke="none" />
    </I>
  ),
  // two crossing curves with a dot at the intersection
  cross: (
    <I>
      <path d="M3 7c6 0 10 10 18 10" stroke={ORANGE} />
      <path d="M3 17c6 0 10-10 18-10" stroke={SKY} />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </I>
  ),
  // center line with two flanking rails
  bands: (
    <I>
      <path d="M3 6c4 3 10-2 18 2" stroke={STEEL} opacity="0.8" />
      <path d="M3 12c4 3 10-2 18 2" stroke={SKY} strokeWidth="1.9" />
      <path d="M3 18c4 3 10-2 18 2" stroke={STEEL} opacity="0.8" />
    </I>
  ),
  // rectangular step channel boxing a zigzag
  channel: (
    <I>
      <path d="M3 6h8v-2h10" stroke={TEAL} />
      <path d="M3 20h8v-2h10" stroke={TEAL} />
      <path d="M4 14l4-5 4 4 4-6 4 5" opacity="0.45" />
    </I>
  ),
  // three offset parallel waves
  ribbon: (
    <I>
      <path d="M3 7c4 2 8-3 18 1" stroke={AQUA} />
      <path d="M3 12c4 2 8-3 18 1" />
      <path d="M3 17c4 2 8-3 18 1" stroke="#f97316" />
    </I>
  ),
  // two lines with the cloud lens shaded between
  ichimoku: (
    <I>
      <path d="M3 9c5-3 9 6 18-2" stroke={GREEN} />
      <path d="M3 15c5 3 9-8 18 0" stroke={RED} />
      <path d="M3 9c5-3 9 6 18-2v0c-9 8-13-2-18 2z" fill="currentColor" opacity="0.18" stroke="none" />
    </I>
  ),
  // stack of horizontal levels, middle bold
  levels: (
    <I>
      <path d="M4 5h16M6 19h14" stroke={VIOLET} opacity="0.8" />
      <path d="M4 12h16" strokeWidth="2.1" />
      <path d="M6 8.5h12M4 15.5h13" stroke={STEEL} opacity="0.6" />
    </I>
  ),
  stairsUp: (
    <I>
      <path d="M3 19h5v-5h5V9h5V4h3" stroke={GREEN} strokeWidth="1.9" />
    </I>
  ),
  stairsDown: (
    <I>
      <path d="M3 5h5v5h5v5h5v4h3" stroke={RED} strokeWidth="1.9" />
    </I>
  ),
  // wave riding between two rails, boxed
  bounded: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 7.5h15M4.5 16.5h15" stroke={AMBER} opacity="0.65" strokeDasharray="2,2" />
      <path d="M4.5 14c3-6 5 8 7-2s4-5 8 2" stroke={SKY} />
    </I>
  ),
  // histogram bars around a zero line, boxed
  zeroHist: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 12h15" opacity="0.5" />
      <path d="M6.5 12v-4M9.5 12v-6M18.5 12v-3" stroke={GREEN} strokeWidth="2" />
      <path d="M12.5 12v3M15.5 12v5" stroke={RED} strokeWidth="2" />
    </I>
  ),
  // volatility-line family: an amplitude that swells and quiets, boxed
  volatility: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 12c1-1.5 1.5-3 2.5-3s1.5 8 3 8 2-13 3.5-13 2 10 3.5 10 1.5-4.5 2.5-6" stroke={ORANGE} strokeWidth="1.8" />
    </I>
  ),
  // rising cumulative staircase line, boxed
  cumline: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 17l4-3-1 1 5-4 2 1 5-6" stroke={SKY} strokeWidth="1.9" />
    </I>
  ),
  // diverging lines, boxed
  multiline: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 12c4-4 8-6 15-6" stroke={GREEN} />
      <path d="M4.5 12c4 4 8 6 15 6" stroke={RED} />
      <path d="M4.5 12h15" opacity="0.6" />
    </I>
  ),
  // a line whose segments wear different colors
  recolor: (
    <I>
      <path d="M3 16l5-6" stroke={AQUA} strokeWidth="2.2" />
      <path d="M8 10l4 5" stroke={AMBER} strokeWidth="2.2" />
      <path d="M12 15l4-3" stroke={PINK} strokeWidth="2.2" />
      <path d="M16 12l5-6" stroke={AQUA} strokeWidth="2.2" />
    </I>
  ),
  // grey→red heat line
  gradientLine: <GradientLineGlyph />,
  // zigzag with signal dots above and below
  marks: (
    <I>
      <path d="M3 14l5-5 4 4 5-6 4 4" opacity="0.5" />
      <circle cx="8" cy="5" r="2.2" fill={GREEN} stroke="none" />
      <circle cx="17" cy="19" r="2.2" fill={RED} stroke="none" />
    </I>
  ),
  // SAR: dotted arcs flipping sides of the trend
  sar: (
    <I>
      <path d="M3 16l8-7 8 7" opacity="0.5" />
      <path d="M4 19c2 1 4 1 6 0M14 6c2-1 4-1 6 0" stroke={AMBER} strokeDasharray="0.1,3.4" strokeWidth="2" />
    </I>
  ),
  // row of state squares
  strip: (
    <I>
      <rect x="2.5" y="9.5" width="3.4" height="5" fill={AQUA} stroke="none" />
      <rect x="6.7" y="9.5" width="3.4" height="5" fill="#8adcea" stroke="none" />
      <rect x="10.9" y="9.5" width="3.4" height="5" fill={AMBER} stroke="none" />
      <rect x="15.1" y="9.5" width="3.4" height="5" fill={PINK} stroke="none" />
      <rect x="19.3" y="9.5" width="3.4" height="5" fill="#7e57c2" stroke="none" />
    </I>
  ),
  // banded oscillator box with a step line
  yesnoOsc: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="5.5" fill="#465aff" opacity="0.35" stroke="none" />
      <rect x="2.5" y="9" width="19" height="6" fill="#beb414" opacity="0.3" stroke="none" />
      <rect x="2.5" y="15" width="19" height="5.5" fill="#be1882" opacity="0.3" stroke="none" />
      <path d="M3 12h4l3-5 4 9 3-4h5" stroke={AQUA} strokeWidth="1.8" />
    </I>
  ),
  // ratchet stop flipping sides at the trend turn
  supertrend: (
    <I>
      <path d="M3 13l7-7 7 7" opacity="0.45" />
      <path d="M3 17h5v-3h5" stroke={GREEN} strokeWidth="1.9" />
      <path d="M13 7h4v3h4" stroke={RED} strokeWidth="1.9" />
    </I>
  ),
  // horizontal volume-at-price bars hugging the right edge
  profile: (
    <I>
      <path d="M21 5h-9M21 9h-14M21 13h-11M21 17h-6" stroke={SKY} strokeWidth="2.4" opacity="0.85" />
    </I>
  ),
  // heat profile: volume-at-price bars wearing momentum-direction colors
  heatProfile: (
    <I>
      <path d="M21 5h-8" stroke={GREEN} strokeWidth="2.4" />
      <path d="M21 9h-15" stroke={RED} strokeWidth="2.4" />
      <path d="M21 13h-10" stroke="#94a3b8" strokeWidth="2.4" opacity="0.8" />
      <path d="M21 17h-6" stroke={GREEN} strokeWidth="2.4" />
    </I>
  ),
  // delta profile: buy/sell bars diverging around a center line
  buySellProfile: (
    <I>
      <path d="M12 3v18" opacity="0.45" />
      <path d="M12 6h-7M12 14h-5" stroke={GREEN} strokeWidth="2.4" />
      <path d="M12 10h7M12 18h4" stroke={RED} strokeWidth="2.4" />
    </I>
  ),
  // acceptance profile: fat time-at-price bars with a thin rejection streak
  acceptanceProfile: (
    <I>
      <path d="M21 5.5h-9M21 10h-14M21 18.5h-11" stroke={SKY} strokeWidth="3" opacity="0.8" />
      <path d="M21 14.25h-16" stroke={AMBER} strokeWidth="1.2" />
    </I>
  ),
  // hot zone levels: heat bars projecting a dashed level across the chart
  hotZones: (
    <I>
      <path d="M21 5h-6" stroke="#9ca3af" strokeWidth="2.4" opacity="0.8" />
      <path d="M21 10h-12" stroke={RED} strokeWidth="2.4" />
      <path d="M21 18h-8" stroke={AMBER} strokeWidth="2.4" />
      <path d="M2 10h7" stroke={RED} strokeWidth="1.4" strokeDasharray="2.5,2" />
    </I>
  ),
  // ascending volume columns
  volPane: (
    <I>
      <path d="M4.5 20v-5M14.5 20v-6" stroke={RED} strokeWidth="2.6" />
      <path d="M9.5 20v-9M19.5 20v-12" stroke={GREEN} strokeWidth="2.6" />
      <path d="M3 20h18" opacity="0.5" />
    </I>
  ),
  // two lines fanning from a shared origin
  compare: (
    <I>
      <circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M4 12c6-1 10-4 17-6" stroke={GREEN} />
      <path d="M4 12c6 1 10 3 17 4" stroke={RED} opacity="0.8" />
    </I>
  ),
  sigma: (
    <I>
      <text x="12" y="17" textAnchor="middle" fontSize="16" fill={TEAL} stroke="none" fontStyle="italic">σ</text>
    </I>
  ),
  beta: (
    <I>
      <text x="12" y="18" textAnchor="middle" fontSize="17" fill={SKY} stroke="none" fontStyle="italic">β</text>
    </I>
  ),
  // host-provided script studies: a plain diagonal teal line (defs can
  // override it with their own `icon` node)
  provided: (
    <I>
      <path d="M4 19L20 5" stroke={TEAL} strokeWidth="2" />
    </I>
  ),
  // code brackets hugging a plotted line — the shared custom-script icon
  scripted: (
    <I>
      <path d="M8 5L4 12l4 7" stroke={AMBER} />
      <path d="M16 5l4 7-4 7" stroke={AMBER} />
      <path d="M9 15c2 0 2.5-6 5-6" stroke={SKY} strokeWidth="1.9" />
    </I>
  ),
  // VWAP: the volume-weighted line threading faint volume columns
  vwap: (
    <I>
      <path d="M4.5 20v-6M9 20v-9M13.5 20v-4M18 20v-7" stroke={STEEL} strokeWidth="2.6" opacity="0.5" />
      <path d="M3 15c5-6 11-3 18-8" stroke={AMBER} strokeWidth="1.9" />
    </I>
  ),
  // forecast studies: solid history handing off to a dashed projection
  forecast: (
    <I>
      <path d="M3 17l4-6 4 3 3-4" stroke={SKY} strokeWidth="1.9" />
      <path d="M14 10c2.5-1.5 4.5-3 7-5" stroke={SKY} strokeWidth="1.9" strokeDasharray="2.5,2.5" />
      <path d="M17.5 4.5H21V8" stroke={SKY} strokeWidth="1.4" />
    </I>
  ),
  // Darvas: stair-stepped boxes drawn like the study — green resistance
  // top, red support bottom, faint sides
  darvas: (
    <I>
      <path d="M3 12.5v7M11 12.5v7M13 4.5v7M21 4.5v7" opacity="0.3" />
      <path d="M3 12.5h8M13 4.5h8" stroke={GREEN} strokeWidth="1.8" />
      <path d="M3 19.5h8M13 11.5h8" stroke={RED} strokeWidth="1.8" />
    </I>
  ),
  // BBTrend: signed strength columns with the band envelope drifting over
  bbTrend: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 13h15" opacity="0.5" />
      <path d="M6.5 13v-4.5M9.5 13v-6.5" stroke={GREEN} strokeWidth="2" />
      <path d="M13.5 13v3M16.5 13v5" stroke={RED} strokeWidth="2" />
      <path d="M4.5 8.5c5-2 10 4 15 6" stroke="#0284c7" strokeWidth="1.3" />
    </I>
  ),
  // Bull/Bear Power: every bar stretches above AND below the EMA line
  bullBear: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 12h15" opacity="0.5" />
      <path d="M7 12V7.5M11 12V9M15 12V6M19 12v-2" stroke="#089981" strokeWidth="1.9" />
      <path d="M7 12v2.5M11 12v4.5M15 12v2M19 12v5.5" stroke={RED} strokeWidth="1.9" />
    </I>
  ),
  // candle color ratio: green vs red candles over ratio columns around par
  candleRatio: (
    <I>
      <path d="M6.5 3.5v8.5" stroke={GREEN} strokeWidth="1.1" />
      <rect x="5" y="5" width="3" height="4.5" fill={GREEN} stroke="none" />
      <path d="M11.5 4.5v8.5" stroke={RED} strokeWidth="1.1" />
      <rect x="10" y="6.5" width="3" height="4.5" fill={RED} stroke="none" />
      <path d="M4 17.5h16.5" opacity="0.5" />
      <path d="M15 17.5v-4M18 17.5v2.5M21 17.5v-6" stroke="#c084fc" strokeWidth="1.9" />
    </I>
  ),
  // Chande Kroll: twin ATR stop rails bracketing the tape
  chandeKroll: (
    <I>
      <path d="M4 13l4-4 4 3 5-5 4 3" opacity="0.4" />
      <path d="M3 7.5h6l3-2h9" stroke="#FF6D00" strokeWidth="1.7" />
      <path d="M3 18.5h5l4-2.5h4l5-2" stroke="#2962FF" strokeWidth="1.7" />
    </I>
  ),
  // Chandelier: the exit hangs from the trend's extreme
  chandelier: (
    <I>
      <path d="M3 17l6-10 6 8 6-9" opacity="0.4" />
      <path d="M9 7v4" stroke="#2962FF" strokeWidth="1.2" strokeDasharray="1.6,1.6" />
      <path d="M9 11c4 1 7 5 12 6.5" stroke="#2962FF" strokeWidth="1.7" />
    </I>
  ),
  // Connors RSI: three momentum inputs averaged into one line
  connorsRsi: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 8c2-2.5 4 2.5 6-1" stroke="#2962FF" opacity="0.45" />
      <path d="M4.5 12c2-2.5 4 2.5 6-1" stroke="#2962FF" opacity="0.45" />
      <path d="M4.5 16c2-2.5 4 2.5 6-1" stroke="#2962FF" opacity="0.45" />
      <path d="M11.5 12c3-4.5 4.5 6 8-2" stroke="#2962FF" strokeWidth="1.9" />
    </I>
  ),
  // Fisher Transform: sharp turns with the one-bar trigger shadow
  fisher: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M6.5 17.5l4-9.5 4 8 4.5-10" stroke="#f97316" opacity="0.75" strokeWidth="1.4" />
      <path d="M4.5 17.5l4-9.5 4 8 4.5-10" stroke="#38bdf8" strokeWidth="1.8" />
    </I>
  ),
  // fractal chaos oscillator: ±1 pulses on confirmed fractals
  fractalChaos: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 12h3v-4.5h3V12h4v4.5h3V12h2" stroke="#eab308" strokeWidth="1.7" />
    </I>
  ),
  // Keltner: EMA midline with smooth ATR rails, in the study's violets
  keltner: (
    <I>
      <path d="M3 7c4-2.5 10 3 18-1.5" stroke="#a78bda" opacity="0.85" />
      <path d="M3 13c4-2.5 10 3 18-1.5" stroke="#8b5cf6" strokeWidth="1.9" />
      <path d="M3 19c4-2.5 10 3 18-1.5" stroke="#a78bda" opacity="0.85" />
    </I>
  ),
  // STARC: the straighter SMA-mid ATR channel
  starc: (
    <I>
      <path d="M3 9.5l18-4.5" stroke="#a78bda" opacity="0.85" />
      <path d="M3 15l18-4.5" stroke="#8b5cf6" strokeWidth="1.9" />
      <path d="M3 20.5l18-4.5" stroke="#a78bda" opacity="0.85" />
    </I>
  ),
  // Klinger: volume-force line and signal over faint volume ticks
  klinger: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M5.5 18.5v-2M8.5 18.5v-3.5M11.5 18.5v-1.5M14.5 18.5v-3M17.5 18.5v-2" stroke={STEEL} strokeWidth="1.5" opacity="0.55" />
      <path d="M4.5 10c3-4.5 7 6 15-3.5" stroke="#38bdf8" strokeWidth="1.8" />
      <path d="M4.5 12c4-1 8-3.5 15 0.5" stroke="#f97316" strokeWidth="1.3" />
    </I>
  ),
  // KST: the slow four-ROC swell with its SMA signal
  kst: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 16.5c4-9.5 10-9.5 15-2" stroke="#009688" strokeWidth="1.9" />
      <path d="M4.5 13.5c4-4 10-4 15 3.5" stroke="#F44336" strokeWidth="1.3" />
    </I>
  ),
  // PPO: MACD's percent twin, in its own palette and wearing the %
  ppoGlyph: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 15.5h15" opacity="0.5" />
      <path d="M6.5 15.5v-3M9.5 15.5v-4.5" stroke="#26a69a" strokeWidth="1.8" opacity="0.8" />
      <path d="M12.5 15.5v2M15.5 15.5v3" stroke="#26a69a" strokeWidth="1.8" opacity="0.5" />
      <path d="M4.5 10c4-4 8-2 15 3.5" stroke="#2962FF" strokeWidth="1.6" />
      <path d="M4.5 12.5c4-1 8-5 15-2" stroke="#ff6d00" strokeWidth="1.3" />
      <text x="18" y="9" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none">%</text>
    </I>
  ),
  // prime number bands: quantized rails stepping between prime levels
  primeBands: (
    <I>
      <path d="M3 7h5V5h5v2h5V5h3" stroke="#fbbf24" strokeWidth="1.6" />
      <path d="M3 18.5h4v2h6v-2h5v-1.5h3" stroke="#e0653e" strokeWidth="1.6" />
      <path d="M5.5 13.5l4-3 4 2 5-4" opacity="0.4" />
    </I>
  ),
  // projected aggregate volume: the day's running total climbing toward
  // the projected close (dashed target)
  volAggregate: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M5 7.5h14.5" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="2.5,2" />
      <path d="M4.5 19c5-0.5 8-3.5 10-8 1-2.5 2.5-3 5-3.5" stroke="#38bdf8" strokeWidth="1.8" />
    </I>
  ),
  // projected volume at time: actual bars vs the typical-at-this-hour curve
  volAtTime: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 15c3-6.5 6-8.5 7.5-8.5s4.5 2 7.5 8.5" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="2.5,2" />
      <path d="M4.5 16.5l2-3 2 1.5 2-4.5 2 2 2-3.5 2 2 3-2.5" stroke="#c084fc" strokeWidth="1.6" />
    </I>
  ),
  // pivot points: bold pivot with dashed resistance above / support below
  pivots: (
    <I>
      <path d="M5 4.5h14M7 8h10" stroke={RED} strokeDasharray="3,2" opacity="0.85" />
      <path d="M4 12h16" strokeWidth="2.2" />
      <path d="M7 16h10M5 19.5h14" stroke={GREEN} strokeDasharray="3,2" opacity="0.85" />
    </I>
  ),
  // chop zone: trend-angle bars sweeping the turquoise→red palette
  chopZone: (
    <I>
      <path d="M4.5 15.5v-7" stroke={TEAL} strokeWidth="2.4" />
      <path d="M8.25 16.5v-9" stroke="#2dd4bf" strokeWidth="2.4" />
      <path d="M12 17.5v-11" stroke={AMBER} strokeWidth="2.4" />
      <path d="M15.75 16.5v-9" stroke="#fb923c" strokeWidth="2.4" />
      <path d="M19.5 15.5v-7" stroke={RED} strokeWidth="2.4" />
    </I>
  ),
  // Guppy: two ribbons of averages, traders above, investors below
  guppy: (
    <I>
      <path d="M3 7.5c5 1 10-3 18 0" stroke={GREEN} opacity="0.9" />
      <path d="M3 10c5 1 10-3 18 0" stroke={GREEN} opacity="0.55" />
      <path d="M3 12.5c5 1 10-3 18 0" stroke={GREEN} opacity="0.3" />
      <path d="M3 15c5 1.5 10-2 18 0.5" stroke={RED} opacity="0.9" />
      <path d="M3 17.5c5 1.5 10-2 18 0.5" stroke={RED} opacity="0.55" />
      <path d="M3 20c5 1.5 10-2 18 0.5" stroke={RED} opacity="0.3" />
    </I>
  ),
  // Elder Impulse: three candles wearing the system's verdict colors —
  // green (buy), blue (neutral), red (sell)
  elderImpulse: (
    <I>
      <g strokeWidth="1.2">
        <path d="M5.5 3.5v17" stroke={GREEN} />
        <rect x="3.5" y="7" width="4" height="8" fill={GREEN} stroke="none" />
        <path d="M12 5v15" stroke={SKY} />
        <rect x="10" y="8.5" width="4" height="7" fill={SKY} stroke="none" />
        <path d="M18.5 3.5v17" stroke={RED} />
        <rect x="16.5" y="9" width="4" height="8" fill={RED} stroke="none" />
      </g>
    </I>
  ),
  // MACD: zero-line histogram with the MACD/signal pair crossing above it
  macd: (
    <I>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.4" />
      <path d="M4.5 16.5h15" opacity="0.5" />
      <path d="M6 16.5v-3M9 16.5v-5M12 16.5v-3.5" stroke={GREEN} strokeWidth="1.8" opacity="0.75" />
      <path d="M15 16.5v2M18 16.5v3" stroke={RED} strokeWidth="1.8" opacity="0.75" />
      <path d="M4.5 11c4-5 8-3 15 4" stroke={SKY} strokeWidth="1.8" />
      <path d="M4.5 14c4-1 8-6 15-4" stroke={ORANGE} strokeWidth="1.8" />
    </I>
  ),
  // moon cycling through phases: full → half → new
  moon: (
    <I>
      <circle cx="5.5" cy="12" r="3.1" fill={AMBER} stroke="none" />
      <circle cx="13.5" cy="12" r="3.1" stroke={AMBER} strokeWidth="1.3" />
      <path d="M13.5 8.9a3.1 3.1 0 010 6.2z" fill={AMBER} stroke="none" />
      <circle cx="21" cy="12" r="3.1" stroke={AMBER} strokeWidth="1.3" opacity="0.55" />
    </I>
  ),
  // price gapping up: two runs of bars with the empty window shaded between
  gap: (
    <I>
      <path d="M4 18.5v-6M8 19.5v-7" stroke={STEEL} strokeWidth="2.4" />
      <path d="M16 11.5v-6M20 10.5v-6" stroke={SKY} strokeWidth="2.4" />
      <rect x="10.5" y="6.5" width="3" height="12" rx="1" fill={AMBER} opacity="0.4" stroke="none" />
      <path d="M12 8.5v8" stroke={AMBER} strokeDasharray="1.5,2.2" strokeWidth="1.3" />
    </I>
  ),
  // stacked highlight boxes for nested time periods
  periodBoxes: (
    <I>
      <rect x="3" y="4" width="18" height="5" rx="1" fill={SKY} opacity="0.35" stroke={SKY} strokeWidth="1" />
      <rect x="6" y="10" width="12" height="5" rx="1" fill={VIOLET} opacity="0.35" stroke={VIOLET} strokeWidth="1" />
      <rect x="9" y="16" width="6" height="5" rx="1" fill={AMBER} opacity="0.4" stroke={AMBER} strokeWidth="1" />
    </I>
  ),
  // drawdown: equity high-watermark with the underwater dip shaded
  drawdown: (
    <I>
      <path d="M3 6h18" stroke={STEEL} strokeDasharray="2.5,2" />
      <path d="M3 6c3 0 3 9 6 11 2 1.4 4 1.4 6 0 3-2 3-11 6-11" stroke={RED} strokeWidth="1.8" />
      <path d="M3 6c3 0 3 9 6 11 2 1.4 4 1.4 6 0 3-2 3-11 6-11z" fill={RED} opacity="0.22" stroke="none" />
    </I>
  ),
};

// signature overrides where the family inference isn't right or not special enough
const ID_ICON = {
  average_true_range: 'volatility',
  true_range: 'volatility',
  donchian_width: 'volatility',
  gopalakrishnan_range: 'volatility',
  high_minus_low: 'volatility',
  ulcer_index: 'volatility',
  vwap: 'vwap',
  time_series_forecast: 'forecast',
  linreg_forecast: 'forecast',
  darvas_box: 'darvas',
  pivot_points: 'pivots',
  projected_aggregate_volume: 'volAggregate',
  projected_volume_at_time: 'volAtTime',
  chop_zone: 'chopZone',
  guppy_mma: 'guppy',
  heat_profile: 'heatProfile',
  buy_sell_profile: 'buySellProfile',
  acceptance_profile: 'acceptanceProfile',
  hot_zone_levels: 'hotZones',
  elder_impulse: 'elderImpulse',
  macd: 'macd',
  moon_phases: 'moon',
  gaps: 'gap',
  multi_time_period: 'periodBoxes',
  drawdown: 'drawdown',
  ma_cross: 'cross',
  anchored_vwap: 'anchored',
  alligator: 'ribbon',
  ichimoku: 'ichimoku',
  donchian_channel: 'channel',
  fractal_chaos_bands: 'channel',
  valuation_lines: 'levels',
  prime_number_bands: 'primeBands',
  bb_trend: 'bbTrend',
  bull_bear_power: 'bullBear',
  candle_color_ratio: 'candleRatio',
  chande_kroll_stop: 'chandeKroll',
  chandelier_exit: 'chandelier',
  connors_rsi: 'connorsRsi',
  fisher_transform: 'fisher',
  fractal_chaos_oscillator: 'fractalChaos',
  keltner_channel: 'keltner',
  starc_bands: 'starc',
  klinger_volume_osc: 'klinger',
  know_sure_thing: 'kst',
  ppo: 'ppoGlyph',
  highest_high: 'stairsUp',
  lowest_low: 'stairsDown',
  supertrend: 'supertrend',
  parabolic_sar: 'sar',
  pressure_trend: 'gradientLine',
  yesno_oscillator: 'yesnoOsc',
  yesno_trend: 'strip',
  standard_deviation: 'sigma',
  historical_volatility: 'sigma',
  beta: 'beta',
  correlation_coefficient: 'compare',
  performance_index: 'compare',
  price_relative: 'compare',
  volume_display: 'volPane',
  volume_underlay: 'volPane',
};

const familyFor = (def) => {
  if (def.provided) return 'provided';
  if (def.custom) return 'scripted';
  if (ID_ICON[def.id]) return ID_ICON[def.id];
  if (def.renderAs === 'recolor') return 'recolor';
  if (def.renderAs === 'icons') return 'marks';
  if (def.renderAs === 'ribbon') return 'strip';
  if (def.renderAs === 'profile') return 'profile';
  if (def.renderAs === 'underlay') return 'volPane';
  if (def.renderAs === 'pane') {
    if (def.paneStyle === 'baseline') return 'zeroHist';
    if (def.lines) return 'multiline';
    if (def.paneRef != null) return 'bounded';
    return 'cumline';
  }
  if (def.lines) return def.lines.length >= 4 ? 'ribbon' : 'bands';
  return 'overlayLine';
};

// defs may carry their own icon node (host-provided studies' `icon` param);
// otherwise the family glyph applies
const StudyIcon = ({ def }) => {
  if (!def) return null;
  if (def.icon) return def.icon;
  return GLYPHS[familyFor(def)];
};

export default StudyIcon;

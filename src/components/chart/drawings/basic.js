// simple one/two-point drawings: levels, freehand, shapes, lines, ghosts
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) and returns bare children —
// the keyed <g> shell (context menu + cursor) is applied in drawings/index.js

import startWindowDrag from '../startWindowDrag';
import { smoothPath } from '../constants';
import { anchors, hitStroke } from './util';

export const level = (d, i, interactive, ctx) => {
  const { yScale, xMax, updateDrawing } = ctx;
  const id = d.id;
  const stroke = d.color || 'var(--dots-color)';
  const y = yScale(d.p);
  // click-and-hold drags the level to a new price
  const startLevelDrag = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const startY = e.clientY;
    const startPx = yScale(d.p);
    startWindowDrag((ev) => updateDrawing(id, { p: yScale.invert(startPx + (ev.clientY - startY)) }));
  };
  return (
    <>
      <line x1={0} x2={xMax} y1={y} y2={y} stroke={stroke} strokeWidth={1.5} />
      {hitStroke({ x1: 0, x2: xMax, y1: y, y2: y, onMouseDown: interactive ? startLevelDrag : undefined }, interactive)}
    </>
  );
};

export const freehand = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const hl = d.type === 'highlight';
  const path = smoothPath(d.pts.map(q => ({ x: pxForTime(q.t), y: yScale(q.p) })));
  return (
    <>
      <path d={path} fill="none" stroke={stroke} strokeWidth={hl ? 12 : 1.8} opacity={hl ? 0.35 : 1}
        strokeLinejoin="round" strokeLinecap="round" />
      <path d={path} fill="none" stroke="transparent" strokeWidth={hl ? 14 : 9} pointerEvents={interactive ? 'stroke' : 'none'} />
    </>
  );
};

export const avwap = (d, i, interactive, ctx) => {
  const { rankForTime, yScale, pxForRank, series, maxIdx } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  // volume-weighted average price from the anchor bar onward
  const r0d = Math.max(0, Math.min(maxIdx, Math.round(rankForTime(d.t))));
  let pv = 0, vv = 0;
  const ptsA = [];
  for (let r = r0d; r <= maxIdx; r++) {
    const b = series[r];
    const tp = (b.high + b.low + b.close) / 3;
    const v = b.volume || 1;
    pv += tp * v; vv += v;
    ptsA.push(`${pxForRank(r)},${yScale(pv / vv)}`);
  }
  return (
    <>
      <circle cx={pxForRank(r0d)} cy={yScale(d.p)} r={3} fill={stroke} />
      <polyline points={ptsA.join(' ')} fill="none" stroke={stroke} strokeWidth={1.7}
        strokeLinejoin="round" strokeLinecap="round" />
      {hitStroke({ points: ptsA.join(' ') }, interactive)}
    </>
  );
};

export const vline = (d, i, interactive, ctx) => {
  const { pxForTime, yScale, xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const x = pxForTime(d.t);
  const y = yScale(d.p);
  return (
    <>
      <line x1={x} x2={x} y1={0} y2={plotBottom} stroke={stroke} strokeWidth={1.5} />
      {hitStroke({ x1: x, x2: x, y1: 0, y2: plotBottom }, interactive)}
      {d.type === 'crossline' && (
        <>
          <line x1={0} x2={xMax} y1={y} y2={y} stroke={stroke} strokeWidth={1.5} />
          {hitStroke({ x1: 0, x2: xMax, y1: y, y2: y }, interactive)}
          <circle cx={x} cy={y} r={2.5} fill={stroke} />
        </>
      )}
    </>
  );
};

export const arrowMarker = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const x = pxForTime(d.t);
  const y = yScale(d.p);
  const path = d.type === 'arrow_up'
    ? `M${x},${y} l-6,8 h3.5 v7 h5 v-7 h3.5 z`
    : `M${x},${y} l-6,-8 h3.5 v-7 h5 v7 h3.5 z`;
  return (
    <path d={path} fill={stroke} fillOpacity={0.85} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />
  );
};

export const polygonShape = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const attr = d.pts.map(q => `${pxForTime(q.t)},${yScale(q.p)}`).join(' ');
  return (
    <polygon points={attr} fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const ghost = (d, i, interactive, ctx) => {
  const { pxForTime, rankForTime, yScale, pxForRank, step } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  // simulated future price feed: dashed ghost polyline with bar ticks at each slot
  const P = d.pts.map(q => ({ x: pxForTime(q.t), y: yScale(q.p), r: rankForTime(q.t) }));
  const attr = P.map(q => `${q.x},${q.y}`).join(' ');
  // deterministic per-slot noise so bars don't flicker while panning
  const rnd = (r, salt) => {
    const v = Math.sin(r * 127.1 + salt * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const slots = [];
  for (let k2 = 0; k2 + 1 < P.length; k2++) {
    const a2 = P[k2], b2 = P[k2 + 1];
    const rLo = Math.min(a2.r, b2.r), rHi = Math.max(a2.r, b2.r);
    const amp = Math.max(3, (Math.abs(b2.y - a2.y) / Math.max(1, rHi - rLo)) * 1.1 + 2);
    for (let r = Math.ceil(rLo); r <= Math.floor(rHi); r++) {
      const f = (b2.r - a2.r) ? (r - a2.r) / (b2.r - a2.r) : 0;
      slots.push({ x: pxForRank(r), base: a2.y + (b2.y - a2.y) * f, amp, r });
    }
  }
  const bw = Math.max(1.5, step * 0.5);
  const candlesPrev = [];
  const candles = slots.map((q, k2) => {
    const c = q.base + (rnd(q.r, 1) - 0.5) * q.amp;
    const o = k2 > 0 ? candlesPrev[k2 - 1] : q.base + (rnd(q.r, 2) - 0.5) * q.amp;
    const hi2 = Math.min(o, c) - rnd(q.r, 3) * q.amp * 0.6;
    const lo2 = Math.max(o, c) + rnd(q.r, 4) * q.amp * 0.6;
    candlesPrev[k2] = c;
    return { x: q.x, o, c, h: hi2, l: lo2, up: c <= o };
  });
  return (
    <>
      <polyline points={attr} fill="none" stroke={stroke} strokeWidth={1}
        strokeDasharray="5,4" strokeLinejoin="round" strokeLinecap="round" opacity={0.35} />
      {candles.map((b, k2) => (
        <g key={k2}>
          <line x1={b.x} x2={b.x} y1={b.h} y2={b.l} stroke={stroke} strokeWidth={1} />
          <rect x={b.x - bw / 2} y={Math.min(b.o, b.c)} width={bw}
            height={Math.abs(b.c - b.o) || 1} fill={b.up ? 'transparent' : stroke}
            stroke={stroke} strokeWidth={1} />
        </g>
      ))}
      {P.map((q, k2) => <circle key={`p${k2}`} cx={q.x} cy={q.y} r={2} fill={stroke} />)}
      {hitStroke({ points: attr }, interactive)}
    </>
  );
};

export const polyline = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const attr = d.pts.map(q => `${pxForTime(q.t)},${yScale(q.p)}`).join(' ');
  return (
    <>
      <polyline points={attr} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {d.pts.map((q, k) => (
        <circle key={k} cx={pxForTime(q.t)} cy={yScale(q.p)} r={2} fill={stroke} />
      ))}
      {hitStroke({ points: attr }, interactive)}
    </>
  );
};

export const extline = (d, i, interactive, ctx) => {
  const { xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // extend through both anchors infinitely in both directions
  const dx = bx - ax, dy = by - ay;
  const k = ((xMax + plotBottom) * 2) / (Math.hypot(dx, dy) || 1);
  return (
    <>
      <line x1={ax - dx * k} y1={ay - dy * k} x2={bx + dx * k} y2={by + dy * k}
        stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      {hitStroke({ x1: ax - dx * k, y1: ay - dy * k, x2: bx + dx * k, y2: by + dy * k }, interactive)}
    </>
  );
};

export const ray = (d, i, interactive, ctx) => {
  const { xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // extend from the anchor through the second point far past the plot;
  // the layer's clip trims it to the chart
  const dx = bx - ax, dy = by - ay;
  const k = ((xMax + plotBottom) * 2) / (Math.hypot(dx, dy) || 1);
  const ex = bx + dx * k, ey = by + dy * k;
  return (
    <>
      <circle cx={ax} cy={ay} r={2.5} fill={stroke} />
      <line x1={ax} y1={ay} x2={ex} y2={ey} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      {hitStroke({ x1: ax, y1: ay, x2: ex, y2: ey }, interactive)}
    </>
  );
};

export const sector = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // pie slice: center, edge (radius + start angle), then end angle
  const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
  const r0 = Math.hypot(bx - ax, by - ay) || 1;
  const a1 = Math.atan2(by - ay, bx - ax);
  const a2 = Math.atan2(p3.y - ay, p3.x - ax);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const ex3 = ax + r0 * Math.cos(a1 + delta), ey3 = ay + r0 * Math.sin(a1 + delta);
  const path = `M${ax},${ay} L${bx},${by} A${r0},${r0} 0 0 ${delta > 0 ? 1 : 0} ${ex3},${ey3} Z`;
  return (
    <path d={path} fill={stroke} fillOpacity={0.1} stroke={stroke} strokeWidth={1.5}
      strokeLinejoin="round" pointerEvents={interactive ? 'all' : 'none'} />
  );
};

export const rectShape = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  return (
    <rect x={Math.min(ax, bx)} y={Math.min(ay, by)} width={Math.abs(bx - ax)} height={Math.abs(by - ay)}
      fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const triangleShape = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const midX = (Math.min(ax, bx) + Math.max(ax, bx)) / 2;
  const pts = `${midX},${Math.min(ay, by)} ${Math.min(ax, bx)},${Math.max(ay, by)} ${Math.max(ax, bx)},${Math.max(ay, by)}`;
  return (
    <polygon points={pts} fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const rtriangle = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // right angle at the drag start, legs along the axes
  const pts = `${ax},${ay} ${bx},${ay} ${ax},${by}`;
  return (
    <polygon points={pts} fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const circleShape = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const r = Math.hypot(bx - ax, by - ay);
  return (
    <circle cx={ax} cy={ay} r={r} fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const arrowLine = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const ang = Math.atan2(by - ay, bx - ax);
  const h = 9;
  const w1x = bx - h * Math.cos(ang - 0.45), w1y = by - h * Math.sin(ang - 0.45);
  const w2x = bx - h * Math.cos(ang + 0.45), w2y = by - h * Math.sin(ang + 0.45);
  return (
    <>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <polygon points={`${bx},${by} ${w1x},${w1y} ${w2x},${w2y}`} fill={stroke} />
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const rrect = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const cx3 = pxForTime(d.x3), cy3 = yScale(d.y3);
  const vx = bx - ax, vy = by - ay;
  const len = Math.hypot(vx, vy) || 1;
  const nx = -vy / len, ny = vx / len;
  const dist = (cx3 - bx) * nx + (cy3 - by) * ny;
  const pts = `${ax},${ay} ${bx},${by} ${bx + nx * dist},${by + ny * dist} ${ax + nx * dist},${ay + ny * dist}`;
  return (
    <polygon points={pts} fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const arcShape = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const cx3 = pxForTime(d.x3), cy3 = yScale(d.y3);
  const ctlx = 2 * cx3 - (ax + bx) / 2;
  const ctly = 2 * cy3 - (ay + by) / 2;
  const path = `M${ax},${ay} Q${ctlx},${ctly} ${bx},${by}`;
  return (
    <>
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      {hitStroke({ d: path }, interactive)}
    </>
  );
};

export const ellipseShape = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  return (
    <ellipse cx={(ax + bx) / 2} cy={(ay + by) / 2} rx={Math.abs(bx - ax) / 2} ry={Math.abs(by - ay) / 2}
      fill={stroke} fillOpacity={0.07} stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

export const trendline = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  return (
    <>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

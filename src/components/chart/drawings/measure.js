// measuring, projection and channel/fork tools
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) and returns bare children —
// the keyed <g> shell (context menu + cursor) is applied in drawings/index.js

import startWindowDrag from '../startWindowDrag';
import { forkGeometry } from '../constants';
import { anchors, hitStroke, TextChip } from './util';

export const forecast = (d, i, interactive, ctx) => {
  const { rankForTime } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // dashed projection arrow with the price/bar delta at its head
  const dxp = bx - ax, dyp = by - ay;
  const ang2 = Math.atan2(dyp, dxp);
  const ah = (a3) => `${bx - 8 * Math.cos(ang2 - a3)},${by - 8 * Math.sin(ang2 - a3)}`;
  const dP = d.y2 - d.y1;
  const bars = Math.round(rankForTime(d.x2) - rankForTime(d.x1));
  const sgn = dP >= 0 ? '+' : '\u2212';
  return (
    <>
      <circle cx={ax} cy={ay} r={2.5} fill={stroke} />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.6} strokeDasharray="6,4" />
      <polygon points={`${bx},${by} ${ah(0.42)} ${ah(-0.42)}`} fill={stroke} stroke="none" />
      <TextChip x={bx + 46} y={by} w={76} h={24} stroke={stroke} lines={[
        `${sgn}${Math.abs(dP).toFixed(2)} (${sgn}${Math.abs((dP / (d.y1 || 1)) * 100).toFixed(2)}%)`,
        `${Math.abs(bars)} bars`,
      ]} />
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const barsPattern = (d, i, interactive, ctx) => {
  const { rankForTime, yScale, pxForRank, series, maxIdx } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  // stamp the selected range's close shape forward from the range end
  const rA = Math.round(rankForTime(d.x1)), rB = Math.round(rankForTime(d.x2));
  const lo = Math.max(0, Math.min(rA, rB)), hi = Math.min(maxIdx, Math.max(rA, rB));
  if (hi - lo < 1) return null;
  const base = series[hi].close;
  const src = [], proj = [];
  for (let r = lo; r <= hi; r++) {
    src.push(`${pxForRank(r)},${yScale(series[r].close)}`);
    proj.push(`${pxForRank(hi + (r - lo))},${yScale(base + (series[r].close - series[lo].close))}`);
  }
  const y0s = Math.min(yScale(d.y1), yScale(d.y2)), y1s = Math.max(yScale(d.y1), yScale(d.y2));
  return (
    <>
      <rect x={pxForRank(lo)} y={y0s} width={pxForRank(hi) - pxForRank(lo)} height={y1s - y0s || 1}
        fill={stroke} fillOpacity={0.05} stroke={stroke} strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3,3" />
      <polyline points={src.join(' ')} fill="none" stroke={stroke} strokeWidth={1.4} opacity={0.55} />
      <polyline points={proj.join(' ')} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray="5,4" />
      {hitStroke({ points: proj.join(' ') }, interactive)}
    </>
  );
};

export const frvp = (d, i, interactive, ctx) => {
  const { rankForTime, yScale, pxForRank, series, maxIdx } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  // volume-at-price profile for the selected bar range
  const rA = Math.round(rankForTime(d.x1)), rB = Math.round(rankForTime(d.x2));
  const lo = Math.max(0, Math.min(rA, rB)), hi = Math.min(maxIdx, Math.max(rA, rB));
  if (hi - lo < 1) return null;
  const x0p = pxForRank(lo), x1e = pxForRank(hi);
  let loP = Infinity, hiP = -Infinity;
  for (let r = lo; r <= hi; r++) {
    loP = Math.min(loP, series[r].low); hiP = Math.max(hiP, series[r].high);
  }
  if (!(hiP > loP)) return null;
  const BINS = 24;
  const bins = new Array(BINS).fill(0);
  for (let r = lo; r <= hi; r++) {
    const b = series[r];
    const k2 = Math.min(BINS - 1, Math.floor(((b.high + b.low + b.close) / 3 - loP) / (hiP - loP) * BINS));
    bins[k2] += b.volume || 0;
  }
  const maxBin = Math.max(...bins, 1);
  const wMax = (x1e - x0p) * 0.9;
  return (
    <>
      <line x1={x0p} x2={x0p} y1={yScale(hiP)} y2={yScale(loP)} stroke={stroke} strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
      <line x1={x1e} x2={x1e} y1={yScale(hiP)} y2={yScale(loP)} stroke={stroke} strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
      {bins.map((v, k2) => {
        const yT = yScale(loP + ((k2 + 1) / BINS) * (hiP - loP));
        const yB = yScale(loP + (k2 / BINS) * (hiP - loP));
        return (
          <rect key={k2} x={x0p} y={Math.min(yT, yB)} width={(v / maxBin) * wMax}
            height={Math.abs(yB - yT) - 1 || 1} fill={stroke}
            fillOpacity={v === maxBin ? 0.55 : 0.28} stroke="none" />
        );
      })}
      <rect x={x0p} y={yScale(hiP)} width={x1e - x0p || 1} height={Math.abs(yScale(loP) - yScale(hiP)) || 1}
        fill="transparent" stroke="none" pointerEvents={interactive ? 'all' : 'none'} />
    </>
  );
};

export const measureBox = (d, i, interactive, ctx) => {
  const { rankForTime } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // measuring boxes: shaded range with arrows and a stats chip
  const x0 = Math.min(ax, bx), x1p = Math.max(ax, bx);
  const y0m = Math.min(ay, by), y1m = Math.max(ay, by);
  const cx2 = (x0 + x1p) / 2, cy2 = (y0m + y1m) / 2;
  const dP = d.y2 - d.y1;
  const pct = ((dP / (d.y1 || 1)) * 100);
  const bars = Math.round(rankForTime(d.x2) - rankForTime(d.x1));
  const dtMs = d.x2 - d.x1;
  const span = Math.abs(dtMs) >= 86400000
    ? `${Math.abs(dtMs / 86400000).toFixed(1)}d`
    : `${Math.abs(dtMs / 3600000).toFixed(1)}h`;
  const sgn = dP >= 0 ? '+' : '\u2212';
  const lines2 = [];
  if (d.type !== 'm_date') lines2.push(`${sgn}${Math.abs(dP).toFixed(2)} (${sgn}${Math.abs(pct).toFixed(2)}%)`);
  if (d.type !== 'm_price') lines2.push(`${Math.abs(bars)} bars, ${span}`);
  if (d.type === 'ruler') lines2.push(`${Math.hypot(bx - ax, by - ay).toFixed(0)} px`);
  const ah = (x2, y2, a3) => `${x2},${y2} ${x2 - 6 * Math.cos(a3 - 0.4)},${y2 - 6 * Math.sin(a3 - 0.4)} ${x2 - 6 * Math.cos(a3 + 0.4)},${y2 - 6 * Math.sin(a3 + 0.4)}`;
  const vDir = by >= ay ? Math.PI / 2 : -Math.PI / 2;
  const hDir = bx >= ax ? 0 : Math.PI;
  const dDir = Math.atan2(by - ay, bx - ax);
  const chipY = d.type === 'm_price' ? (by >= ay ? y1m + 14 : y0m - 14) : cy2;
  return (
    <>
      <rect x={x0} y={y0m} width={x1p - x0 || 1} height={y1m - y0m || 1} fill={stroke} fillOpacity={0.09} stroke="none" />
      {d.type === 'm_price' && (
        <>
          <line x1={cx2} y1={ay} x2={cx2} y2={by} stroke={stroke} strokeWidth={1.4} />
          <polygon points={ah(cx2, by, vDir)} fill={stroke} stroke="none" />
        </>
      )}
      {d.type === 'm_date' && (
        <>
          <line x1={ax} y1={cy2} x2={bx} y2={cy2} stroke={stroke} strokeWidth={1.4} />
          <polygon points={ah(bx, cy2, hDir)} fill={stroke} stroke="none" />
        </>
      )}
      {(d.type === 'm_both' || d.type === 'ruler') && (
        <>
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.4} />
          <polygon points={ah(bx, by, dDir)} fill={stroke} stroke="none" />
        </>
      )}
      <TextChip lines={lines2} x={cx2} y={chipY} stroke={stroke} />
      <rect x={x0} y={y0m} width={x1p - x0 || 1} height={y1m - y0m || 1} fill="transparent"
        stroke="none" pointerEvents={interactive ? 'all' : 'none'} />
    </>
  );
};

export const cyclic = (d, i, interactive, ctx) => {
  const { xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx] = anchors(d, ctx);
  // verticals repeating at the anchor interval across the whole plot
  const dxc = bx - ax;
  if (Math.abs(dxc) < 2) return null;
  const lo = Math.min(Math.ceil(-ax / dxc), Math.floor((xMax - ax) / dxc));
  const hi = Math.max(Math.ceil(-ax / dxc), Math.floor((xMax - ax) / dxc));
  const ks = [];
  for (let k2 = lo; k2 <= hi; k2++) ks.push(k2);
  return (
    <>
      {ks.map(k2 => (
        <g key={k2}>
          <line x1={ax + dxc * k2} x2={ax + dxc * k2} y1={0} y2={plotBottom} stroke={stroke}
            strokeWidth={k2 === 0 || k2 === 1 ? 1.5 : 1} opacity={k2 === 0 || k2 === 1 ? 0.95 : 0.55} />
          <text x={ax + dxc * k2 + 3} y={10} fontSize={8} fill={stroke} stroke="none" opacity={0.8}>{k2}</text>
        </g>
      ))}
      {hitStroke({ x1: ax, x2: bx, y1: ay, y2: ay }, interactive)}
    </>
  );
};

export const timecycles = (d, i, interactive, ctx) => {
  const { xMax } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // repeating semicircular arcs on the anchor's price line; vertical drag sets arc height
  const dxc = bx - ax;
  if (Math.abs(dxc) < 2) return null;
  const rx = Math.abs(dxc) / 2;
  const ry = Math.abs(by - ay) > 2 ? Math.abs(by - ay) : rx;
  const lo = Math.min(Math.ceil(-ax / dxc), Math.floor((xMax - ax) / dxc)) - 1;
  const hi = Math.max(Math.ceil(-ax / dxc), Math.floor((xMax - ax) / dxc));
  const arcs = [];
  for (let k2 = lo; k2 <= hi; k2++) {
    const xA = ax + dxc * k2, xB = ax + dxc * (k2 + 1);
    arcs.push(`M${Math.min(xA, xB)},${ay} A${rx},${ry} 0 0 1 ${Math.max(xA, xB)},${ay}`);
  }
  return (
    <>
      <line x1={0} x2={xMax} y1={ay} y2={ay} stroke={stroke} strokeWidth={1} strokeDasharray="4,4" opacity={0.35} />
      <path d={arcs.join(' ')} fill="none" stroke={stroke} strokeWidth={1.4} opacity={0.9} />
      {hitStroke({ x1: 0, x2: xMax, y1: ay, y2: ay }, interactive)}
    </>
  );
};

export const sine = (d, i, interactive, ctx) => {
  const { xMax } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // first anchor = zero crossing, second = adjacent crest; quarter period between them
  const qw = bx - ax;
  if (Math.abs(qw) < 2) return null;
  const amp = by - ay;
  const wave = [];
  for (let x2 = 0; x2 <= xMax; x2 += 4) {
    wave.push(`${x2},${ay + amp * Math.sin((Math.PI / 2) * ((x2 - ax) / qw))}`);
  }
  return (
    <>
      <polyline points={wave.join(' ')} fill="none" stroke={stroke} strokeWidth={1.6}
        strokeLinejoin="round" strokeLinecap="round" />
      {hitStroke({ points: wave.join(' ') }, interactive)}
    </>
  );
};

export const regtrend = (d, i, interactive, ctx) => {
  const { yScale, pxForRank, series } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  // fit a regression over the bars inside the dragged time range, with
  // bands at ±2 standard deviations of the residuals
  const tLo = Math.min(d.x1, d.x2), tHi = Math.max(d.x1, d.x2);
  const bars = series.filter(b => +b.date >= tLo && +b.date <= tHi);
  if (bars.length < 2) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  const n = bars.length;
  bars.forEach(b => { sx += b.rank; sy += b.close; sxy += b.rank * b.close; sxx += b.rank * b.rank; });
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const icept = (sy - slope * sx) / n;
  let ss = 0;
  bars.forEach(b => { const e = b.close - (slope * b.rank + icept); ss += e * e; });
  const sd = Math.sqrt(ss / n);
  const r0 = Math.min(...bars.map(b => b.rank));
  const r1 = Math.max(...bars.map(b => b.rank));
  const seg = (off, width, op) => (
    <line key={off} x1={pxForRank(r0)} y1={yScale(slope * r0 + icept + off)} x2={pxForRank(r1)} y2={yScale(slope * r1 + icept + off)}
      stroke={stroke} strokeWidth={width} opacity={op} />
  );
  return (
    <>
      <polygon
        points={`${pxForRank(r0)},${yScale(slope * r0 + icept + 2 * sd)} ${pxForRank(r1)},${yScale(slope * r1 + icept + 2 * sd)} ${pxForRank(r1)},${yScale(slope * r1 + icept - 2 * sd)} ${pxForRank(r0)},${yScale(slope * r0 + icept - 2 * sd)}`}
        fill={stroke} fillOpacity={0.05} stroke="none" />
      {seg(0, 1.8, 1)}
      {seg(2 * sd, 1.2, 0.7)}
      {seg(-2 * sd, 1.2, 0.7)}
      {hitStroke({
        x1: pxForRank(r0), y1: yScale(slope * r0 + icept),
        x2: pxForRank(r1), y2: yScale(slope * r1 + icept),
      }, interactive)}
    </>
  );
};

export const channelFamily = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
  let l2a, l2b;
  if (d.type === 'channel') {
    const dy = p3.y - (ay + (by - ay) * ((p3.x - ax) / ((bx - ax) || 1)));
    l2a = { x: ax, y: ay + dy };
    l2b = { x: bx, y: by + dy };
  } else if (d.type === 'flattb') {
    l2a = { x: ax, y: p3.y };
    l2b = { x: bx, y: p3.y };
  } else {
    l2a = { x: ax, y: p3.y };
    l2b = { x: bx, y: p3.y + (ay - by) };
  }
  return (
    <>
      <polygon points={`${ax},${ay} ${bx},${by} ${l2b.x},${l2b.y} ${l2a.x},${l2a.y}`}
        fill={stroke} fillOpacity={0.06} stroke="none" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <line x1={l2a.x} y1={l2a.y} x2={l2b.x} y2={l2b.y} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      {d.type === 'channel' && (
        <line x1={(ax + l2a.x) / 2} y1={(ay + l2a.y) / 2} x2={(bx + l2b.x) / 2} y2={(by + l2b.y) / 2}
          stroke={stroke} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
      )}
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
      {hitStroke({ x1: l2a.x, y1: l2a.y, x2: l2b.x, y2: l2b.y }, interactive)}
    </>
  );
};

export const fork = (d, i, interactive, ctx) => {
  const { pxForTime, yScale, xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
  const g = forkGeometry(d.type, { x: ax, y: ay }, { x: bx, y: by }, p3, (xMax + plotBottom) * 2);
  return (
    <>
      <circle cx={g.o.x} cy={g.o.y} r={2.5} fill={stroke} />
      <line x1={bx} y1={by} x2={p3.x} y2={p3.y} stroke={stroke} strokeWidth={1.2} opacity={0.7} />
      <line x1={g.o.x} y1={g.o.y} x2={g.m.x + g.dx * g.k} y2={g.m.y + g.dy * g.k} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
      <line x1={g.t1.x} y1={g.t1.y} x2={g.t1.x + g.dx * g.k} y2={g.t1.y + g.dy * g.k} stroke={stroke} strokeWidth={1.4} opacity={0.85} />
      <line x1={g.t2.x} y1={g.t2.y} x2={g.t2.x + g.dx * g.k} y2={g.t2.y + g.dy * g.k} stroke={stroke} strokeWidth={1.4} opacity={0.85} />
      {hitStroke({ x1: g.o.x, y1: g.o.y, x2: g.m.x + g.dx * g.k, y2: g.m.y + g.dy * g.k }, interactive)}
    </>
  );
};

export const barsCopy = (d, i, interactive, ctx) => {
  const { rankForTime, timeForRank, yScale, pxForRank, step, series, maxIdx, updateDrawing } = ctx;
  const id = d.id;
  // ghost copy of the selected bars, re-anchored so the first bar's open
  // sits at the placement point; drag to reposition
  const rA = Math.round(rankForTime(d.x1)), rB = Math.round(rankForTime(d.x2));
  const lo = Math.max(0, Math.min(rA, rB)), hi = Math.min(maxIdx, Math.max(rA, rB));
  if (!series[lo] || hi < lo) return null;
  const r3 = rankForTime(d.x3);
  const off = d.y3 - series[lo].open;
  const bw = Math.max(1.5, step * 0.55);
  const bars2 = [];
  for (let k2 = 0; k2 <= hi - lo; k2++) {
    const b = series[lo + k2];
    bars2.push({
      x: pxForRank(r3 + k2), h: yScale(b.high + off), l: yScale(b.low + off),
      o: yScale(b.open + off), c: yScale(b.close + off), up: b.close >= b.open,
    });
  }
  const hx0 = Math.min(...bars2.map(b => b.x)) - bw / 2;
  const hx1 = Math.max(...bars2.map(b => b.x)) + bw / 2;
  const hy0 = Math.min(...bars2.map(b => b.h));
  const hy1 = Math.max(...bars2.map(b => b.l));
  const dragCopy = (e) => {
    if (e.button !== 0 || !interactive) return;
    e.stopPropagation();
    const sx2 = e.clientX, sy2 = e.clientY;
    const r0d = rankForTime(d.x3), py = yScale(d.y3);
    startWindowDrag((ev) => updateDrawing(id, {
      x3: timeForRank(r0d + (ev.clientX - sx2) / step),
      y3: yScale.invert(py + (ev.clientY - sy2)),
    }));
  };
  return (
    <>
      {bars2.map((b, k2) => {
        const col = d.color || (b.up ? 'var(--green)' : 'var(--red)');
        return (
          <g key={k2}>
            <line x1={b.x} x2={b.x} y1={b.h} y2={b.l} stroke={col} strokeWidth={1} />
            <rect x={b.x - bw / 2} y={Math.min(b.o, b.c)} width={bw}
              height={Math.abs(b.c - b.o) || 1} fill={col} stroke="none" />
          </g>
        );
      })}
      <rect x={hx0} y={hy0} width={hx1 - hx0 || 1} height={hy1 - hy0 || 1} fill="transparent"
        stroke="none" style={{ cursor: 'move' }} pointerEvents={interactive ? 'all' : 'none'}
        onMouseDown={dragCopy} />
    </>
  );
};

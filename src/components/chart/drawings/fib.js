// fib and gann families: retracements, fans, arcs, boxes, spirals
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) and returns bare children —
// the keyed <g> shell (context menu + cursor) is applied in drawings/index.js

import { fibColor, FIB_COLORS, FIB_CYCLE } from '../constants';
import { anchors, hitStroke } from './util';

export const fibRetracement = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const [ax, ay, bx, by] = anchors(d, ctx);
  const isExt = d.type === 'fibext';
  const cx3 = isExt ? pxForTime(d.x3) : 0;
  const cy3 = isExt ? yScale(d.y3) : 0;
  const levels = isExt ? [0, 0.382, 0.618, 1, 1.618] : [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const x0 = isExt ? Math.min(ax, bx, cx3) : Math.min(ax, bx);
  const x1p = isExt ? Math.max(ax, bx, cx3) : Math.max(ax, bx);
  const yAt = (l) => isExt ? cy3 + (by - ay) * l : ay + (by - ay) * l;
  return (
    <>
      {levels.slice(0, -1).map((l, k2) => (
        <rect key={`b${l}`} x={x0} y={Math.min(yAt(l), yAt(levels[k2 + 1]))} width={x1p - x0}
          height={Math.abs(yAt(levels[k2 + 1]) - yAt(l)) || 1}
          fill={fibColor(levels[k2 + 1])} fillOpacity={0.05} stroke="none" />
      ))}
      {levels.map(l => (
        <g key={l}>
          <line x1={x0} x2={x1p} y1={yAt(l)} y2={yAt(l)} stroke={fibColor(l)}
            strokeWidth={l === 0 || l === 1 ? 1.5 : 1} opacity={0.9} />
          <text x={x1p + 4} y={yAt(l)} dy="0.32em" fontSize={8} fill={fibColor(l)} stroke="none">
            {Math.round(l * 1000) / 10}%
          </text>
        </g>
      ))}
      {hitStroke({
        x: x0, y: Math.min(...levels.map(yAt)), width: x1p - x0,
        height: Math.abs(yAt(levels[levels.length - 1]) - yAt(levels[0])) || 1,
      }, interactive)}
    </>
  );
};

export const fibChannel = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const [ax, ay, bx, by] = anchors(d, ctx);
  const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
  const dy = p3.y - (ay + (by - ay) * ((p3.x - ax) / ((bx - ax) || 1)));
  return (
    <>
      {[0, 0.382, 0.618, 1].map((l, k2, arr) => k2 < arr.length - 1 && (
        <polygon key={`b${l}`}
          points={`${ax},${ay + dy * l} ${bx},${by + dy * l} ${bx},${by + dy * arr[k2 + 1]} ${ax},${ay + dy * arr[k2 + 1]}`}
          fill={fibColor(arr[k2 + 1])} fillOpacity={0.05} stroke="none" />
      ))}
      {[0, 0.382, 0.618, 1, 1.618].map(l => (
        <line key={l} x1={ax} y1={ay + dy * l} x2={bx} y2={by + dy * l} stroke={fibColor(l)}
          strokeWidth={l === 0 || l === 1 ? 1.6 : 1} opacity={0.9} />
      ))}
      {[0, 0.382, 0.618, 1, 1.618].map(l => (
        <text key={`t${l}`} x={bx + 4} y={by + dy * l} dy="0.32em" fontSize={8}
          fill={fibColor(l)} stroke="none">{l}</text>
      ))}
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const fibTime = (d, i, interactive, ctx) => {
  const { rankForTime, plotBottom, pxForRank } = ctx;
  const r1 = rankForTime(d.x1), r2 = rankForTime(d.x2);
  const seqs = d.type === 'fib_timezone'
    ? [0, 1, 2, 3, 5, 8, 13, 21, 34].map(n => ({ n, r: r1 + n * (r2 - r1 || 1) }))
    : [0, 0.382, 0.618, 1, 1.618].map(l => ({ n: l, r: rankForTime(d.x3) + l * (r2 - r1) }));
  return (
    <>
      {seqs.slice(0, -1).map((sq, k2) => {
        const c = FIB_CYCLE[k2 % FIB_CYCLE.length];
        const xA = pxForRank(sq.r), xB = pxForRank(seqs[k2 + 1].r);
        return (
          <rect key={`b${k2}`} x={Math.min(xA, xB)} y={0} width={Math.abs(xB - xA) || 1}
            height={plotBottom} fill={c} fillOpacity={0.035} stroke="none" />
        );
      })}
      {seqs.map(({ n, r }, k2) => {
        const c = k2 === 0 ? '#8f8f98' : FIB_CYCLE[(k2 - 1) % FIB_CYCLE.length];
        return (
          <g key={k2}>
            <line x1={pxForRank(r)} x2={pxForRank(r)} y1={0} y2={plotBottom} stroke={c}
              strokeWidth={k2 === 0 ? 1.5 : 1} opacity={k2 === 0 ? 1 : 0.75} />
            <text x={pxForRank(r) + 3} y={10} fontSize={8} fill={c} stroke="none">{n}</text>
          </g>
        );
      })}
      {hitStroke({ x1: pxForRank(seqs[0].r), x2: pxForRank(seqs[0].r), y1: 0, y2: plotBottom }, interactive)}
    </>
  );
};

export const fibFan = (d, i, interactive, ctx) => {
  const { xMax, plotBottom } = ctx;
  const [ax, ay, bx, by] = anchors(d, ctx);
  // speed resistance fan: level l's ray crosses the far edge at (1-l) of
  // the move, so 0.25 hugs the diagonal and 0.75 sits outermost — built
  // per side so fills and colors stay symmetric around the diagonal
  const LV = [0.25, 0.382, 0.5, 0.618, 0.75];
  const COL = FIB_COLORS;
  const K = (xMax + plotBottom) * 4;
  const far = (tx, ty) => {
    const dx = tx - ax, dy = ty - ay;
    const m = K / (Math.hypot(dx, dy) || 1);
    return { x: ax + dx * m, y: ay + dy * m };
  };
  // each side: diagonal → levels (inner to outer) → the box edge (l=1)
  const priceSide = [
    { l: 0, ...far(bx, by) },
    ...LV.map(l => ({ l, ...far(bx, ay + (by - ay) * (1 - l)) })),
    { l: 1, ...far(bx, ay) },
  ];
  const timeSide = [
    { l: 0, ...far(bx, by) },
    ...LV.map(l => ({ l, ...far(ax + (bx - ax) * (1 - l), by) })),
    { l: 1, ...far(ax, by) },
  ];
  const bands = (side) => side.slice(0, -1).map((r, k2) => ({
    a: r, b: side[k2 + 1], c: COL[side[k2 + 1].l],
    op: side[k2 + 1].l === 1 ? 0.03 : 0.05,
  }));
  const x0 = Math.min(ax, bx), x1p = Math.max(ax, bx);
  const y0 = Math.min(ay, by), y1p = Math.max(ay, by);
  return (
    <>
      {[...bands(priceSide), ...bands(timeSide)].map((bd, k2) => (
        <polygon key={`f${k2}`} points={`${ax},${ay} ${bd.a.x},${bd.a.y} ${bd.b.x},${bd.b.y}`}
          fill={bd.c} fillOpacity={bd.op} stroke="none" />
      ))}
      {[...priceSide, ...timeSide.slice(1)].map((r, k2) => (
        <line key={`r${k2}`} x1={ax} y1={ay} x2={r.x} y2={r.y}
          stroke={COL[r.l]} strokeWidth={r.l === 0 ? 1.4 : 1} opacity={0.9} />
      ))}
      <rect x={x0} y={y0} width={x1p - x0 || 1} height={y1p - y0 || 1}
        fill="none" stroke={COL[1]} strokeWidth={1} opacity={0.4} />
      {LV.map(l => (
        <g key={`g${l}`} opacity={0.4}>
          <line x1={x0} x2={x1p} y1={ay + (by - ay) * (1 - l)} y2={ay + (by - ay) * (1 - l)} stroke={COL[l]} strokeWidth={0.8} />
          <line x1={ax + (bx - ax) * (1 - l)} x2={ax + (bx - ax) * (1 - l)} y1={y0} y2={y1p} stroke={COL[l]} strokeWidth={0.8} />
        </g>
      ))}
      {[0, ...LV, 1].map(l => (
        <g key={`t${l}`}>
          <text x={x0 - 4} y={ay + (by - ay) * (1 - l)} dy="0.32em" textAnchor="end" fontSize={8} fill={COL[l]} stroke="none">{l}</text>
          <text x={ax + (bx - ax) * (1 - l)} y={y1p + 9} textAnchor="middle" fontSize={8} fill={COL[l]} stroke="none">{l}</text>
        </g>
      ))}
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const fanFamily = (d, i, interactive, ctx) => {
  const { pxForTime, yScale, xMax, plotBottom } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  let targets;
  if (d.type === 'fib_fan_reg') {
    targets = [0.382, 0.5, 0.618, 1].map(l => ({
      x: bx, y: ay + (by - ay) * l, w: l === 1 ? 1.8 : 1, c: fibColor(l), lbl: `${l}`,
    }));
  } else if (d.type === 'gann_fan') {
    const GC = { 8: '#e879f9', 4: '#a78bfa', 2: '#34d399', 1: '#60a5fa', 0.5: '#34d399', 0.25: '#a78bfa', 0.125: '#e879f9' };
    const GL = { 8: '8x1', 4: '4x1', 2: '2x1', 1: '1x1', 0.5: '1x2', 0.25: '1x4', 0.125: '1x8' };
    targets = [8, 4, 2, 1, 0.5, 0.25, 0.125].map(r => ({
      x: bx, y: ay + (by - ay) * r, w: r === 1 ? 1.8 : 1, c: GC[r], lbl: GL[r],
    }));
  } else {
    const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
    targets = [0, 0.382, 0.5, 0.618, 1].map(l => ({
      x: bx + (p3.x - bx) * l, y: by + (p3.y - by) * l, w: l === 0.5 ? 1.6 : 1, c: fibColor(l), lbl: `${l}`,
    }));
  }
  const fps = targets.map(t2 => {
    const dx = t2.x - ax, dy = t2.y - ay;
    const k = ((xMax + plotBottom) * 2) / (Math.hypot(dx, dy) || 1);
    return { ...t2, fx: ax + dx * (1 + k), fy: ay + dy * (1 + k) };
  });
  return (
    <>
      {fps.slice(0, -1).map((f2, k2) => (
        <polygon key={`f${k2}`} points={`${ax},${ay} ${f2.fx},${f2.fy} ${fps[k2 + 1].fx},${fps[k2 + 1].fy}`}
          fill={fps[k2 + 1].c} fillOpacity={0.04} stroke="none" />
      ))}
      <circle cx={ax} cy={ay} r={2.5} fill={stroke} />
      {fps.map((f2, k2) => (
        <line key={k2} x1={ax} y1={ay} x2={f2.fx} y2={f2.fy}
          stroke={f2.c || stroke} strokeWidth={f2.w} opacity={0.9} />
      ))}
      {fps.map((f2, k2) => (
        <text key={`t${k2}`} x={f2.x + 5} y={f2.y} dy="0.32em" fontSize={8}
          fill={f2.c} stroke="none">{f2.lbl}</text>
      ))}
      <circle cx={ax} cy={ay} r={9} fill="transparent" pointerEvents={interactive ? 'all' : 'none'} />
    </>
  );
};

export const fibArcs = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  // semicircular arcs centered on the trend end, bulging back against the
  // trend direction (up-trend → arcs open downward), radii = fib fractions of AB
  const r0 = Math.hypot(bx - ax, by - ay) || 1;
  const levels = [0.382, 0.5, 0.618, 1];
  const sweep = ay >= by ? 0 : 1; // which vertical half faces the start point
  const arc = (r) => `M${bx - r},${by} A${r},${r} 0 0 ${sweep} ${bx + r},${by}`;
  const half = (r) => `${arc(r)} Z`;
  const apexY = (r) => by + (sweep === 0 ? r : -r);
  return (
    <>
      {[...levels].reverse().map(l => (
        <path key={`f${l}`} d={half(r0 * l)} fill={fibColor(l)} fillOpacity={0.035} stroke="none" />
      ))}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1} opacity={0.6} strokeDasharray="4,4" />
      {levels.map(l => (
        <path key={l} d={arc(r0 * l)} fill="none" stroke={fibColor(l)}
          strokeWidth={l === 1 ? 1.5 : 1} opacity={0.85} strokeDasharray="4,4" />
      ))}
      {levels.map(l => (
        <text key={`t${l}`} x={bx} y={apexY(r0 * l) + (sweep === 0 ? 9 : -3)} textAnchor="middle"
          fontSize={8} fill={fibColor(l)} stroke="none">{l}</text>
      ))}
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const fibCircles = (d, i, interactive, ctx) => {
  const [ax, ay, bx, by] = anchors(d, ctx);
  const r0 = Math.hypot(bx - ax, by - ay) || 1;
  const dashed = false;
  const levels = [0.236, 0.382, 0.5, 0.618, 0.786, 1];
  return (
    <>
      {[...levels].reverse().map(l => (
        <circle key={`f${l}`} cx={ax} cy={ay} r={r0 * l} fill={fibColor(l)} fillOpacity={0.035} stroke="none" />
      ))}
      {levels.map(l => (
        <circle key={l} cx={ax} cy={ay} r={r0 * l} fill="none" stroke={fibColor(l)}
          strokeWidth={l === 1 ? 1.5 : 1} opacity={0.85}
          strokeDasharray={dashed ? '4,4' : undefined} />
      ))}
      {levels.map(l => (
        <text key={`t${l}`} x={ax} y={ay - r0 * l - 3} textAnchor="middle" fontSize={8}
          fill={fibColor(l)} stroke="none">{l}</text>
      ))}
      {hitStroke({ cx: ax, cy: ay, r: r0 }, interactive)}
    </>
  );
};

export const fibSpiral = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const r0 = Math.hypot(bx - ax, by - ay) || 1;
  const ang0 = Math.atan2(by - ay, bx - ax);
  const growth = Math.log(1.618) / (Math.PI / 2);
  const pts = [];
  for (let th = 0; th <= Math.PI * 6; th += 0.12) {
    const r = r0 * Math.exp(-growth * th);
    if (r < 0.5) break;
    pts.push(`${ax + r * Math.cos(ang0 - th)},${ay + r * Math.sin(ang0 - th)}`);
  }
  return (
    <>
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" />
      {hitStroke({ points: pts.join(' ') }, interactive)}
    </>
  );
};

export const fibWedge = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const p3 = { x: pxForTime(d.x3), y: yScale(d.y3) };
  const a1 = Math.atan2(by - ay, bx - ax);
  const a2 = Math.atan2(p3.y - ay, p3.x - ax);
  const r0 = Math.min(Math.hypot(bx - ax, by - ay), Math.hypot(p3.x - ax, p3.y - ay)) || 1;
  const sweep = ((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const arc = (r) => {
    const sx2 = ax + r * Math.cos(a1), sy2 = ay + r * Math.sin(a1);
    const ex2 = ax + r * Math.cos(a2), ey2 = ay + r * Math.sin(a2);
    return `M${sx2},${sy2} A${r},${r} 0 0 ${sweep > 0 ? 1 : 0} ${ex2},${ey2}`;
  };
  const sector = (r) => `M${ax},${ay} L${ax + r * Math.cos(a1)},${ay + r * Math.sin(a1)} A${r},${r} 0 0 ${sweep > 0 ? 1 : 0} ${ax + r * Math.cos(a2)},${ay + r * Math.sin(a2)} Z`;
  const am = a1 + sweep / 2;
  return (
    <>
      <line x1={ax} y1={ay} x2={ax + r0 * Math.cos(a1)} y2={ay + r0 * Math.sin(a1)} stroke={stroke} strokeWidth={1.5} />
      <line x1={ax} y1={ay} x2={ax + r0 * Math.cos(a2)} y2={ay + r0 * Math.sin(a2)} stroke={stroke} strokeWidth={1.5} />
      {[1, 0.618, 0.382].map(l => (
        <path key={`f${l}`} d={sector(r0 * l)} fill={fibColor(l)} fillOpacity={0.04} stroke="none" />
      ))}
      {[0.382, 0.618, 1].map(l => (
        <path key={l} d={arc(r0 * l)} fill="none" stroke={fibColor(l)} strokeWidth={1} opacity={0.85} />
      ))}
      {[0.382, 0.618, 1].map(l => (
        <text key={`t${l}`} x={ax + (r0 * l + 7) * Math.cos(am)} y={ay + (r0 * l + 7) * Math.sin(am)}
          textAnchor="middle" dy="0.32em" fontSize={8} fill={fibColor(l)} stroke="none">{l}</text>
      ))}
      {hitStroke({ d: arc(r0) }, interactive)}
    </>
  );
};

export const gannBox = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const ex2 = bx, ey2 = by;
  const x0 = Math.min(ax, ex2), x1p = Math.max(ax, ex2);
  const y0 = Math.min(ay, ey2), y1p = Math.max(ay, ey2);
  const fr = [0.25, 0.382, 0.5, 0.618, 0.75];
  return (
    <>
      <rect x={x0} y={y0} width={x1p - x0} height={y1p - y0} fill={stroke} fillOpacity={0.04}
        stroke={stroke} strokeWidth={1.5} pointerEvents={interactive ? 'stroke' : 'none'} />
      {d.type === 'gann_box' && [0, ...fr].map((f, k2, arr) => {
        const nxt = arr[k2 + 1] ?? 1;
        return (
          <rect key={`b${f}`} x={x0} y={y0 + (y1p - y0) * f} width={x1p - x0}
            height={(y1p - y0) * (nxt - f) || 1} fill={fibColor(nxt === 1 ? 0.75 : nxt)}
            fillOpacity={0.03} stroke="none" />
        );
      })}
      {d.type === 'gann_box' && fr.map(f => (
        <g key={`lb${f}`}>
          <text x={x0 - 4} y={y0 + (y1p - y0) * f} dy="0.32em" textAnchor="end" fontSize={8}
            fill={fibColor(f)} stroke="none">{f}</text>
          <text x={x0 + (x1p - x0) * f} y={y1p + 9} textAnchor="middle" fontSize={8}
            fill={fibColor(f)} stroke="none">{f}</text>
        </g>
      ))}
      {d.type === 'gann_box' && fr.map(f => (
        <g key={f} opacity={0.65}>
          <line x1={x0} x2={x1p} y1={y0 + (y1p - y0) * f} y2={y0 + (y1p - y0) * f} stroke={fibColor(f)} strokeWidth={1} />
          <line x1={x0 + (x1p - x0) * f} x2={x0 + (x1p - x0) * f} y1={y0} y2={y1p} stroke={fibColor(f)} strokeWidth={1} />
        </g>
      ))}
      {d.type === 'gann_square' && (() => {
        // quarter-circle arcs centered on the anchor corner, elliptical so
        // non-square px boxes still land the 1.0 arc on the far edges
        const dxs = ex2 - ax, dys = ey2 - ay;
        const sweep = dxs * dys > 0 ? 1 : 0;
        const arcPath = (f) =>
          `M${ax + dxs * f},${ay} A${Math.abs(dxs) * f},${Math.abs(dys) * f} 0 0 ${sweep} ${ax},${ay + dys * f}`;
        const AF = [0.25, 0.382, 0.5, 0.618, 0.75, 1];
        const band = (fi, fo) =>
          `${arcPath(fo)} L${ax},${ay + dys * fi} A${Math.abs(dxs) * fi},${Math.abs(dys) * fi} 0 0 ${1 - sweep} ${ax + dxs * fi},${ay} Z`;
        return (
          <g>
            <path d={`M${ax},${ay} L${ax + dxs * 0.25},${ay} A${Math.abs(dxs) * 0.25},${Math.abs(dys) * 0.25} 0 0 ${sweep} ${ax},${ay + dys * 0.25} Z`}
              fill={fibColor(0.25)} fillOpacity={0.06} stroke="none" />
            {AF.slice(0, -1).map((f, k2) => (
              <path key={`bd${f}`} d={band(f, AF[k2 + 1])} fill={fibColor(AF[k2 + 1] === 1 ? 0.786 : AF[k2 + 1])}
                fillOpacity={0.06} stroke="none" />
            ))}
            {fr.map(f => (
              <g key={`g${f}`} opacity={0.6}>
                <line x1={x0} x2={x1p} y1={ay + dys * f} y2={ay + dys * f} stroke={fibColor(f)} strokeWidth={1} />
                <line x1={ax + dxs * f} x2={ax + dxs * f} y1={y0} y2={y1p} stroke={fibColor(f)} strokeWidth={1} />
              </g>
            ))}
            {AF.map(f => (
              <path key={`a${f}`} d={arcPath(f)} fill="none" stroke={fibColor(f === 1 ? 0.786 : f)}
                strokeWidth={f === 1 ? 1.5 : 1.2} opacity={0.9} />
            ))}
            <g opacity={0.75}>
              <line x1={ax} y1={ay} x2={ex2} y2={ey2} stroke={stroke} strokeWidth={1.2} />
              {[0.25, 0.5, 0.75].map(f => (
                <g key={f}>
                  <line x1={ax} y1={ay} x2={ex2} y2={ay + dys * f} stroke={fibColor(f)} strokeWidth={1} />
                  <line x1={ax} y1={ay} x2={ax + dxs * f} y2={ey2} stroke={fibColor(f)} strokeWidth={1} />
                </g>
              ))}
            </g>
            {fr.map(f => (
              <g key={`t${f}`}>
                <text x={ex2 + (dxs > 0 ? 4 : -4)} y={ay + dys * f} dy="0.32em"
                  textAnchor={dxs > 0 ? 'start' : 'end'} fontSize={8} fill={fibColor(f)} stroke="none">{f}</text>
                <text x={ax + dxs * f} y={ey2 + (dys > 0 ? 9 : -4)} textAnchor="middle"
                  fontSize={8} fill={fibColor(f)} stroke="none">{f}</text>
              </g>
            ))}
          </g>
        );
      })()}
    </>
  );
};

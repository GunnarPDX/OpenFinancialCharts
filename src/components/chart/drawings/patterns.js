// multi-point harmonic / Elliott patterns (PATTERN_N types)
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) and returns bare children —
// the keyed <g> shell (context menu + cursor) is applied in drawings/index.js

import { PATTERN_LABELS } from '../constants';
import { hitStroke, TextChip } from './util';

export const pattern = (d, i, interactive, ctx) => {
  const { pxForTime, yScale } = ctx;
  const stroke = d.color || 'var(--dots-color)';
  const P = d.pts.map(q => ({ x: pxForTime(q.t), y: yScale(q.p) }));
  const LB = PATTERN_LABELS[d.type] || [];
  const attr = P.map(q => `${q.x},${q.y}`).join(' ');
  const isTri = d.type === 'triangle_pattern';
  const isDrives = d.type === 'three_drives';
  const isElliott = d.type.startsWith('ell_');
  const tri = [];
  if (!isDrives && !isElliott) for (let k2 = 0; k2 + 2 < P.length; k2 += 2) tri.push(k2);
  // label above local peaks, below local valleys
  const lblY = (k2) => {
    const nb = [P[k2 - 1], P[k2 + 1]].filter(Boolean);
    const peak = nb.every(q => P[k2].y <= q.y);
    return P[k2].y + (peak ? -7 : 13);
  };
  return (
    <>
      {!isTri && tri.map(k2 => (
        <polygon key={`f${k2}`}
          points={`${P[k2].x},${P[k2].y} ${P[k2 + 1].x},${P[k2 + 1].y} ${P[k2 + 2].x},${P[k2 + 2].y}`}
          fill={stroke} fillOpacity={0.08} stroke="none" />
      ))}
      {isTri && P.length >= 4 && (
        <>
          <polygon points={`${P[0].x},${P[0].y} ${P[2].x},${P[2].y} ${P[3].x},${P[3].y} ${P[1].x},${P[1].y}`}
            fill={stroke} fillOpacity={0.08} stroke="none" />
          <polyline points={attr} fill="none" stroke={stroke} strokeWidth={1} opacity={0.4} />
          <line x1={P[0].x} y1={P[0].y} x2={P[2].x} y2={P[2].y} stroke={stroke} strokeWidth={1.5} />
          <line x1={P[1].x} y1={P[1].y} x2={P[3].x} y2={P[3].y} stroke={stroke} strokeWidth={1.5} />
        </>
      )}
      {!isTri && <polyline points={attr} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />}
      {isDrives && [[1, 2, 3], [3, 4, 5]].map(([a2, m2, b2]) => P[b2] && (() => {
        const denom = d.pts[a2].p - d.pts[m2].p;
        const ratio = denom ? Math.abs((d.pts[b2].p - d.pts[m2].p) / denom) : 0;
        return (
          <g key={`dr${a2}`}>
            <line x1={P[a2].x} y1={P[a2].y} x2={P[b2].x} y2={P[b2].y} stroke={stroke}
              strokeWidth={1} strokeDasharray="5,4" opacity={0.8} />
            <TextChip lines={[ratio.toFixed(2)]} x={(P[a2].x + P[b2].x) / 2}
              y={(P[a2].y + P[b2].y) / 2 - 7} w={26} h={12} stroke={stroke} />
          </g>
        );
      })())}
      {d.type === 'head_shoulders' && P.length >= 5 && (() => {
        const xs = P.map(q => q.x);
        const nx1 = Math.min(...xs) - 10, nx2 = Math.max(...xs) + 10;
        const slope = (P[4].y - P[2].y) / ((P[4].x - P[2].x) || 1);
        const yAtX = (x) => P[2].y + slope * (x - P[2].x);
        return <line x1={nx1} y1={yAtX(nx1)} x2={nx2} y2={yAtX(nx2)} stroke={stroke}
          strokeWidth={1} strokeDasharray="5,4" opacity={0.75} />;
      })()}
      {P.map((q, k2) => <circle key={`p${k2}`} cx={q.x} cy={q.y} r={2.5} fill={stroke} />)}
      {P.map((q, k2) => LB[k2] && (
        <text key={`l${k2}`} x={q.x} y={lblY(k2)} textAnchor="middle" fontSize={9}
          fontWeight={600} fill={stroke} stroke="none">{LB[k2]}</text>
      ))}
      {hitStroke({ points: attr }, interactive)}
    </>
  );
};

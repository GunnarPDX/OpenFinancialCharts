import React from 'react';

// Renderer for a script plot's declared style (plot(..., style=, linestyle=)).
// Takes gap-split segments of {x, y} pixel points and returns SVG elements.
// Plain lines come out as the same polyline the chart always drew, so
// non-script studies routed through here render unchanged.

const DASH = { dashed: '6,4', dotted: '2,4' };

const toAttr = (seg) => seg.map(pt => `${pt.x},${pt.y}`).join(' ');
// insert the horizontal-then-vertical corner point between samples
const stepped = (seg) => seg.flatMap((pt, k) => (k ? [{ x: pt.x, y: seg[k - 1].y }, pt] : [pt]));

// segs: array of point runs; style/lineStyle from the plot record; baseY:
// pixel of the histogram/area baseline; barW: histogram bar width in px
export const styledPlotSegs = ({ segs, style, lineStyle, color, width, baseY, barW, keyPrefix }) => {
  if (style === 'circles') {
    return segs.flatMap((seg, si) => seg.map((pt, k) => (
      <circle key={`${keyPrefix}-${si}-${k}`} cx={pt.x} cy={pt.y} r={Math.max(1.5, width)} fill={color} />
    )));
  }
  if (style === 'histogram') {
    const w = Math.max(1, barW);
    return segs.flatMap((seg, si) => seg.map((pt, k) => (
      <rect
        key={`${keyPrefix}-${si}-${k}`}
        x={pt.x - w / 2}
        y={Math.min(pt.y, baseY)}
        width={w}
        height={Math.max(1, Math.abs(baseY - pt.y))}
        fill={color}
        fillOpacity={0.75}
      />
    )));
  }
  return segs.map((seg, si) => {
    const pts = style === 'stepline' ? stepped(seg) : seg;
    const line = (
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={DASH[lineStyle]}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={toAttr(pts)}
      />
    );
    if (style !== 'area' || seg.length < 2) {
      return React.cloneElement(line, { key: `${keyPrefix}-${si}` });
    }
    const closed = [...pts, { x: pts[pts.length - 1].x, y: baseY }, { x: pts[0].x, y: baseY }];
    return (
      <g key={`${keyPrefix}-${si}`}>
        <polygon points={toAttr(closed)} fill={color} fillOpacity={0.15} stroke="none" />
        {line}
      </g>
    );
  });
};

// gap-split a value array over the drawn window into {x, y} runs
export const valueSegs = (vals, drawLo, hiR, xAt, yAt) => {
  const segs = [];
  let cur = [];
  for (let r = drawLo; r <= hiR; r++) {
    const v = vals[r];
    if (isFinite(v)) cur.push({ x: xAt(r), y: yAt(v) });
    else if (cur.length) { segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  return segs;
};

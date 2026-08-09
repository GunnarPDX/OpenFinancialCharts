import React from 'react';

import { AxisBottom, AxisRight } from '@visx/axis';
import { format } from 'd3-format';

import AxisTag from './AxisTag';
import { lineColorOf, lineWidthOf } from './lineStyle';

const formatPrice = format('$,.2f');

// hover is hit-tested by the axis-strip drag rect in the chart body (it
// covers the tags and captures their mouse events), so the tags themselves
// stay inert
export const studyTagEl = (t, xMax, marginRight) => (
  <g key={`study-tag-${t.id}`} pointerEvents="none">
    <AxisTag x={xMax + 2} y={t.y} width={marginRight - 4} color={t.color}
      label={formatPrice(t.value)} />
  </g>
);

// the price/time axes plus the axis-anchored tag layers (valuation-line
// levels, per-study price tags, last-close marker)
const ChartAxes = React.memo(({
  parentWidth, marginRight, yMax, xMax, plotBottom,
  yScale, xAxisScale, xTicksMajor, xTicksMinor, xTickLabel,
  studyLines, studyAxisTags, series,
}) => (
  <>
    {/* minor axes: the axis line + short unlabeled ticks; majors draw over them */}
    <AxisRight
      left={parentWidth - marginRight}
      scale={yScale}
      stroke="var(--axis-lines)"
      tickStroke="var(--axis-lines)"
      numTicks={20}
      tickLength={3}
      tickFormat={() => ''}
    />
    <AxisBottom
      top={yMax}
      scale={xAxisScale}
      stroke="var(--axis-lines)"
      tickStroke="var(--axis-lines)"
      tickValues={xTicksMinor}
      tickLength={3}
      tickFormat={() => ''}
    />
    <AxisRight
      left={parentWidth - marginRight}
      scale={yScale}
      hideAxisLine
      hideZero
      tickStroke="var(--axis-lines)"
      numTicks={5}
      tickLength={6}
      tickFormat={formatPrice}
      tickLabelProps={() => ({
        fill: 'var(--text-faint)',
        fontSize: 11,
        fontWeight: 400,
        textAnchor: 'start',
        dy: '0.33em',
        dx: '0.25em',
        style: { fontVariantNumeric: 'tabular-nums' },
      })}
    />
    <AxisBottom
      top={yMax}
      scale={xAxisScale}
      hideAxisLine
      tickStroke="var(--axis-lines)"
      tickValues={xTicksMajor}
      tickLength={6}
      tickFormat={xTickLabel}
      tickLabelProps={() => ({
        fill: 'var(--text-faint)',
        fontSize: 11,
        fontWeight: 400,
        textAnchor: 'middle',
        dy: '0.25em',
        style: { fontVariantNumeric: 'tabular-nums' },
      })}
    />

    {/* y-axis price tags for studies with horizontal levels (valuation lines) */}
    {studyLines.filter(({ def }) => def.axisTags).map(({ inst, def, points }) => (
      <g key={`tags-${inst.key}`} pointerEvents="none">
        {(def.lines || [{ key: null, color: inst.color }]).map(l => {
          const pt = points.find(p => !l.key || p.line === l.key);
          if (!pt) return null;
          const y = yScale(pt.value);
          if (y < 10 || y > plotBottom - 6) return null;
          return (
            <g key={l.key || 'main'}>
              {/* constant level: span the full plot and run into the tag */}
              <line
                x1={0}
                x2={xMax + 2}
                y1={y}
                y2={y}
                stroke={lineColorOf(inst, l)}
                strokeWidth={lineWidthOf(inst, l.width || 1)}
              />
              <AxisTag x={xMax + 2} y={y} width={marginRight - 4} color={lineColorOf(inst, l)}
                label={formatPrice(pt.value)} />
            </g>
          );
        })}
      </g>
    ))}

    {/* y-axis price tags at each overlay study line's last visible value,
        tag border matching the line color (one per line — Alligator gets 3);
        hovered tag is re-rendered at the end of the svg, above everything */}
    {studyAxisTags.map(t => studyTagEl(t, xMax, marginRight))}

    {/* last-close marker: dashed level + axis tag pinned to the newest close.
        When the price is scrolled out of range vertically, the tag clamps to
        the axis edge and the line is skipped */}
    {series.length > 0 && (() => {
      const last = series[series.length - 1];
      const y = yScale(last.close);
      const color = last.direction ? 'var(--red)' : 'var(--green)';
      const inRange = y >= 10 && y <= plotBottom - 6;
      const tagY = Math.max(10, Math.min(plotBottom - 6, y));
      return (
        <g pointerEvents="none">
          {inRange && (
            <line x1={0} x2={xMax + 2} y1={y} y2={y}
              stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.9} />
          )}
          <AxisTag x={xMax + 2} y={tagY} width={marginRight - 4} fill={color}
            textFill="#fff" label={formatPrice(last.close)} />
        </g>
      );
    })()}
  </>
));

// color-matched y-axis price tags for level drawings
export const LevelTags = React.memo(({ drawings, hiddenColors, yScale, plotBottom, xMax, marginRight }) => (
  <>
    {drawings.map((d, i) => {
      if (d.type !== 'level') return null;
      if (hiddenColors.includes(d.color || 'multi')) return null;
      const y = yScale(d.p);
      if (y < 10 || y > plotBottom - 6) return null;
      return (
        <g key={`lvl-tag-${i}`} pointerEvents="none">
          <AxisTag x={xMax + 2} y={y} width={marginRight - 4}
            color={d.color || '#3b82f6'} fill="var(--menu-background)"
            textFill="var(--text-subtle)" label={formatPrice(d.p)} />
        </g>
      );
    })}
  </>
));

// small session markers on the axis (day start / market open / market
// close), placed on the boundary between the two bars. Rendered above
// the drag plane so hover reaches them; a wide invisible rect is the
// hit target, the chip shows instantly (native <title> tooltips were
// too small/slow to trigger)
export const AxisMarkers = React.memo(({ axisMarkers, w0, frac, step, xMax, yMax, marginBottom }) => {
  // key of the axis marker under the cursor (hover label)
  const [hoverAxisMark, setHoverAxisMark] = React.useState(null);
  return (
    <g>
      {axisMarkers.map(m => {
        const x = (m.r - w0 - frac) * step;
        if (x < 0 || x > xMax) return null;
        const key = `${m.r}-${m.label}`;
        const tx = Math.max(28, Math.min(xMax - 28, x));
        return (
          <g key={key}>
            <path d={`M${x},${yMax + 1} l3,5 h-6 z`} fill={m.color} />
            {hoverAxisMark === key && (
              <g pointerEvents="none" transform={`translate(${tx}, ${yMax - 20})`}>
                <rect x={-28} y={0} width={56} height={16} rx={4}
                  fill="var(--menu-background)" stroke="var(--border)" />
                <text x={0} y={8} dy="0.32em" textAnchor="middle" fontSize={9}
                  fill="var(--text)">{m.label}</text>
              </g>
            )}
            <rect x={x - 6} y={yMax} width={12} height={marginBottom} fill="transparent"
              onMouseEnter={() => setHoverAxisMark(key)}
              onMouseLeave={() => setHoverAxisMark(null)} />
          </g>
        );
      })}
    </g>
  );
});

export default ChartAxes;

import React from 'react';
import { localPoint } from '@visx/event';
import { format } from 'd3-format';
import AxisTag from './AxisTag';

const formatPrice = format('$,.2f');
const formatVol = format('.3s');

// Everything that follows the pointer: crosshair, tooltip, price display, and
// the axis price/time tags. Owns the cursor state and subscribes to the svg's
// mousemove itself (rAF-coalesced), so pointer movement re-renders only this
// small layer instead of the whole chart body.
const CursorLayer = ({
  svgRef,
  xMax,
  yMax,
  plotBottom,
  marginRight,
  series,
  w0,
  frac,
  step,
  maxIdx,
  yScale,
  fmtTime,
  showCrosshair,
  showTooltip,
  showPriceDisplay,
  stickToData,
  hoveredBarRef, // parent reads the bar under the cursor on tap (anchored VWAP)
}) => {
  const [cursor, setCursor] = React.useState(null);
  // latest plot extents for the native listener, which subscribes once
  const geomRef = React.useRef(null);
  geomRef.current = { xMax, yMax };

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    let raf = 0;
    let next = null;
    const flush = () => { raf = 0; setCursor(next); };
    const move = (event) => {
      const p = localPoint(event);
      const g = geomRef.current;
      next = p && p.x <= g.xMax && p.y <= g.yMax ? p : null;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const leave = () => {
      next = null;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    svg.addEventListener('mousemove', move);
    svg.addEventListener('mouseleave', leave);
    return () => {
      svg.removeEventListener('mousemove', move);
      svg.removeEventListener('mouseleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [svgRef]);

  // datapoint under the cursor: invert the slot layout (window start + frac)
  const hovered = cursor
    ? series[Math.max(0, Math.min(maxIdx, Math.floor(w0 + frac + cursor.x / step)))]
    : null;
  React.useEffect(() => {
    if (hoveredBarRef) hoveredBarRef.current = hovered;
  });

  // with "stick" on, the crosshair/tooltip anchor to the hovered datapoint
  // (slot center, close price) instead of the raw pointer
  const anchor = stickToData && hovered
    ? {
        x: (hovered.rank - w0 - frac + 0.5) * step,
        y: Math.max(0, Math.min(yMax, yScale(hovered.close))),
      }
    : cursor;

  if (!cursor) return null;

  return (
    <>
      {/* price tag on the y axis, riding the cursor (or the stuck datapoint) */}
      {anchor && (() => {
        const ty = Math.max(9, Math.min(anchor.y, plotBottom - 9));
        return (
          <g pointerEvents="none">
            <AxisTag x={xMax + 2} y={ty} width={marginRight - 4} color="var(--border)"
              height={18} fontSize={10} textDx={6}
              label={formatPrice(yScale.invert(anchor.y))} />
          </g>
        );
      })()}

      {/* time tag on the x axis, riding the cursor (or the stuck datapoint) */}
      {anchor && hovered && (() => {
        const tw = 58;
        const tx = Math.max(tw / 2, Math.min(anchor.x, xMax - tw / 2));
        return (
          <g pointerEvents="none">
            <rect
              x={tx - tw / 2}
              y={yMax + 3}
              width={tw}
              height={18}
              rx={3}
              fill="var(--button-background)"
              stroke="var(--border)"
            />
            <text
              x={tx}
              y={yMax + 12}
              dy="0.32em"
              textAnchor="middle"
              fontSize={10}
              fill="var(--text)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {fmtTime(hovered.date)}
            </text>
          </g>
        );
      })()}

      {showCrosshair && anchor && (
        <g pointerEvents="none">
          <line
            x1={0} x2={xMax}
            y1={anchor.y} y2={anchor.y}
            stroke="var(--text-faint)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <line
            x1={anchor.x} x2={anchor.x}
            y1={0} y2={yMax}
            stroke="var(--text-faint)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        </g>
      )}

      {showTooltip && anchor && hovered && (() => {
        const rows = [
          ['O', formatPrice(hovered.open)],
          ['H', formatPrice(hovered.high)],
          ['L', formatPrice(hovered.low)],
          ['C', formatPrice(hovered.close)],
          ...(hovered.volume != null ? [['V', formatVol(hovered.volume)]] : []),
        ];
        const ttW = 118;
        const ttH = 24 + rows.length * 13;
        const tx = anchor.x + 14 + ttW > xMax ? anchor.x - ttW - 14 : anchor.x + 14;
        const ty = Math.max(0, Math.min(anchor.y + 14, yMax - ttH));
        return (
          <g pointerEvents="none" transform={`translate(${tx}, ${ty})`}>
            <rect width={ttW} height={ttH} rx={5} fill="var(--menu-background)" stroke="var(--border)" />
            <text x={8} y={15} fontSize={10} fill="var(--text-faint)">
              {fmtTime(hovered.date)}
            </text>
            {rows.map(([label, value], i) => (
              <text
                key={label}
                x={8}
                y={29 + i * 13}
                fontSize={10}
                fill="var(--text-subtle)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {label} {value}
              </text>
            ))}
          </g>
        );
      })()}

      {showPriceDisplay && (
        <g pointerEvents="none" transform={`translate(8, ${plotBottom - 30})`}>
          <rect width={148} height={22} rx={4} fill="var(--menu-background)" stroke="var(--border)" />
          <text
            x={8}
            y={15}
            fontSize={11}
            fill="var(--text-subtle)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatPrice(stickToData && hovered ? hovered.close : yScale.invert(cursor.y))}
            {hovered ? `  ·  ${fmtTime(hovered.date)}` : ''}
          </text>
        </g>
      )}
    </>
  );
};

export default CursorLayer;

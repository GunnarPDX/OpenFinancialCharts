import React from 'react';

import { format } from 'd3-format';
import { FUTURE_PAD } from './useZoomWindow';
import { lineColorOf, lineWidthOf } from './lineStyle';
import { styledPlotSegs, valueSegs } from './scriptPlotStyle';
import { TradeChip, fmtQty } from './drawings/util';

// Forward-projected study points (Ichimoku cloud, Alligator shifts) carry
// ranks past the last bar, where drawHi is clamped and the band scale has no
// date — so line paths admit ranks up to the future pad and fall back to
// rank-space x for points beyond the data. The chart-area clip trims any
// overshoot.
const lineX = (p, { xScale, w0, step }) => {
  const xb = xScale(p.date);
  return xb != null ? xb + xScale.bandwidth() / 2 : (p.rank - w0 + 0.5) * step;
};

// pixel helpers shared with the chart body's study hit-lines
export const studyPointsAttr = (points, ctx) => points
  .filter(p => p.rank >= ctx.drawLo && p.rank <= ctx.drawHi + FUTURE_PAD)
  .map(p => `${lineX(p, ctx)},${ctx.yScale(p.value)}`)
  .join(' ');

// split a point run wherever ranks skip, so disjoint stretches (darvas
// boxes, pivots after gaps) don't get joined by stray diagonals
const studySegments = (points, drawLo, drawHi) => {
  const segs = [];
  let cur = [];
  points
    .filter(p => p.rank >= drawLo && p.rank <= drawHi + FUTURE_PAD)
    .sort((a, b) => a.rank - b.rank) // chronological computes can emit descending ranks
    .forEach(p => {
      if (cur.length && p.rank !== cur[cur.length - 1].rank + 1) {
        segs.push(cur);
        cur = [];
      }
      cur.push(p);
    });
  if (cur.length) segs.push(cur);
  return segs;
};

// the in-plot study overlay marks (script plots, zone boxes, projections,
// ribbons, icons, plain/multi lines, dots, segmented lines). Mounted inside
// the chart-area clip + fractional-scroll transform group, next to the main
// price line.
const StudyOverlays = React.memo(({
  studyLines, series, xScale, yScale, drawLo, drawHi, w0, frac, step, xMax, plotBottom,
}) => {
  const segAttr = (seg) => seg
    .map(p => `${lineX(p, { xScale, w0, step })},${yScale(p.value)}`)
    .join(' ');
  return (
    <>
      {studyLines.filter(({ def }) => !def.renderAs || def.renderAs === 'ribbon' || def.renderAs === 'icons' || def.renderAs === 'script' || def.renderAs === 'boxes').map(({ inst, def, points }) => {
        const inWindow = points.filter(p => p.rank >= drawLo && p.rank <= drawHi);
        if (def.renderAs === 'script') {
          // custom script overlay: fills between plots, then the plot lines
          // in their declared styles; shapes paint in the shared marker layer
          const res = def.script;
          const xAt = (r) => xScale(series[r].date) + xScale.bandwidth() / 2;
          const hiR = Math.min(drawHi, series.length - 1);
          return (
            <g key={inst.key}>
              {res.fills.map((f, fi) => {
                const fwd = [], bwd = [];
                for (let r = drawLo; r <= hiR; r++) {
                  if (isFinite(f.a[r]) && isFinite(f.b[r])) {
                    fwd.push(`${xAt(r)},${yScale(f.a[r])}`);
                    bwd.push(`${xAt(r)},${yScale(f.b[r])}`);
                  }
                }
                if (!fwd.length) return null;
                return (
                  <polygon key={`f${fi}`} points={[...fwd, ...bwd.reverse()].join(' ')}
                    fill={f.color} fillOpacity={f.opacity} stroke="none" />
                );
              })}
              {res.plots.map(pl => styledPlotSegs({
                segs: valueSegs(pl.values, drawLo, hiR, xAt, (v) => yScale(v)),
                style: pl.style,
                lineStyle: pl.lineStyle,
                color: lineColorOf(inst, { key: pl.key, color: pl.color }),
                width: lineWidthOf(inst, pl.width || 1),
                baseY: plotBottom,
                barW: step * 0.6,
                keyPrefix: pl.key,
              }))}
            </g>
          );
        }
        if (def.renderAs === 'boxes') {
          // zone boxes (gaps): from the opening seam to the fill bar, or
          // to the right edge while still open. Rank-space px — the
          // wrapping group already applies the fractional-scroll shift
          const rpx = (r) => (r - w0 + 0.5) * step;
          return (
            <g key={inst.key}>
              {points.map((b, bi) => {
                const x1 = Math.max(rpx(b.start), -step);
                const x2 = b.end == null ? xMax + frac * step : rpx(b.end);
                if (x2 <= x1) return null;
                const yT = yScale(b.top);
                const color = b.up ? 'var(--green)' : 'var(--red)';
                return (
                  <rect key={bi} x={x1} y={yT}
                    width={Math.max(1, x2 - x1)}
                    height={Math.max(1, yScale(b.bottom) - yT)}
                    fill={color} fillOpacity={0.13}
                    stroke={color} strokeOpacity={0.55} strokeWidth={1} />
                );
              })}
            </g>
          );
        }
        if (def.renderAs === 'ribbon') {
          return (
            <g key={inst.key}>
              {inWindow.map(p => (
                <rect
                  key={p.rank}
                  x={xScale(p.date)}
                  y={plotBottom - 9}
                  width={xScale.bandwidth()}
                  height={6}
                  rx={1}
                  fill={p.color}
                />
              ))}
            </g>
          );
        }
        if (def.renderAs === 'icons') {
          return (
            <g key={inst.key} stroke="var(--background)" strokeWidth={1}>
              {inWindow.map(pt => {
                const x = xScale(pt.date) + xScale.bandwidth() / 2;
                if (pt.icon === 'moon_new' || pt.icon === 'moon_full') {
                  const isNew = pt.icon === 'moon_new';
                  return (
                    <circle
                      key={`${pt.rank}-${pt.icon}`}
                      cx={x}
                      cy={yScale(pt.price) + (isNew ? -12 : 12)}
                      r={5}
                      fill={isNew ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
                    />
                  );
                }
                if (pt.icon === 'yes' || pt.icon === 'no') {
                  const above = pt.icon === 'yes';
                  return (
                    <circle
                      key={pt.rank}
                      cx={x}
                      cy={yScale(pt.price) + (above ? -10 : 10)}
                      r={4}
                      fill={above ? 'var(--green)' : 'var(--red)'}
                    />
                  );
                }
                const down = pt.icon === 'ct_down';
                const y = yScale(pt.price) + (down ? -10 : 10);
                return (
                  <path
                    key={pt.rank}
                    fill="#f5b942"
                    d={down
                      ? `M${x - 4},${y - 3} L${x + 4},${y - 3} L${x},${y + 4} Z`
                      : `M${x - 4},${y + 3} L${x + 4},${y + 3} L${x},${y - 4} Z`}
                  />
                );
              })}
            </g>
          );
        }
        if (def.lines) {
          return (
            <g key={inst.key}>
              {def.lines.flatMap(l =>
                studySegments(points.filter(p => p.line === l.key), drawLo, drawHi).map((seg, si) => (
                  <polyline
                    key={`${l.key}-${si}`}
                    fill="none"
                    stroke={lineColorOf(inst, l)}
                    strokeWidth={lineWidthOf(inst, l.width || 1)}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={segAttr(seg)}
                  />
                ))
              )}
            </g>
          );
        }
        if (def.dots) {
          return (
            <g key={inst.key}>
              {inWindow.map(pt => (
                <circle
                  key={pt.rank}
                  cx={xScale(pt.date) + xScale.bandwidth() / 2}
                  cy={yScale(pt.value)}
                  r={1.8}
                  fill={inst.color}
                />
              ))}
            </g>
          );
        }
        if (def.segmented) {
          return (
            <g key={inst.key} fill="none" strokeWidth={lineWidthOf(inst, 1)} strokeLinecap="round" strokeLinejoin="round">
              {inWindow.map((pt, i) => {
                const next = inWindow[i + 1];
                if (!next || next.rank !== pt.rank + 1) return null;
                const x1 = xScale(pt.date) + xScale.bandwidth() / 2;
                const x2 = xScale(next.date) + xScale.bandwidth() / 2;
                return (
                  <path
                    key={pt.rank}
                    stroke={pt.color || inst.color}
                    d={`M${x1},${yScale(pt.value)} L${x2},${yScale(next.value)}`}
                  />
                );
              })}
            </g>
          );
        }
        const anchorPt = def.anchorMarker && points.length > 0
          && points[0].rank >= drawLo && points[0].rank <= drawHi
          ? points[0] : null;
        return (
          <g key={inst.key}>
            <polyline
              fill="none"
              stroke={lineColorOf(inst, null)}
              strokeWidth={lineWidthOf(inst, 1)}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={studyPointsAttr(points, { drawLo, drawHi, xScale, yScale, w0, step })}
            />
            {anchorPt && (
              <circle
                cx={xScale(anchorPt.date) + xScale.bandwidth() / 2}
                cy={yScale(anchorPt.value)}
                r={4}
                fill={lineColorOf(inst, null)}
                stroke="var(--background)"
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </>
  );
});

// background washes from script bgcolor() calls
export const ScriptBgWashes = React.memo(({ scriptResults, series, xScale, drawLo, drawHi, frac, step, plotBottom }) => {
  if (!scriptResults.some(({ res }) => res.bgColors.length > 0)) return null;
  return (
    <g clipPath="url(#chart_area_clip)" pointerEvents="none">
      <g transform={`translate(${-frac * step}, 0)`}>
        {scriptResults.flatMap(({ cs, res }) => res.bgColors.map((bg, bi) => {
          const hiR = Math.min(drawHi, series.length - 1);
          const rects = [];
          for (let r = drawLo; r <= hiR; r++) {
            if (!bg.colors[r]) continue;
            rects.push(
              <rect key={r} x={xScale(series[r].date)} y={0}
                width={xScale.bandwidth() + 1} height={plotBottom}
                fill={bg.colors[r]} opacity={bg.opacity} />
            );
          }
          return <g key={`${cs.id}-bg${bi}`}>{rects}</g>;
        }))}
      </g>
    </g>
  );
});

// volume underlay: bars in the bottom quarter of the plot, behind price
export const VolumeUnderlay = React.memo(({ studyLines, visible, drawn, xScale, frac, step, plotBottom }) => (
  <>
    {studyLines.filter(({ def }) => def.renderAs === 'underlay').slice(0, 1).map(({ inst }) => {
      let maxVol = 1;
      visible.forEach(b => { if ((b.volume || 0) > maxVol) maxVol = b.volume; });
      const uh = (plotBottom - 20) * 0.25;
      return (
        <g key={inst.key} clipPath="url(#chart_area_clip)" pointerEvents="none">
          <g transform={`translate(${-frac * step}, 0)`}>
            {drawn.map(b => {
              const bh = ((b.volume || 0) / maxVol) * uh;
              if (bh <= 0) return null;
              return (
                <rect
                  key={b.rank}
                  x={xScale(b.date)}
                  y={plotBottom - bh}
                  width={xScale.bandwidth()}
                  height={bh}
                  fill={b.direction ? 'var(--red)' : 'var(--green)'}
                  opacity={0.3}
                  rx={1}
                />
              );
            })}
          </g>
        </g>
      );
    })}
  </>
));

// side-profile bars: behind the price action; labels render in an overlay
// above it (ProfileLabels) or they'd be painted over by candles. Bars carry
// their own x/fill/opacity (right-anchored, diverging, or streak — see the
// entry contract in studies/profileUtils.js); level entries project dashed
// price lines across the whole plot.
export const ProfileBars = React.memo(({ profileData, xMax, plotBottom, sidebarSlots }) => (
  <>
    {/* sidebar strip chrome: each strip gets its own surface + a divider at
        its left edge, so strip profiles read as panels rather than overlays
        (the first divider doubles as the plot boundary) */}
    {sidebarSlots && [...sidebarSlots.entries()].map(([key, s]) => (
      <g key={`strip-${key}`} pointerEvents="none">
        <rect x={s.x} y={0} width={s.w} height={plotBottom}
          fill="var(--background-dark)" opacity="0.5" />
        <path d={`M${s.x} 0V${plotBottom}`} stroke="var(--axis-lines)" strokeWidth="1" opacity="0.8" />
      </g>
    ))}
    {/* value ticks along each strip's bottom edge — drawn inside the strip
        so bottom panes (which start right below plotBottom) stay clear */}
    {profileData.filter(p => p.sidebarAxis).map(({ inst, sidebarAxis }) => (
      <g key={`sbaxis-${inst.key}`} pointerEvents="none">
        <path
          d={sidebarAxis.map(t => `M${t.x} ${plotBottom}v-4`).join('')}
          stroke="var(--axis-lines)"
          strokeWidth="1"
        />
        {sidebarAxis.filter(t => t.label != null).map((t, i) => (
          <text
            key={i}
            x={t.x + (t.anchor === 'start' ? 3 : t.anchor === 'end' ? -3 : 0)}
            y={plotBottom - 7}
            fontSize={9}
            fill="var(--text-faint)"
            textAnchor={t.anchor}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {t.label}
          </text>
        ))}
      </g>
    ))}
    {profileData.map(({ inst, bars, levels, centerX }) => (
      <g key={inst.key} clipPath="url(#profile_area_clip)" pointerEvents="none">
        {centerX != null && (
          <path d={`M${centerX} 0V${plotBottom}`} stroke="var(--axis-lines)" strokeWidth="1" opacity="0.5" />
        )}
        {(levels || []).map(l => (
          <path
            key={`lv-${l.k}`}
            d={`M0 ${l.y}H${xMax}`}
            stroke={l.color || 'var(--area-line-color)'}
            strokeWidth="1.2"
            strokeDasharray="5,4"
            opacity="0.7"
          />
        ))}
        {bars.map(b => (
          <rect
            key={b.k}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill={b.fill || 'var(--area-line-color)'}
            opacity={b.opacity}
            rx={1}
          />
        ))}
      </g>
    ))}
  </>
));

// profile labels: above the price action so they stay readable.
// POC always labeled; the rest only when their row is tall enough.
// Level lines get their price tagged at the left end.
export const ProfileLabels = React.memo(({ profileData, xMax }) => (
  <>
    {profileData.map(({ inst, bars, levels }) => (
      <g key={inst.key} clipPath="url(#profile_area_clip)" pointerEvents="none">
        {bars.filter(b => !b.streak && (b.poc || b.h >= 8)).map(b => (
          <text
            key={b.k}
            x={b.side < 0 ? b.x + b.w + 4 : b.x - 4}
            y={b.y + b.h / 2}
            dy="0.32em"
            textAnchor={b.side < 0 ? 'start' : 'end'}
            fontSize={9}
            fill="var(--text-subtle)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {format('.3~s')(b.labelValue ?? b.v)}
          </text>
        ))}
        {(levels || []).map(l => (
          <text
            key={`lv-${l.k}`}
            x={8}
            y={l.y - 4}
            fontSize={9}
            fill={l.color || 'var(--text-subtle)'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {/* significant digits, not fixed decimals — a sub-cent
                instrument's levels would otherwise all read "0.00" */}
            {format(',.6~r')(l.price)}
          </text>
        ))}
      </g>
    ))}
  </>
));

// drawing objects from script line.new()/label.new()/box.new() calls.
// Coordinates are bar_index (rank) × price; rank-space px so anchors past
// the window edges still resolve — the chart-area clip trims overshoot
export const ScriptObjects = React.memo(({ scriptResults, yScale, drawLo, drawHi, frac, step, w0 }) => {
  if (!scriptResults.some(({ res }) => (res.lines || []).length || (res.labels || []).length || (res.boxes || []).length)) return null;
  const rpx = (r) => (r - w0 + 0.5) * step;
  const spans = (a, b) => Math.max(a, b) >= drawLo && Math.min(a, b) <= drawHi + FUTURE_PAD;
  return (
    <g clipPath="url(#chart_area_clip)" pointerEvents="none">
      <g transform={`translate(${-frac * step}, 0)`}>
        {scriptResults.map(({ cs, res }) => (
          <g key={cs.id}>
            {(res.boxes || []).map((b, bi) => {
              if (!spans(b.x1, b.x2)) return null;
              const x = rpx(Math.min(b.x1, b.x2));
              const y = yScale(Math.max(b.y1, b.y2));
              return (
                <rect key={`b${bi}`} x={x} y={y}
                  width={Math.max(1, Math.abs(rpx(Math.max(b.x1, b.x2)) - x))}
                  height={Math.max(1, yScale(Math.min(b.y1, b.y2)) - y)}
                  fill={b.bgColor || 'none'} fillOpacity={b.bgColor ? 0.15 : 0}
                  stroke={b.color} strokeWidth={b.width} strokeOpacity={0.8} />
              );
            })}
            {(res.lines || []).map((l, li) => {
              if (!spans(l.x1, l.x2)) return null;
              return (
                <line key={`l${li}`} x1={rpx(l.x1)} y1={yScale(l.y1)}
                  x2={rpx(l.x2)} y2={yScale(l.y2)}
                  stroke={l.color} strokeWidth={l.width}
                  strokeDasharray={{ dashed: '6,4', dotted: '2,4' }[l.lineStyle]}
                  strokeLinecap="round" />
              );
            })}
            {(res.labels || []).map((lb, i) => {
              if (lb.x < drawLo || lb.x > drawHi + FUTURE_PAD) return null;
              const x = rpx(lb.x);
              const y = yScale(lb.y);
              const up = lb.style === 'up'; // anchor below the point, pointing up
              const fs = lb.size;
              const tw = lb.text.length * fs * 0.62 + 10;
              const th = fs + 8;
              const ty = up ? y + 6 : y - 6 - th;
              return (
                <g key={`t${i}`}>
                  <polygon points={up
                    ? `${x - 4},${y + 6} ${x + 4},${y + 6} ${x},${y + 1}`
                    : `${x - 4},${y - 6} ${x + 4},${y - 6} ${x},${y - 1}`}
                    fill={lb.color} />
                  <rect x={x - tw / 2} y={ty} width={tw} height={th} rx={3}
                    fill={lb.color} fillOpacity={0.92} />
                  <text x={x} y={ty + th / 2} dy="0.34em" textAnchor="middle"
                    fontSize={fs} fill={lb.textColor || 'var(--background)'}
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {lb.text}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </g>
    </g>
  );
});

// signal markers from custom scripts (both overlay and pane scripts)
export const ScriptShapes = React.memo(({ scriptResults, series, xScale, yScale, drawLo, drawHi, frac, step }) => {
  if (!scriptResults.some(({ res }) => res.shapes.length > 0)) return null;
  return (
    <g clipPath="url(#chart_area_clip)" pointerEvents="none">
      <g transform={`translate(${-frac * step}, 0)`}>
        {scriptResults.flatMap(({ cs, res }) => res.shapes.map((sh, si) => {
          const hiR = Math.min(drawHi, series.length - 1);
          const marks = [];
          for (let r = drawLo; r <= hiR; r++) {
            const v = sh.values[r];
            if (!v || Number.isNaN(v)) continue;
            const b = series[r];
            const x = xScale(b.date) + xScale.bandwidth() / 2;
            const y = sh.location === 'belowbar'
              ? yScale(b.low) + 9
              : sh.location === 'absolute'
                ? yScale(v)
                : yScale(b.high) - 9;
            const sz = sh.size;
            if (sh.shape === 'circle') {
              marks.push(<circle key={r} cx={x} cy={y} r={sz} fill={sh.color} />);
            } else if (sh.shape === 'square') {
              marks.push(<rect key={r} x={x - sz} y={y - sz} width={sz * 2} height={sz * 2} fill={sh.color} />);
            } else if (sh.shape === 'cross') {
              marks.push(<path key={r} d={`M${x - sz},${y - sz} L${x + sz},${y + sz} M${x - sz},${y + sz} L${x + sz},${y - sz}`}
                stroke={sh.color} strokeWidth={1.6} fill="none" />);
            } else if (sh.shape === 'triangledown') {
              marks.push(<polygon key={r} points={`${x - sz},${y - sz} ${x + sz},${y - sz} ${x},${y + sz}`} fill={sh.color} />);
            } else {
              marks.push(<polygon key={r} points={`${x - sz},${y + sz} ${x + sz},${y + sz} ${x},${y - sz}`} fill={sh.color} />);
            }
          }
          return <g key={`${cs.id}-${si}`}>{marks}</g>;
        }))}
      </g>
    </g>
  );
});

// buy/sell trade markers from script plotbuy()/plotsell() calls — the same
// chip the buy/sell drawing tools render, anchored at each signal bar's close.
// Follows the chart-wide "show full" setting; collapsed chips expand on hover
export const ScriptTrades = React.memo(({ scriptResults, series, xScale, yScale, drawLo, drawHi, frac, step, showFullTrades }) => {
  const [hover, setHover] = React.useState(null); // `${cs.id}:${ti}:${rank}`
  if (!scriptResults.some(({ res }) => (res.trades || []).length > 0)) return null;
  return (
    <g clipPath="url(#chart_area_clip)" pointerEvents="none">
      <g transform={`translate(${-frac * step}, 0)`}>
        {scriptResults.flatMap(({ cs, res }) => (res.trades || []).map((tr, ti) => {
          const hiR = Math.min(drawHi, series.length - 1);
          const buy = tr.side === 'buy';
          const title = buy ? 'BUY' : 'SELL';
          // scripts leave color null unless the user styled the call
          const stroke = tr.color || (buy ? 'var(--green)' : 'var(--red)');
          // price= anchor: an OHLC field, or per-bar custom prices (falling
          // back to close where the custom price is na)
          const src = tr.priceSource || 'close';
          const priceAt = (b, r) => (src === 'custom'
            ? (Number.isFinite(tr.prices?.[r]) ? tr.prices[r] : b.close)
            : b[src]);
          const priceLabel = src === 'custom' ? 'price:' : `${src}:`;
          const marks = [];
          for (let r = drawLo; r <= hiR; r++) {
            const v = tr.values[r];
            if (!v || Number.isNaN(v)) continue;
            const b = series[r];
            const price = priceAt(b, r);
            const x = xScale(b.date) + xScale.bandwidth() / 2;
            const y = yScale(price);
            const key = `${cs.id}:${ti}:${r}`;
            const collapsed = !showFullTrades && hover !== key;
            const qty = tr.qty[r];
            const cash = qty * price;
            const rows = collapsed ? [] : [
              ['qty:', fmtQty(qty)],
              ['val:', Number.isFinite(cash) ? `$${fmtQty(cash)}` : '—'],
              [priceLabel, price.toFixed(2)],
            ];
            marks.push(
              <g key={key}>
                <TradeChip x={x} y={y} stroke={stroke} title={title} rows={rows}
                  rectProps={showFullTrades ? undefined : {
                    pointerEvents: 'all',
                    onMouseEnter: () => setHover(key),
                    onMouseLeave: () => setHover(null),
                  }} />
              </g>
            );
          }
          return marks;
        }))}
      </g>
    </g>
  );
});

export default StudyOverlays;

import React from 'react';

import { AxisRight } from '@visx/axis';
import { scaleLinear } from '@visx/scale';
import { format } from 'd3-format';
import { lineColorOf, lineWidthOf } from './lineStyle';
import { styledPlotSegs } from './scriptPlotStyle';

// one study pane strip (volume / oscillator / baseline / bars / line):
// visible-window domain fit, a py() linear mapper, clipPath'd body and an
// AxisRight on the shared right margin. clipPath ids stay unique per pane
// (pane_clip_<inst.key>) exactly as before the extraction.
const StudyPane = ({
  pane: p, axisLeft, xMax, step, frac, w0, w1, drawLo, drawHi,
  xScale, series, visible, drawn, studyLines,
  startPaneResize, openStudyEditor, removeStudy,
}) => {
  const clipId = `pane_clip_${p.inst.key}`;
  // compact ticks for big cumulative values (OBV, A/D, force)
  const paneTickFmt = (v) => (Math.abs(v) >= 1000 ? format('.3s')(v) : `${(+v).toFixed(2)}`);
  const tickProps = () => ({
    fill: 'var(--text-faint)',
    fontSize: 9,
    fontWeight: 400,
    textAnchor: 'start',
    dy: '0.33em',
    dx: '0.25em',
  });
  let content;
  if (p.def.id === 'volume_display') {
    let maxVol = 1;
    visible.forEach(b => { if ((b.volume || 0) > maxVol) maxVol = b.volume; });
    const volY = (v) => p.top + p.height * (1 - (v || 0) / maxVol);
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          <g transform={`translate(${-frac * step}, 0)`}>
            {drawn.map(b => (
              <rect
                key={b.rank}
                x={xScale(b.date)}
                y={volY(b.volume)}
                width={xScale.bandwidth()}
                height={Math.max(p.bottom - volY(b.volume), 0)}
                fill={b.direction ? 'var(--red)' : 'var(--green)'}
                opacity={0.5}
                rx={1}
              />
            ))}
          </g>
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [0, maxVol] })}
          hideAxisLine
          hideZero
          numTicks={2}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={format('.2s')}
          tickLabelProps={tickProps}
        />
      </>
    );
  } else if (p.def.id === 'momentum_oscillator') {
    // bar-style oscillator: bars from a zero line, fixed -10…+10 domain
    const points = (studyLines.find(sl => sl.inst.key === p.inst.key)?.points || [])
      .filter(pt => pt.rank >= drawLo && pt.rank <= drawHi);
    const oscY = (v) => p.top + p.height * (1 - (v + 10.5) / 21);
    const zero = oscY(0);
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          <line x1={0} x2={xMax} y1={zero} y2={zero} stroke="var(--axis-lines)" />
          <g transform={`translate(${-frac * step}, 0)`}>
            {points.map(pt => {
              const y = oscY(pt.value);
              return (
                <rect
                  key={pt.rank}
                  x={xScale(pt.date)}
                  y={Math.min(y, zero)}
                  width={xScale.bandwidth()}
                  height={Math.max(Math.abs(y - zero), 1)}
                  fill={pt.color}
                  opacity={0.9}
                  rx={1}
                />
              );
            })}
          </g>
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [-10.5, 10.5] })}
          hideAxisLine
          tickValues={[-10, 0, 10]}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={(v) => `${v}`}
          tickLabelProps={tickProps}
        />
      </>
    );
  } else if (p.def.paneStyle === 'baseline') {
    // baseline pane: the reference value pinned mid-pane, green area/line
    // above it, red below
    const ref = p.def.paneRef ?? 0;
    const allPts = studyLines.find(sl => sl.inst.key === p.inst.key)?.points || [];
    const visPts = allPts.filter(pt => pt.rank >= w0 && pt.rank <= w1);
    const drawnPts = allPts.filter(pt => pt.rank >= drawLo && pt.rank <= drawHi);
    let half = 0;
    visPts.forEach(pt => { half = Math.max(half, Math.abs(pt.value - ref)); });
    half = (half || 1) * 1.15;
    const lo = ref - half, hi = ref + half;
    const py = (v) => p.top + p.height * (1 - (v - lo) / (hi - lo));
    const refY = py(ref);
    const coords = drawnPts.map(pt => `${xScale(pt.date) + xScale.bandwidth() / 2},${py(pt.value)}`);
    const areaPath = coords.length
      ? `M${coords[0].split(',')[0]},${refY} L${coords.join(' L')} L${coords[coords.length - 1].split(',')[0]},${refY} Z`
      : '';
    const halfPane = (id2, y, h, color) => (
      <React.Fragment key={id2}>
        <clipPath id={id2}>
          <rect x={0} y={y} width={xMax} height={Math.max(h, 0)} />
        </clipPath>
        <g clipPath={`url(#${id2})`}>
          <g transform={`translate(${-frac * step}, 0)`}>
            <path d={areaPath} fill={color} opacity={0.15} stroke="none" />
            <polyline
              fill="none"
              stroke={color}
              strokeWidth={lineWidthOf(p.inst, 1.5)}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={coords.join(' ')}
            />
          </g>
        </g>
      </React.Fragment>
    );
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          <line x1={0} x2={xMax} y1={refY} y2={refY} stroke="var(--axis-lines)" strokeDasharray="3,3" />
          {halfPane(`${clipId}_up`, p.top, refY - p.top, 'var(--green)')}
          {halfPane(`${clipId}_dn`, refY, p.bottom - refY, 'var(--red)')}
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [lo, hi] })}
          hideAxisLine
          tickValues={[lo + half * 0.15, ref, hi - half * 0.15]}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={paneTickFmt}
          tickLabelProps={tickProps}
        />
      </>
    );
  } else if (p.def.paneStyle === 'bars') {
    // bar pane: the main line renders as columns from the pane floor;
    // any further def.lines draw as polylines on top. Domain auto-fits
    // the visible window like the line pane
    const allPts = studyLines.find(sl => sl.inst.key === p.inst.key)?.points || [];
    const visPts = allPts.filter(pt => pt.rank >= w0 && pt.rank <= w1);
    const drawnPts = allPts.filter(pt => pt.rank >= drawLo && pt.rank <= drawHi);
    let lo = Infinity, hi = -Infinity;
    visPts.forEach(pt => {
      if (pt.value < lo) lo = pt.value;
      if (pt.value > hi) hi = pt.value;
    });
    if (typeof p.def.paneRef === 'number') {
      lo = Math.min(lo, p.def.paneRef);
      hi = Math.max(hi, p.def.paneRef);
    }
    if (!(hi > lo)) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    lo -= pad; hi += pad;
    const py = (v) => p.top + p.height * (1 - (v - lo) / (hi - lo));
    const lineDefs = p.def.lines || [{ key: null, color: p.inst.color }];
    const [mainLine, ...restLines] = lineDefs;
    // with a numeric paneRef the bars anchor on the reference line and
    // color green/red by sign — shaded darker when the bar pulls back
    // from its predecessor (green shrinking / red recovering);
    // otherwise they rise from the pane floor in the main line color
    const hasRef = typeof p.def.paneRef === 'number';
    const refY = hasRef ? py(p.def.paneRef) : p.bottom;
    const prevVal = new Map();
    if (hasRef) {
      allPts.forEach(pt => {
        if (!mainLine.key || pt.line === mainLine.key) prevVal.set(pt.rank + 1, pt.value);
      });
    }
    const barFill = (pt) => {
      if (pt.color) return pt.color; // compute-supplied per-bar color wins
      if (!hasRef) return mainLine.color || p.inst.color;
      const up = pt.value >= p.def.paneRef;
      const prev = prevVal.get(pt.rank);
      const grow = prev != null && (up ? pt.value > prev : pt.value < prev);
      if (up) return grow ? 'var(--green)' : 'var(--dark-green)';
      return grow ? 'var(--red)' : 'var(--dark-red)';
    };
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {hasRef && (
            <line x1={0} x2={xMax} y1={refY} y2={refY}
              stroke="var(--axis-lines)" strokeDasharray="3,3" />
          )}
          <g transform={`translate(${-frac * step}, 0)`}>
            {drawnPts
              .filter(pt => !mainLine.key || pt.line === mainLine.key)
              .map(pt => {
                const y = py(pt.value);
                return (
                  <rect
                    key={pt.rank}
                    x={xScale(pt.date)}
                    y={Math.min(y, refY)}
                    width={xScale.bandwidth()}
                    height={Math.max(Math.abs(refY - y), 1)}
                    fill={barFill(pt)}
                    opacity={0.75}
                    rx={Math.min(2, xScale.bandwidth() / 2)}
                  />
                );
              })}
            {restLines.map(l => (
              <polyline
                key={l.key}
                fill="none"
                stroke={l.color}
                strokeWidth={l.width || 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={drawnPts
                  .filter(pt => pt.line === l.key)
                  .map(pt => `${xScale(pt.date) + xScale.bandwidth() / 2},${py(pt.value)}`)
                  .join(' ')}
              />
            ))}
          </g>
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [lo, hi] })}
          hideAxisLine
          numTicks={2}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={paneTickFmt}
          tickLabelProps={tickProps}
        />
      </>
    );
  } else if (p.def.paneStyle === 'line') {
    // generic line pane: auto-fit y domain over the visible window, an
    // optional dashed reference line, and the study's line
    const allPts = studyLines.find(sl => sl.inst.key === p.inst.key)?.points || [];
    const visPts = allPts.filter(pt => pt.rank >= w0 && pt.rank <= w1);
    const drawnPts = allPts.filter(pt => pt.rank >= drawLo && pt.rank <= drawHi);
    let lo = Infinity, hi = -Infinity;
    visPts.forEach(pt => {
      if (pt.value < lo) lo = pt.value;
      if (pt.value > hi) hi = pt.value;
    });
    if (typeof p.def.paneRef === 'number') {
      lo = Math.min(lo, p.def.paneRef);
      hi = Math.max(hi, p.def.paneRef);
    }
    // declared horizontal levels (overbought/oversold bands) always fit
    (p.def.paneLevels || []).forEach(l => {
      lo = Math.min(lo, l.value);
      hi = Math.max(hi, l.value);
    });
    if (!(hi > lo)) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    lo -= pad; hi += pad;
    const py = (v) => p.top + p.height * (1 - (v - lo) / (hi - lo));
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {p.def.paneFill && (
            <rect
              x={0} y={py(p.def.paneFill.to)} width={xMax}
              height={Math.max(0, py(p.def.paneFill.from) - py(p.def.paneFill.to))}
              fill={p.def.paneFill.color}
            />
          )}
          {(p.def.paneLevels || []).map(l => (
            <line key={l.value} x1={0} x2={xMax} y1={py(l.value)} y2={py(l.value)}
              stroke={l.color || 'var(--axis-lines)'} strokeDasharray="3,3" opacity={0.8} />
          ))}
          {typeof p.def.paneRef === 'number' && (
            <line
              x1={0} x2={xMax}
              y1={py(p.def.paneRef)} y2={py(p.def.paneRef)}
              stroke="var(--axis-lines)"
              strokeDasharray="3,3"
            />
          )}
          <g transform={`translate(${-frac * step}, 0)`}>
            {(p.def.script?.fills || []).map((f, fi) => {
              const fwd = [], bwd = [];
              for (let r = drawLo; r <= Math.min(drawHi, series.length - 1); r++) {
                if (isFinite(f.a[r]) && isFinite(f.b[r])) {
                  const x = xScale(series[r].date) + xScale.bandwidth() / 2;
                  fwd.push(`${x},${py(f.a[r])}`);
                  bwd.push(`${x},${py(f.b[r])}`);
                }
              }
              if (!fwd.length) return null;
              return (
                <polygon key={`f${fi}`} points={[...fwd, ...bwd.reverse()].join(' ')}
                  fill={f.color} fillOpacity={f.opacity} stroke="none" />
              );
            })}
            {(p.def.lines || [{ key: null, color: p.inst.color }]).map(l => {
              // split into segments where ranks skip — omitted points are the
              // studies' gap convention (halted bars, zero-volume bars), and a
              // single polyline would draw a false connecting stroke across them
              const pts = drawnPts.filter(pt => !l.key || pt.line === l.key);
              const segs = [];
              let cur = [];
              pts.forEach((pt, k) => {
                if (k > 0 && pt.rank !== pts[k - 1].rank + 1 && cur.length) {
                  segs.push(cur);
                  cur = [];
                }
                cur.push({ x: xScale(pt.date) + xScale.bandwidth() / 2, y: py(pt.value) });
              });
              if (cur.length) segs.push(cur);
              // histogram/area baseline: zero when the domain includes it,
              // else the pane floor
              return styledPlotSegs({
                segs,
                style: l.style,
                lineStyle: l.lineStyle,
                color: lineColorOf(p.inst, l),
                width: lineWidthOf(p.inst, l.width || 1.5),
                baseY: py(Math.max(lo, Math.min(hi, 0))),
                barW: xScale.bandwidth() * 0.6,
                keyPrefix: l.key || 'main',
              });
            })}
          </g>
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [lo, hi] })}
          hideAxisLine
          numTicks={2}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={paneTickFmt}
          tickLabelProps={tickProps}
        />
      </>
    );
  } else {
    // oscillator pane: banded background, orange zero line, squeeze grid,
    // and a segment line carrying the momentum color (aqua / heavy blue)
    const allPoints = studyLines.find(sl => sl.inst.key === p.inst.key)?.points || [];
    const points = allPoints.filter(pt => pt.rank >= drawLo && pt.rank <= drawHi);
    const oscY = (v) => p.top + p.height * (1 - (v + 6) / 12);
    const cx = (pt) => xScale(pt.date) + xScale.bandwidth() / 2;
    // rank-based x (same slots as xScale) — works outside the drawn window
    const xr = (r) => (r - w0) * step + step / 2;

    // squeeze runs: consecutive bars with the oscillator resting at zero
    const runs = [];
    let run = null;
    allPoints.forEach(pt => {
      if (pt.squeeze > 0) {
        if (!run) run = { start: pt.rank, end: pt.rank };
        run.end = pt.rank;
      } else if (run) {
        runs.push(run);
        run = null;
      }
    });
    if (run) runs.push(run);
    const lastRank = allPoints.length ? allPoints[allPoints.length - 1].rank : -1;

    // the grid: staggered parallel lines climbing one level per bar,
    // holding their level, then dropping steeply at the breakout
    const squeezePaths = runs.flatMap(r2 => {
      const levels = Math.min(r2.end - r2.start + 1, 6);
      const paths = [];
      for (let k = 1; k <= levels; k++) {
        const cs = r2.start + k - 1;
        const endClimb = Math.min(cs + k, r2.end);
        const h = Math.min(k, endClimb - cs);
        if (h <= 0) continue;
        let d = `M${xr(cs)},${oscY(0)} L${xr(endClimb)},${oscY(h)} L${xr(r2.end)},${oscY(h)}`;
        if (r2.end < lastRank) d += ` L${xr(r2.end + h / 2.5)},${oscY(0)}`;
        paths.push(d);
      }
      return paths;
    });
    // translucent hue washes so the zones tint any theme's surface
    const bands = [
      [4, 6, 'rgba(70, 90, 255, 0.16)'],
      [2, 4, 'rgba(20, 184, 166, 0.14)'],
      [-2, 2, 'rgba(190, 180, 20, 0.12)'],
      [-4, -2, 'rgba(168, 60, 220, 0.13)'],
      [-6, -4, 'rgba(190, 24, 130, 0.13)'],
    ];
    content = (
      <>
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {bands.map(([lo, hi, c]) => (
            <rect key={c} x={0} y={oscY(hi)} width={xMax} height={oscY(lo) - oscY(hi)} fill={c} />
          ))}
          <line x1={0} x2={xMax} y1={oscY(0)} y2={oscY(0)} stroke="#d9822b" strokeWidth={1} />
          <g transform={`translate(${-frac * step}, 0)`} fill="none" stroke="#d9822b" strokeWidth={1} opacity={0.85} strokeLinejoin="round">
            {squeezePaths.map((d, i) => <path key={i} d={d} />)}
          </g>
          <g transform={`translate(${-frac * step}, 0)`} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            {points.map((pt, i) => {
              const next = points[i + 1];
              if (!next) return null;
              return (
                <path
                  key={pt.rank}
                  stroke={pt.color}
                  d={`M${cx(pt)},${oscY(pt.value)} L${cx(next)},${oscY(next.value)}`}
                />
              );
            })}
          </g>
        </g>
        <AxisRight
          left={axisLeft}
          scale={scaleLinear({ range: [p.bottom, p.top], domain: [-6, 6] })}
          hideAxisLine
          tickValues={[-6, -4, -2, 0, 2, 4, 6]}
          tickLength={4}
          tickStroke="var(--axis-lines)"
          tickFormat={(v) => `${v}`}
          tickLabelProps={tickProps}
        />
      </>
    );
  }
  return (
    <>
      <clipPath id={clipId}>
        <rect x={0} y={p.top} width={xMax} height={p.height} />
      </clipPath>
      <line x1={0} x2={xMax} y1={p.top - 4} y2={p.top - 4} stroke="var(--border)" />
      {content}
      <rect
        x={0}
        y={p.top - 9}
        width={xMax}
        height={10}
        fill="transparent"
        style={{ cursor: 'ns-resize' }}
        onMouseDown={(e) => startPaneResize(e, p)}
        onContextMenu={(e) => openStudyEditor(e, p.inst)}
      />
      <g
        className="ofc-pane-close"
        transform={`translate(6, ${p.top + 6})`}
        onClick={() => removeStudy(p.inst.key)}
      >
        <rect width={14} height={14} rx={3} fill="var(--menu-background)" stroke="var(--border)" />
        <line x1={4.5} y1={4.5} x2={9.5} y2={9.5} strokeWidth={1.2} strokeLinecap="round" />
        <line x1={9.5} y1={4.5} x2={4.5} y2={9.5} strokeWidth={1.2} strokeLinecap="round" />
      </g>
    </>
  );
};

// memo holds: pane objects come from the panes memo, data props are memoized
// upstream, and both function props are useCallback-stable — so a drawing
// drag or dialog toggle no longer re-renders every pane
export default React.memo(StudyPane);

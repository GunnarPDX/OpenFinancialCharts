import React from 'react';

import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { max, min } from 'd3-array';

import Brush from '../Brush';
import ChartMainLine from '../ChartMainLine';
import { MIN_WINDOW, MAX_WINDOW, FUTURE_PAD } from './useZoomWindow';

export const brushHeight = 35;
export const brushGap = 5;
const brushMargin = { top: 3, bottom: 0, left: 0, right: 0 };
const PATTERN_ID = 'zoom_brush_pattern';
const selectedBrushStyle = {
  fill: `url(#${PATTERN_ID})`,
  stroke: 'none',
};

const getStockValue = d => d.close;
// stable xGetter identity so the React.memo'd renderer isn't defeated by
// fresh closures each render
const getRankX = (b) => b.rank;

// the zoom brush strip under the plot: mini line chart + the window-synced
// brush selection. Owns the brush position/sync state and the brushing ref.
const BrushStrip = ({ series, w0, w1, maxIdx, setWindow, setFrac, xMax, top }) => {
  const minClose = React.useMemo(() => (min(series, getStockValue) || 0), [series]);
  const maxClose = React.useMemo(() => (max(series, getStockValue) || 0), [series]);

  // the strip tracks the plot's x extent, inset 5px from the left edge
  const xBrushMax = Math.max(xMax - 5, 0);
  const yBrushMax = Math.max(brushHeight - brushMargin.top - brushMargin.bottom, 0);

  // domain grows to cover future slots while the chart is scrolled past the
  // last bar, and shrinks back once it returns
  const brushDomainMax = Math.max(maxIdx, w1);
  const brushDomainMin = Math.min(0, w0);
  const brushXScale = React.useMemo(() => scaleLinear({
      range: [0, xBrushMax],
      domain: [brushDomainMin, brushDomainMax]
  }), [xBrushMax, brushDomainMin, brushDomainMax]);

  const brushYScale = React.useMemo(() => scaleLinear({
      range: [yBrushMax, 0],
      domain: [minClose, maxClose],
      nice: true
  }), [yBrushMax, minClose, maxClose]);

  // only read at Brush mount — reflects the current window so toggling the
  // brush back on doesn't show a stale full-range selection
  const initialBrushPosition = React.useMemo(() => ({
      start: { x: brushXScale(w0) },
      end: { x: brushXScale(w1) }
  }), [brushXScale, w0, w1]);

  const onBrushChange = (domain) => {
    if (!domain) return;
    const x0 = Math.max(brushDomainMin, Math.round(domain.x0));
    let x1 = Math.min(brushDomainMax, Math.round(domain.x1));
    // pushing the selection against the right end of the track expands the
    // domain into the future pad, a couple of slots per drag event, up to the limit
    if (x1 >= brushDomainMax && brushing.current) {
      x1 = Math.min(maxIdx + FUTURE_PAD, brushDomainMax + 2);
    }
    if (x1 - x0 >= MIN_WINDOW) {
      setWindow([Math.max(x0, x1 - MAX_WINDOW + 1), x1]);
      setFrac(0);
    }
  };

  // brush position syncs from chart gestures only — feeding the window straight back
  // into brushX0/X1 while the user drags the brush itself repositions it mid-drag,
  // compounding each move and flinging the selection sideways
  const [brushPos, setBrushPos] = React.useState([0, maxIdx]);
  // bumped on every brush-drag end: forces the selection to reposition even
  // when the drag was rejected (too small / clamped) and w0/w1 never changed
  const [brushSyncSeq, setBrushSyncSeq] = React.useState(0);
  const brushing = React.useRef(false);

  // grip handles on the selection edges: accent edge line + a small grip pill.
  // pointer-events off while a drag is live, or handles steal the selection's
  // move events when the cursor crosses them (visx default handles do this too)
  const renderBrushHandle = ({ x, height, className }) => {
    const hx = x + 4;
    return (
      <g
        className={className}
        style={{ cursor: 'ew-resize', pointerEvents: brushing.current ? 'none' : 'all' }}
      >
        <rect x={x - 2} y={0} width={12} height={height} fill="transparent" />
        <line x1={hx} x2={hx} y1={1} y2={height - 1} stroke="var(--area-line-color)" strokeWidth={1.2} />
        <rect x={hx - 3} y={height / 2 - 8} width={6} height={16} rx={3} fill="var(--area-line-color)" />
        <line x1={hx - 1} x2={hx - 1} y1={height / 2 - 4} y2={height / 2 + 4} stroke="var(--menu-background)" strokeWidth={0.8} />
        <line x1={hx + 1} x2={hx + 1} y1={height / 2 - 4} y2={height / 2 + 4} stroke="var(--menu-background)" strokeWidth={0.8} />
      </g>
    );
  };

  React.useEffect(() => {
    if (!brushing.current) setBrushPos([w0, w1]);
  }, [w0, w1]);

  return (
    <Group left={5} top={top}>
      <rect
        width={xBrushMax}
        height={brushHeight + 6}
        fill="var(--menu-background)"
        x={0}
        y={-3}
      />
      <line x1={0} x2={xBrushMax} y1={-3} y2={-3} stroke="var(--axis-lines)" strokeWidth={1} />
      <line x1={0} x2={xBrushMax} y1={brushHeight + 3} y2={brushHeight + 3} stroke="var(--axis-lines)" strokeWidth={1} />
      <LinearGradient
        from="var(--area-line-color)"
        to="var(--area-line-color)"
        fromOpacity={0.3}
        toOpacity={0.1}
        id={PATTERN_ID}
      />
      <ChartMainLine
        quotes={series}
        lineType={'line'}
        dashed
        xScale={brushXScale}
        yScale={brushYScale}
        width={xBrushMax}
        height={brushHeight}
        xGetter={getRankX}
      />
      <Brush
        xScale={brushXScale}
        yScale={brushYScale}
        width={xBrushMax}
        height={brushHeight}
        margin={brushMargin}
        handleSize={8}
        resizeTriggerAreas={['left', 'right']}
        brushDirection="horizontal"
        brushPosition={initialBrushPosition}
        brushX0={brushPos[0]}
        brushX1={brushPos[1]}
        syncSeq={brushSyncSeq}
        onBrushStart={() => { brushing.current = true; }}
        onBrushEnd={() => {
          // re-sync now: window changes during the drag were skipped by the
          // [w0, w1] effect (brushing guard), and nothing re-fires it after
          brushing.current = false;
          setBrushPos([w0, w1]);
          setBrushSyncSeq(s => s + 1);
        }}
        onChange={onBrushChange}
        onClick={() => { setWindow([Math.max(0, maxIdx - MAX_WINDOW + 1), maxIdx]); setFrac(0); }}
        selectedBoxStyle={selectedBrushStyle}
        renderBrushHandle={renderBrushHandle}
      />
    </Group>
  );
};

// memo'd so live tick batches don't redraw the full-series thumbnail 4x/sec:
// with the bar-close-gated series prop, every prop is stable between candle
// closes and user window changes
export default React.memo(BrushStrip);

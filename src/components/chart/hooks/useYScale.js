import React from 'react';

import { scaleLinear, scaleLog } from '@visx/scale';
import { localPoint } from '@visx/event';
import { max, min } from 'd3-array';

import startWindowDrag from '../startWindowDrag';

const getHighValue = d => d.high;
const getLowValue = d => d.low;

// vertical price scale cluster: stretch/pan state, the y scale (log/invert
// aware), axis- and baseline-drag handlers
const useYScale = ({ savedView, visible, plotBottom, yLogScale, yInvert }) => {
  // vertical scale: drag the y axis up to expand spacing, down to compress
  const [yStretch, setYStretch] = React.useState(savedView.yStretch ?? 1);
  // vertical pan: drag the chart up/down, clamped to highest visible point +25% / lowest -25%.
  // stored as a fraction of the visible price range so it re-anchors as the x window changes
  const [yShift, setYShift] = React.useState(savedView.yShift ?? 0);
  // baseline line type: baseline position as a fraction of the plot height
  const [baselineFrac, setBaselineFrac] = React.useState(savedView.baselineFrac ?? 0.5);

  const yDragStart = React.useRef(null);

  const axisDragStart = (event) => {
    yDragStart.current = localPoint(event).y;
  };
  const axisDragMove = (event) => {
    if (yDragStart.current == null) return;
    const y = localPoint(event).y;
    const dy = y - yDragStart.current;
    yDragStart.current = y;
    setYStretch(s => Math.min(10, Math.max(0.2, s * (1 + dy / 200))));
  };
  const axisDragEnd = () => {
    yDragStart.current = null;
  };

  const maxHighPrice = React.useMemo(() => (max(visible, getHighValue) || 0), [visible]);
  const minLowPrice = React.useMemo(() => (min(visible, getLowValue) || 0), [visible]);

  const baselineY = 20 + baselineFrac * (plotBottom - 20);
  const [baselineDragging, setBaselineDragging] = React.useState(false);
  const startBaselineDrag = (event) => {
    event.stopPropagation();
    const startY = event.clientY;
    const startFrac = baselineFrac;
    const span = plotBottom - 20;
    setBaselineDragging(true);
    startWindowDrag((ev) => {
      if (span <= 0) return;
      setBaselineFrac(Math.max(0.02, Math.min(0.98, startFrac + (ev.clientY - startY) / span)));
    }, () => setBaselineDragging(false));
  };

  const yView = React.useMemo(() => {
    const lo = minLowPrice - 3;
    const range = maxHighPrice - lo;
    const mid = (maxHighPrice + lo) / 2;
    const half = (range / 2) * yStretch;
    // pan limits (as fractions of the visible range): domain top may not exceed
    // the highest visible point +50%; bottom not below the lowest visible -50%
    const fMax = ((maxHighPrice + 0.5 * range) - (mid + half)) / range;
    const fMin = ((minLowPrice - 0.5 * range) - (mid - half)) / range;
    return { range, mid, half, fMin, fMax };
  }, [minLowPrice, maxHighPrice, yStretch]);

  const yScale = React.useMemo(() => {
    const { range, mid, half, fMin, fMax } = yView;
    const f = fMin > fMax ? 0 : Math.min(fMax, Math.max(fMin, yShift));
    const offset = f * range;
    let d0 = mid - half + offset;
    let d1 = mid + half + offset;
    if (yLogScale) {
      // log domains must stay positive
      d0 = Math.max(d0, 1e-9);
      d1 = Math.max(d1, d0 * 1.000001);
    }
    return (yLogScale ? scaleLog : scaleLinear)({
      range: yInvert ? [20, plotBottom] : [plotBottom, 20],
      domain: [d0, d1]
    });
  }, [plotBottom, yView, yShift, yLogScale, yInvert]);

  const handleDragY = (dy) => {
    const pxSpan = plotBottom - 20;
    if (pxSpan <= 0) return;
    const { fMin, fMax } = yView;
    setYShift(f => {
      if (fMin > fMax) return f; // window taller than the padded range: no room to pan
      return Math.min(fMax, Math.max(fMin, f + (dy * yStretch) / pxSpan));
    });
  };

  return {
    yScale, yStretch, yShift, baselineFrac,
    baselineY, baselineDragging, startBaselineDrag,
    handleDragY, axisDragStart, axisDragMove, axisDragEnd,
  };
};

export default useYScale;

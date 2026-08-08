import React from 'react';
import VisxBaseBrush from '@visx/brush/lib/BaseBrush';
import { scaleInvert, getDomainFromExtent } from '@visx/brush/lib/utils';

const SAFE_PIXEL = 2;
const DEFAULT_COLOR = 'steelblue';
const DEFAULT_BOX_STYLE = {
  fill: DEFAULT_COLOR,
  fillOpacity: 0.2,
  stroke: DEFAULT_COLOR,
  strokeWidth: 1,
  strokeOpacity: 0.8,
};

// Upstream BaseBrush repositions the selection by width/height ratio on
// resize, which breaks when the first ParentSize measurement is 0 (0-width
// extent times Infinity) and can't follow the chart window at all. This
// subclass re-derives the selection from the synced window indices
// (brushX0/X1, null = no sync) and the CURRENT scale whenever the window, the
// measured size, or the sync counter changes. syncSeq lets the owner force a
// reposition after a brush drag whose selection was rejected (too small /
// clamped), where the indices themselves didn't change.
class SyncedBaseBrush extends VisxBaseBrush {
  componentDidUpdate(prevProps) {
    const sizeChanged =
      this.props.width !== prevProps.width || this.props.height !== prevProps.height;
    const posChanged =
      this.props.brushX0 !== prevProps.brushX0 || this.props.brushX1 !== prevProps.brushX1;
    const syncTicked = this.props.syncSeq !== prevProps.syncSeq;
    if (!sizeChanged && !posChanged && !syncTicked) return;
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState((prevBrush) => {
      let { start, end, extent } = prevBrush;
      if (this.props.brushX0 != null && this.props.xScale && this.props.width > 0) {
        start = { x: this.props.xScale(this.props.brushX0), y: 0 };
        end = { x: this.props.xScale(this.props.brushX1), y: this.props.height };
        extent = this.getExtent(start, end);
      }
      return {
        start,
        end,
        extent,
        bounds: { x0: 0, x1: this.props.width, y0: 0, y1: this.props.height },
      };
    });
  }
}
SyncedBaseBrush.defaultProps = {
  ...VisxBaseBrush.defaultProps,
  brushX0: null,
  brushX1: null,
  syncSeq: 0,
};

// Thin domain-converting wrapper (the chart brushes the full plot region only)
const Brush = ({
  xScale,
  yScale,
  width = 0,
  height = 0,
  margin,
  handleSize = 4,
  resizeTriggerAreas = ['left', 'right'],
  brushDirection = 'horizontal',
  brushPosition = null,
  brushX0 = null,
  brushX1 = null,
  syncSeq = 0,
  onChange = null,
  onBrushStart = null,
  onBrushEnd = null,
  onClick = null,
  selectedBoxStyle = DEFAULT_BOX_STYLE,
  renderBrushHandle = null,
  innerRef = null,
}) => {
  if (!xScale || !yScale) return null;

  const convertRangeToDomain = (brush) => {
    const { x0, x1, y0, y1 } = brush.extent;
    const xDomain = getDomainFromExtent(xScale, x0 || 0, x1 || 0, SAFE_PIXEL);
    const yDomain = getDomainFromExtent(yScale, y0 || 0, y1 || 0, SAFE_PIXEL);
    return {
      x0: xDomain.start || 0,
      x1: xDomain.end || 0,
      xValues: xDomain.values,
      y0: yDomain.start || 0,
      y1: yDomain.end || 0,
      yValues: yDomain.values,
    };
  };

  const handleChange = (brush) => {
    if (!onChange) return;
    const { x0 } = brush.extent;
    if (typeof x0 === 'undefined' || x0 < 0) {
      onChange(null);
      return;
    }
    onChange(convertRangeToDomain(brush));
  };

  const handleBrushStart = (point) => {
    if (!onBrushStart) return;
    const invertedX = scaleInvert(xScale, point.x);
    const invertedY = scaleInvert(yScale, point.y);
    onBrushStart({
      x: typeof xScale.invert !== 'undefined' ? invertedX : xScale.domain()[invertedX],
      y: typeof yScale.invert !== 'undefined' ? invertedY : yScale.domain()[invertedY],
    });
  };

  const handleBrushEnd = (brush) => {
    if (!onBrushEnd) return;
    const { x0 } = brush.extent;
    if (typeof x0 === 'undefined' || x0 < 0) {
      onBrushEnd(null);
      return;
    }
    onBrushEnd(convertRangeToDomain(brush));
  };

  return (
    <SyncedBaseBrush
      width={width}
      height={height}
      left={0}
      top={0}
      brushDirection={brushDirection}
      handleSize={handleSize}
      inheritedMargin={margin}
      brushPosition={brushPosition}
      xScale={xScale}
      brushX0={brushX0}
      brushX1={brushX1}
      syncSeq={syncSeq}
      ref={innerRef}
      resizeTriggerAreas={resizeTriggerAreas}
      selectedBoxStyle={selectedBoxStyle}
      onBrushEnd={handleBrushEnd}
      onBrushStart={handleBrushStart}
      onChange={handleChange}
      onClick={onClick}
      renderBrushHandle={renderBrushHandle}
    />
  );
};

export default Brush;

import React from "react";
import { localPoint } from '@visx/event';
import { getDomainFromExtent } from '@visx/brush/lib/utils';
import { useGesture } from '@use-gesture/react';
import startWindowDrag from './chart/startWindowDrag';

const SAFE_PIXEL = 2;

const pinchDelta = ({ offset: [s], lastOffset: [lastS] }) => ({
  scaleX: s - lastS < 0 ? 0.9 : 1.1,
  scaleY: s - lastS < 0 ? 0.9 : 1.1,
});

// Transparent gesture surface over the plot: left-drag pans x (or y once the
// drag locks to the vertical axis), pinch/ctrl+wheel zooms, two-finger scroll
// pans. Drag state lives in refs and handlers fire synchronously from the
// events — no per-mousemove state/effect round-trips.
export default function DragPlane({
  xScale,
  width,
  height,
  handleDrag,
  handlePinch,
  handleDragY,
  onWheelPan,
  onContextMenu
}) {
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false); // className only
  const prevX = React.useRef(null);
  const lastY = React.useRef(null);
  const dragOrigin = React.useRef(null);
  // 'x' | 'y' | null — locked to the dominant axis once the drag passes the threshold
  const axisLock = React.useRef(null);

  const onPinch = React.useCallback(
    (state) => {
      if (containerRef.current) {
        const { scaleX, scaleY } = pinchDelta(state);

        let direction = null;
        if (scaleX < 1 && scaleY < 1) {
          direction = "OUT";
        } else if (scaleX > 1 && scaleY > 1) {
          direction = "IN";
        }

        // gesture origin (client coords) → x within the plot, so the zoom
        // can anchor on the cursor instead of the window center
        const ox = state.origin ? state.origin[0] : null;
        const focusX = ox != null
          ? ox - containerRef.current.getBoundingClientRect().left
          : null;

        const fn = handlePinch.current;
        fn(direction, focusX);
      }
    },
    [handlePinch]
  );

  const cancelDrag = React.useRef(null);
  // window listeners subscribe once per drag, but props (xScale, handleDrag)
  // change mid-drag as the window pans — route each event through refs so it
  // sees the current render's closures. A captured dragMove would keep the
  // first render's w0/scale and freeze the pan after the first move.
  const dragMoveRef = React.useRef(null);
  const dragEndRef = React.useRef(null);

  const dragStart = (event) => {
    // only left-button drags pan; right-click belongs to context menus
    if (event.button !== undefined && event.button !== 0) return;
    const p = localPoint(event);
    prevX.current = p.x;
    lastY.current = p.y;
    dragOrigin.current = p;
    axisLock.current = null;
    setIsDragging(true);
    // mouse drags track on window so fast flicks that leave the rect (or
    // cross panes/axis strips) don't kill the pan; touch stays element-local
    if (event.touches === undefined) {
      cancelDrag.current = startWindowDrag(
        (ev) => dragMoveRef.current(ev),
        (ev) => dragEndRef.current(ev),
      );
    }
  };

  const dragMove = (event) => {
    if (!dragOrigin.current) return;
    // window-level events need the plot rect as the coordinate reference
    const p = localPoint(containerRef.current, event);
    if (!p) return;

    if (!axisLock.current) {
      const dx = Math.abs(p.x - dragOrigin.current.x);
      const dy = Math.abs(p.y - dragOrigin.current.y);
      if (Math.max(dx, dy) > SAFE_PIXEL) {
        axisLock.current = (dy > dx && handleDragY) ? 'y' : 'x';
      }
    }

    if (axisLock.current === 'x') {
      const { start, end } = getDomainFromExtent(xScale, prevX.current, p.x, SAFE_PIXEL);
      if (start !== end) {
        handleDrag({
          shift: Math.abs(end - start),
          direction: p.x > prevX.current ? 'right' : 'left',
        });
        prevX.current = p.x;
      }
    } else if (axisLock.current === 'y' && handleDragY && lastY.current != null) {
      const dy = p.y - lastY.current;
      lastY.current = p.y;
      if (dy !== 0) handleDragY(dy);
    }
  };

  const dragEnd = () => {
    prevX.current = null;
    lastY.current = null;
    dragOrigin.current = null;
    axisLock.current = null;
    cancelDrag.current = null;
    setIsDragging(false);
  };

  // keep the refs pointing at this render's closures (fresh props/scales)
  dragMoveRef.current = dragMove;
  dragEndRef.current = dragEnd;

  // tear down window listeners if we unmount mid-drag
  React.useEffect(() => () => { cancelDrag.current?.(); }, []);

  useGesture(
    {
      onPinch: onPinch,
      onWheel: ({ event, pinching }) => {
        // Outside of Safari the wheel event fires together with the pinch
        // gesture; macOS pinch-zoom also arrives as ctrl+wheel — skip both
        if (pinching || event.ctrlKey) return;
        // two-finger horizontal trackpad scroll pans the x axis
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && onWheelPan) {
          event.preventDefault();
          onWheelPan(event.deltaX);
        }
      },
    },
    { target: containerRef, eventOptions: { passive: false }, drag: { filterTaps: true } },
  );

  return (
    <rect
      width={width}
      height={height}
      rx={14}
      fill="transparent"
      onTouchStart={dragStart}
      onTouchMove={dragMove}
      onTouchEnd={dragEnd}
      onMouseDown={dragStart}
      onContextMenu={onContextMenu}
      ref={containerRef}
      className={isDragging ? 'ofc-active-drag-plane' : ''}
    />
  );
}

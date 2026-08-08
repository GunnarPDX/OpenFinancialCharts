// registry of per-type drawing renderers. Each renderer has the signature
// (d, i, interactive, ctx); most return bare children and are wrapped here in
// the shared shell — a keyed <g> with the right-click delete handler and the
// cursor — so the registry entries still produce the exact SVG the old
// renderDrawing if-chain did. textFamily, position and callout build their own
// <g> (extra handlers, per-branch cursors) and are registered unwrapped.
// ChartBodyWithZoom builds ctx once per render and dispatches here, falling
// back to `trendline` for unknown types.
import { PATTERN_N, FORK_TOOLS } from '../constants';
import { makeDel } from './util';
import {
  level, freehand, avwap, vline, arrowMarker, polygonShape, ghost, polyline,
  extline, ray, sector, rectShape, triangleShape, rtriangle, circleShape,
  arrowLine, rrect, arcShape, ellipseShape, trendline as trendlineBare,
} from './basic';
import { textFamily, priceNote, callout } from './text';
import { pattern } from './patterns';
import { position } from './positions';
import {
  forecast, barsPattern, frvp, measureBox, cyclic, timecycles, sine,
  regtrend, channelFamily, fork, barsCopy,
} from './measure';
import {
  fibRetracement, fibChannel, fibTime, fibFan, fanFamily, fibArcs,
  fibCircles, fibSpiral, fibWedge, gannBox,
} from './fib';

// shared outer shell; extra <g> props (cursor, opacity) come from the
// per-type config below. A null cursor drops the style entirely (barsCopy).
const withShell = (render, { cursor = 'context-menu', ...gProps } = {}) => (d, i, interactive, ctx) => {
  const node = render(d, i, interactive, ctx);
  if (node == null) return null;
  return (
    <g key={i} onContextMenu={interactive ? makeDel(ctx, d.id) : undefined}
      style={cursor ? { cursor } : undefined} {...gProps}>
      {node}
    </g>
  );
};

export const trendline = withShell(trendlineBare);

const patternR = withShell(pattern);
const forkR = withShell(fork);
const freehandR = withShell(freehand);
const textFamilyR = textFamily; // self-shelled
const measureBoxR = withShell(measureBox);
const vlineR = withShell(vline);
const arrowMarkerR = withShell(arrowMarker);
const channelR = withShell(channelFamily);
const fanR = withShell(fanFamily);
const fibRetR = withShell(fibRetracement);
const fibTimeR = withShell(fibTime);
const gannBoxR = withShell(gannBox);

export const DRAWING_RENDERERS = {
  level: withShell(level, { cursor: 'ns-resize' }),
  free: freehandR, highlight: freehandR,
  avwap_draw: withShell(avwap),
  txt: textFamilyR, note: textFamilyR, pin: textFamilyR, tableD: textFamilyR,
  comment: textFamilyR, price_label: textFamilyR, flag: textFamilyR,
  buy_marker: textFamilyR, sell_marker: textFamilyR,
  vline: vlineR, crossline: vlineR,
  arrow_up: arrowMarkerR, arrow_down: arrowMarkerR,
  ...Object.fromEntries(Object.keys(PATTERN_N).map(t => [t, patternR])),
  polygon: withShell(polygonShape),
  ghost: withShell(ghost, { opacity: 0.7 }),
  poly: withShell(polyline),
  long_pos: position, short_pos: position, // self-shelled
  forecast: withShell(forecast),
  bars_pattern: withShell(barsPattern),
  frvp: withShell(frvp),
  m_price: measureBoxR, m_date: measureBoxR, m_both: measureBoxR, ruler: measureBoxR,
  cyclic: withShell(cyclic),
  timecycles: withShell(timecycles),
  sine: withShell(sine),
  price_note: withShell(priceNote, { cursor: 'pointer' }),
  callout, // self-shelled
  extline: withShell(extline),
  ray: withShell(ray),
  regtrend: withShell(regtrend),
  channel: channelR, flattb: channelR, disjoint: channelR,
  ...Object.fromEntries(FORK_TOOLS.map(t => [t, forkR])),
  fib_retracement: fibRetR, fibext: fibRetR,
  fib_channel: withShell(fibChannel),
  fib_timezone: fibTimeR, fibtime3: fibTimeR,
  fib_fan: withShell(fibFan),
  gann_fan: fanR, pitchfan: fanR, fib_fan_reg: fanR,
  bars_copy: withShell(barsCopy, { cursor: null, opacity: 0.6 }),
  sector: withShell(sector),
  fib_arcs: withShell(fibArcs),
  fib_circles: withShell(fibCircles),
  fib_spiral: withShell(fibSpiral),
  fib_wedge: withShell(fibWedge),
  gann_box: gannBoxR, gann_square: gannBoxR,
  rect: withShell(rectShape),
  triangle: withShell(triangleShape),
  rtriangle: withShell(rtriangle),
  circle: withShell(circleShape),
  arrow: withShell(arrowLine),
  rrect: withShell(rrect),
  arc: withShell(arcShape),
  ellipse: withShell(ellipseShape),
};

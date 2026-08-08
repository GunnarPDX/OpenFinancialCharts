// Shared geometry and color helpers for the series renderers.

// Bodies stay readable when a zoomed-out slot gets very wide: cap them.
export const MAX_BODY_WIDTH = 24;

// Per-render-pass geometry. Supports both band scales (the main plot) and
// linear scales (the brush mini-chart passes a linear scale, which has no
// .bandwidth): with a linear scale bandwidth is 0 and centerX degrades to the
// raw scale position, matching what BasicLine always did for the brush.
export const barGeometry = (xScale, xGetter) => {
  const bandwidth = xScale.bandwidth ? xScale.bandwidth() : 0;
  const half = bandwidth / 2;
  return {
    bandwidth,
    half,
    bodyWidth: Math.min(bandwidth, MAX_BODY_WIDTH),
    centerX: (b) => xScale(xGetter(b)) + half,
  };
};

// Stable per-bar key. Rank, not date: dates stringify at second precision and
// renko/P&F emit multiple items inside one source bar, so date keys collide.
// Every feed path stamps rank (utils/quotes.js, utils/aggregate.js finalize),
// but fall back to the index for any bar-shaped data that lacks it.
export const keyFor = (b, i) => b.rank ?? i;

// ---- per-bar color functions -------------------------------------------

// down bars are red, up bars green (direction flag: truthy = down)
export const redGreenByDirection = (b) =>
  b.direction ? 'var(--red)' : 'var(--green)';

// segment coloring: compare the bar's close to the previous bar's close
export const redGreenBySegment = (b, prev) =>
  b.close >= prev.close ? 'var(--green)' : 'var(--red)';

export const solidStroke = (color) => () => color;

// pair variants ([edge, fill]) for body renderers
export const directionPair = (b) => {
  const color = redGreenByDirection(b);
  // wick matches the body — a darker outline around marks is noise, not data
  return [color, color];
};

export const textPair = () => ['var(--text)', 'var(--text)'];

// standard hollow-candle semantics: color from close vs previous close,
// hollow when the bar closed above its open, filled when it closed below
export const hollowPair = (b, prev) => {
  const up = prev ? b.close >= prev.close : b.close >= b.open;
  const color = up ? 'var(--green)' : 'var(--red)';
  const hollow = b.close >= b.open;
  return [color, hollow ? 'transparent' : color];
};

// monochrome, but hollow/filled still follows close vs open
export const plainHollowPair = (b) => [
  'var(--text)',
  b.close >= b.open ? 'transparent' : 'var(--text)',
];

// Resolve the color function for a lineType: an exact match from `cases`,
// otherwise `fallback`. Callers list only their non-default variants.
export const strokeFor = (lineType, cases, fallback) =>
  Object.prototype.hasOwnProperty.call(cases, lineType)
    ? cases[lineType]
    : fallback;

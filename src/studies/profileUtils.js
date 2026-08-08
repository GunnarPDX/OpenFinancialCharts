// Shared helpers for the side-profile studies (renderAs: 'profile').
//
// A profile study owns its bucketing: def.profile(visible, rows, lo, hi)
// receives the visible bars and the window's price range split into `rows`
// buckets (index 0 = lowest prices) and returns an array of `rows` entries.
// Each entry is null (nothing at that level) or:
//   v          magnitude >= 0 — bar length, normalized against the row max
//   color      CSS color (default var(--area-line-color))
//   opacity    0..1 (default 0.18, point-of-control 0.35)
//   side       +1 / -1 → diverging bars split around the strip's center line
//   streak     true → thin bright line across the strip instead of a bar
//              (v is ignored for width; use for single-print/absorption marks)
//   level      true → dashed horizontal level projected across the whole
//              plot at this bucket's price, labeled with that price
//   labelValue number shown by the label layer (default v)

// Spread one bar's contribution across every price bucket its high–low range
// touches, weighted by the overlap fraction — truer than dropping the whole
// bar at its midprice. cb(k, fraction) with fractions summing to 1 per bar.
export const forEachLevel = (bar, lo, hi, rows, cb) => {
  const span = hi - lo;
  if (!(span > 0)) return;
  const clampRow = (k) => Math.min(rows - 1, Math.max(0, k));
  const bl = Math.min(bar.low, bar.high);
  const bh = Math.max(bar.low, bar.high);
  if (!(bh > bl)) {
    cb(clampRow(Math.floor(((bl - lo) / span) * rows)), 1);
    return;
  }
  const step = span / rows;
  const k0 = clampRow(Math.floor((bl - lo) / step));
  const k1 = clampRow(Math.floor((bh - lo) / step));
  for (let k = k0; k <= k1; k++) {
    const overlap = Math.min(bh, lo + (k + 1) * step) - Math.max(bl, lo + k * step);
    if (overlap > 0) cb(k, overlap / (bh - bl));
  }
};

// average high–low range of the window — the impulse normalizer, so "fast"
// means fast relative to the current regime, not an absolute % move
export const avgRange = (bars) => {
  let sum = 0, n = 0;
  bars.forEach(b => {
    const r = b.high - b.low;
    if (r > 0) { sum += r; n++; }
  });
  return n ? sum / n : 1;
};

// grey → amber → red ramp for heat-scored buckets, t in 0..1
const RAMP = [[107, 114, 128], [245, 158, 11], [239, 68, 68]];
export const heatColor = (t) => {
  const x = Math.min(1, Math.max(0, t)) * 2;
  const [a, b] = x <= 1 ? [RAMP[0], RAMP[1]] : [RAMP[1], RAMP[2]];
  const f = x <= 1 ? x : x - 1;
  const ch = a.map((c, i) => Math.round(c + (b[i] - c) * f));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
};

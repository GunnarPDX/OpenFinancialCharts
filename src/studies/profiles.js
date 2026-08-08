// Side-profile studies beyond the plain volume profile: price-level maps
// combining volume with momentum, order-flow direction, and time-at-price.
// All are window-based (recomputed from the visible bars, like the volume
// profile) and render through the shared profile pipeline — the per-bucket
// entry contract lives in ./profileUtils.js.
import { forEachLevel, avgRange, heatColor } from './profileUtils';

const GREEN = '#22c55e';
const RED = '#ef4444';
const GREY = '#94a3b8';
const SKY = '#38bdf8';
const AMBER = '#f59e0b';

// heat/hot-zone: how one-sided a bucket's momentum must be before it wears a
// direction color instead of the neutral grey
const DIRECTION_BIAS_MIN = 0.25;
// delta: a bucket reads as absorption when it traded at least this share of
// the busiest bucket's volume yet netted out to under this fraction of its
// own volume
const ABSORPTION_MIN_VOLUME_SHARE = 0.5;
const ABSORPTION_MAX_NET_SHARE = 0.12;
// acceptance: rejection = time in the bottom third AND velocity in the top
// third of the visited buckets
const REJECTION_TIME_TERCILE = 1 / 3;
const REJECTION_VELOCITY_TERCILE = 2 / 3;
// hot zones: how many levels project across the chart, kept at least this
// many buckets apart so one wide zone doesn't claim every line
const HOT_ZONE_LEVELS = 3;
const HOT_ZONE_MIN_SEPARATION = 2;

export const profileStudies = [
  {
    id: 'heat_profile',
    name: 'Heat Profile',
    category: ['Volume', 'Momentum', 'Support Resistance'],
    color: '#f59e0b',
    renderAs: 'profile',
    fields: ['length'],
    params: { length: 24 },
    info: 'Momentum-weighted volume at price: each bar contributes volume times the speed of its move (body size relative to the window’s average range), spread across the price levels it touched. Long bars mark hot zones — levels repriced violently on heavy volume (breakout origins, capitulation) that tend to act as strong support/resistance on retest. Color is who caused the heat: green where upside momentum dominated, red for downside, grey where heavy volume went nowhere (absorption/chop — zones to avoid trading inside). Period sets the number of price buckets.',
    compute: () => [],
    profile: (visible, rows, lo, hi) => {
      const norm = avgRange(visible);
      const heat = new Array(rows).fill(0);
      const up = new Array(rows).fill(0);
      visible.forEach(b => {
        const impulse = Math.abs(b.close - b.open) / norm;
        const contrib = (b.volume || 0) * impulse;
        if (!(contrib > 0)) return;
        const dir = b.close >= b.open ? 1 : -1;
        forEachLevel(b, lo, hi, rows, (k, f) => {
          heat[k] += contrib * f;
          up[k] += dir * contrib * f;
        });
      });
      const maxH = Math.max(...heat, 1e-9);
      return heat.map((v, k) => {
        if (!(v > 0)) return null;
        const bias = up[k] / v; // -1 all-down .. +1 all-up
        const color = bias > DIRECTION_BIAS_MIN ? GREEN : bias < -DIRECTION_BIAS_MIN ? RED : GREY;
        // hotter zones glow brighter instead of relying on the POC flag alone
        return { v, color, opacity: 0.14 + 0.3 * (v / maxH) };
      });
    },
  },
  {
    id: 'buy_sell_profile',
    name: 'Buy/Sell Profile',
    category: ['Volume', 'Money Flow'],
    color: '#22c55e',
    renderAs: 'profile',
    fields: ['length'],
    params: { length: 24 },
    info: 'Net buying vs selling pressure at each price level, split around a center line: green bars grow left (into the chart) where buyers dominated, red bars grow right where sellers did. Per-bar pressure is the close’s position in the bar’s range times volume — a tick-data-free delta estimate. Strong green shelves below price tend to defend it; heavy red above acts as supply. Grey streaks flag absorption: levels with big total volume but almost no net winner, where a passive player soaked up the aggression — these often precede reversals. Period sets the number of price buckets.',
    compute: () => [],
    profile: (visible, rows, lo, hi) => {
      const net = new Array(rows).fill(0);
      const tot = new Array(rows).fill(0);
      visible.forEach(b => {
        const rng = b.high - b.low;
        const vol = b.volume || 0;
        if (!(vol > 0)) return;
        // close position in range: +1 closed at the high, -1 at the low
        const pos = rng > 0 ? ((b.close - b.low) - (b.high - b.close)) / rng : 0;
        forEachLevel(b, lo, hi, rows, (k, f) => {
          net[k] += pos * vol * f;
          tot[k] += vol * f;
        });
      });
      const maxTot = Math.max(...tot, 1e-9);
      return net.map((d, k) => {
        if (!(tot[k] > 0)) return null;
        // heavy two-way trade with no net winner → absorption streak
        if (tot[k] >= ABSORPTION_MIN_VOLUME_SHARE * maxTot
            && Math.abs(d) <= ABSORPTION_MAX_NET_SHARE * tot[k]) {
          return { v: 0, streak: true, color: GREY, opacity: 0.55 };
        }
        return {
          v: Math.abs(d),
          side: d >= 0 ? 1 : -1,
          color: d >= 0 ? GREEN : RED,
          opacity: 0.3,
          labelValue: d,
        };
      });
    },
  },
  {
    id: 'acceptance_profile',
    name: 'Acceptance Profile',
    category: ['Support Resistance', 'Statistical'],
    color: '#38bdf8',
    renderAs: 'profile',
    fields: ['length'],
    params: { length: 24 },
    info: 'Time-at-price: bar length is how long the market traded at each level, independent of volume. Wide bars are accepted value — prices the auction kept returning to, where moves stall. Amber streaks are rejection zones: levels price crossed fast and barely revisited (single prints / vacuum zones). Re-entered vacuum zones tend to fill quickly to the far side, which makes them target-setting tools; expect moves to slow inside wide acceptance bars. Period sets the number of price buckets.',
    compute: () => [],
    profile: (visible, rows, lo, hi) => {
      const norm = avgRange(visible);
      const time = new Array(rows).fill(0);
      const speed = new Array(rows).fill(0);
      visible.forEach(b => {
        const velocity = (b.high - b.low) / norm;
        forEachLevel(b, lo, hi, rows, (k, f) => {
          time[k] += f;
          speed[k] += velocity * f;
        });
      });
      const touched = time.filter(t => t > 0);
      if (!touched.length) return new Array(rows).fill(null);
      const sortedTime = [...touched].sort((a, b) => a - b);
      const loTime = sortedTime[Math.floor((sortedTime.length - 1) * REJECTION_TIME_TERCILE)];
      const vels = time.map((t, k) => (t > 0 ? speed[k] / t : 0)).filter(Boolean);
      const sortedVel = [...vels].sort((a, b) => a - b);
      const hiVel = sortedVel[Math.floor((sortedVel.length - 1) * REJECTION_VELOCITY_TERCILE)];
      return time.map((t, k) => {
        if (!(t > 0)) return null;
        const vel = speed[k] / t;
        // barely visited + crossed fast = rejection: mark, don't bar
        if (t <= loTime && vel >= hiVel) {
          return { v: 0, streak: true, color: AMBER, opacity: 0.65 };
        }
        return { v: t, color: SKY, opacity: 0.25, labelValue: t };
      });
    },
  },
  {
    id: 'hot_zone_levels',
    name: 'Hot Zone Levels',
    category: ['Support Resistance', 'Volume'],
    color: '#ef4444',
    renderAs: 'profile',
    fields: ['length'],
    params: { length: 24 },
    info: 'The chart annotates itself: buckets score volume times momentum (as in the Heat Profile) and paint on a grey→amber→red ramp, and the top three hot zones project dashed price levels across the whole plot with their price tagged — the handful of prices that mattered most in the visible window, ready-made support/resistance. Levels keep a minimum separation so one wide zone doesn’t claim all three lines. Period sets the number of price buckets.',
    compute: () => [],
    profile: (visible, rows, lo, hi) => {
      const norm = avgRange(visible);
      const score = new Array(rows).fill(0);
      visible.forEach(b => {
        const contrib = (b.volume || 0) * (Math.abs(b.close - b.open) / norm);
        if (!(contrib > 0)) return;
        forEachLevel(b, lo, hi, rows, (k, f) => { score[k] += contrib * f; });
      });
      const maxS = Math.max(...score, 1e-9);
      const picked = [];
      [...score.keys()]
        .filter(k => score[k] > 0)
        .sort((a, b) => score[b] - score[a])
        .forEach(k => {
          if (picked.length < HOT_ZONE_LEVELS
              && picked.every(p => Math.abs(p - k) > HOT_ZONE_MIN_SEPARATION)) picked.push(k);
        });
      return score.map((v, k) => {
        if (!(v > 0)) return null;
        const t = v / maxS;
        return {
          v,
          color: heatColor(t),
          opacity: 0.15 + 0.3 * t,
          level: picked.includes(k),
        };
      });
    },
  },
];

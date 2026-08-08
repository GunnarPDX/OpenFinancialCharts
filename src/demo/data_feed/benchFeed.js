// Synthetic feed for performance benchmarking (demo-only, like the rest of
// src/demo). Activated by ?bench in the demo URL so benchmarks never depend
// on network or API rate limits. ?bars=N sets the series size, ?tps=N makes
// the price socket stream ticks at that rate.

import rng from '../rng';

const makeBars = (n) => {
  const rand = rng(42);
  const bars = [];
  let price = 300;
  const start = Date.now() - n * 60000;
  for (let i = 0; i < n; i++) {
    const open = price;
    const close = price + (rand() - 0.5) * 0.6;
    bars.push({
      date: new Date(start + i * 60000),
      open,
      high: Math.max(open, close) + rand() * 0.25,
      low: Math.min(open, close) - rand() * 0.25,
      close,
      volume: Math.round(5000 + rand() * 50000),
    });
    price = close;
  }
  return bars;
};

const param = (key, dflt) => {
  const v = new URLSearchParams(window.location.search).get(key);
  return v == null ? dflt : +v;
};

export const benchDataFeed = {
  name: 'bench',
  fetchOHLC: async () => makeBars(param('bars', 5000)),
};

export const benchPriceSocket = {
  name: 'bench-stream',
  subscribe: (ticker, onTick) => {
    const tps = param('tps', 0);
    if (!tps) return () => {};
    const rand = rng(7);
    let vol = 5e6;
    let price = 300;
    const id = setInterval(() => {
      price += (rand() - 0.5) * 0.1;
      vol += Math.round(rand() * 800);
      onTick({ price, time: new Date(), volume: vol });
    }, 1000 / tps);
    return () => clearInterval(id);
  },
};

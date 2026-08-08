import React from 'react';
import { init, runScript as rawRunScript } from 'theta-script';

// theta-script v3 adapter. The v3 engine is a wasm module: init() must
// complete once before runScript works, bars cross the wire with ms-epoch
// dates, and results arrive in the conformance encoding (NaN -> null,
// ±Infinity -> "Infinity"/"-Infinity"). This module owns those three
// concerns so the rest of the chart keeps its v2-era expectations:
// runScript(bars-with-Date-objects) -> plots whose warmup values are NaN.
//
// It also stays compatible with the pure-JS v2 interpreter (exported at
// 'theta-script/js', and what the Jest moduleNameMapper resolves to): that
// build has no init(), so the engine counts as ready immediately, and the
// decode below is a no-op on its already-NaN output.

let engineReady = typeof init !== 'function';
let readyPromise = null;
const listeners = new Set();

// idempotent; kicked off at provider mount so the engine is warm before the
// first script needs it. Failure clears the promise so a retry is possible.
export const ensureEngine = () => {
  if (engineReady) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = init()
      .then(() => {
        engineReady = true;
        listeners.forEach(l => l());
        listeners.clear();
      })
      .catch(err => {
        readyPromise = null;
        throw err;
      });
  }
  return readyPromise;
};

export const isEngineReady = () => engineReady;

// re-renders the caller once the wasm engine finishes loading
export const useScriptEngineReady = () => {
  const [ready, setReady] = React.useState(engineReady);
  React.useEffect(() => {
    if (engineReady) return undefined;
    const onReady = () => setReady(true);
    listeners.add(onReady);
    ensureEngine().catch(() => {});
    return () => listeners.delete(onReady);
  }, []);
  return ready;
};

// the wire wants plain numbers; the chart's quotes carry Date objects plus
// render-only fields the engine has no use for
const wireBars = (bars) => bars.map(b => ({
  date: +b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
}));

const decodeNum = (v) => (
  v === null ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
);

export const runScript = (source, bars, opts = null) => {
  const res = rawRunScript(source, wireBars(bars), opts);
  // plot values feed isFinite() filters downstream — restore NaN warmups
  // (global isFinite(null) is true, so nulls would leak into the render)
  if (res && !res.error && Array.isArray(res.plots)) {
    res.plots.forEach(pl => {
      if (Array.isArray(pl.values)) pl.values = pl.values.map(decodeNum);
    });
  }
  return res;
};

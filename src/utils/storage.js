// Single-key localStorage persistence. Callers save partial patches; they're
// merged into one JSON object. Writes are debounced and flushed on unload so
// high-frequency updates (panning) don't spam localStorage.
//
// createStorage builds an isolated instance per ChartProvider so multiple
// charts on one page can persist under different keys (config.persistence),
// or not persist at all. The module-level named exports remain as a default
// instance under the historical key.

const DEFAULT_KEY = 'ofc-chart-state';
const DEBOUNCE_MS = 500;

// persistence: true → default key, false → disabled, string → custom key
export const createStorage = (persistence = true) => {
  if (persistence === false) {
    const noop = () => {};
    return { loadState: () => ({}), saveState: noop, saveStateNow: noop, flushState: noop, attach: noop, destroy: noop };
  }
  const key = typeof persistence === 'string' ? persistence : DEFAULT_KEY;

  const loadState = () => {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  };

  const write = (patch) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...loadState(), ...patch }));
    } catch {
      // storage full/unavailable — persistence is best-effort
    }
  };

  let pending = null;
  let timer = null;

  const flush = () => {
    clearTimeout(timer);
    if (pending) write(pending);
    pending = null;
  };

  const saveState = (patch) => {
    pending = { ...pending, ...patch };
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };

  // write through immediately (flushing anything pending first) — for actions
  // that must land before a reload, like saving/loading views
  const saveStateNow = (patch) => {
    flush();
    write(patch);
  };

  // the browser dedupes identical listener references, so attach is safe to
  // call repeatedly (StrictMode re-runs the owning effect after its cleanup)
  const attach = () => {
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);
  };
  attach();

  // flush pending writes and release the unload listener — called when the
  // owning ChartProvider unmounts so remounts don't accumulate listeners
  const destroy = () => {
    flush();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', flush);
    }
  };

  return { loadState, saveState, saveStateNow, flushState: flush, attach, destroy };
};

const defaultStorage = createStorage(true);
export const loadState = defaultStorage.loadState;
export const saveState = defaultStorage.saveState;
export const saveStateNow = defaultStorage.saveStateNow;
export const flushState = defaultStorage.flushState;

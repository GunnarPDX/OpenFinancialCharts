import React from 'react';

// zone overlaps: rectangles + fib retracement bands from DIFFERENT drawings
// stacking on the same price region (bands within one drawing never overlap).
// Only mounted while visible, so the sweep-line scan only runs then.
const ZoneOverlapsPopup = ({ drawings }) => {
  const zoneRegions = React.useMemo(() => {
    const intervals = [];
    drawings.forEach(d => {
      if (d.type === 'rect') {
        intervals.push([Math.min(d.y1, d.y2), Math.max(d.y1, d.y2)]);
      } else if (d.type === 'fib_retracement') {
        const L = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        for (let k = 0; k < L.length - 1; k++) {
          const a = d.y1 + (d.y2 - d.y1) * L[k];
          const b = d.y1 + (d.y2 - d.y1) * L[k + 1];
          intervals.push([Math.min(a, b), Math.max(a, b)]);
        }
      }
    });
    const events = [];
    intervals.forEach(([a, b]) => {
      if (b - a > 1e-9) {
        events.push([a, 1]);
        events.push([b, -1]);
      }
    });
    events.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
    let cnt = 0, prev = null;
    const segs = [];
    events.forEach(([pr, delta]) => {
      if (prev != null && pr > prev && cnt >= 2) segs.push({ lo: prev, hi: pr, n: cnt });
      cnt += delta;
      prev = pr;
    });
    const merged = [];
    segs.forEach(sg => {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.hi - sg.lo) < 1e-9) {
        last.hi = sg.hi;
        last.n = Math.max(last.n, sg.n);
      } else {
        merged.push({ ...sg });
      }
    });
    return merged.sort((a, b) => b.n - a.n || (b.hi - b.lo) - (a.hi - a.lo)).slice(0, 6);
  }, [drawings]);
  const zoneSources = drawings.filter(d => d.type === 'rect' || d.type === 'fib_retracement');

  return (
    <div className="ofc-draw-confirm ofc-ruler-sum">
      <div className="ofc-study-editor-title">Zone Overlaps</div>
      {zoneSources.length < 2 ? (
        <div className="ofc-draw-confirm-text" style={{ color: 'var(--text-faint)', margin: '10px 0 4px' }}>
          Needs two or more rectangles / fib retracements
        </div>
      ) : zoneRegions.length === 0 ? (
        <div className="ofc-draw-confirm-text" style={{ color: 'var(--text-faint)', margin: '10px 0 4px' }}>
          No overlapping zones found
        </div>
      ) : (
        <>
          {zoneRegions.map((z, k) => (
            <div key={k} className="ofc-ruler-sum-row">
              <span>{z.lo.toFixed(2)}–{z.hi.toFixed(2)}</span>
              <span>×{z.n}</span>
            </div>
          ))}
          <div className="ofc-ruler-sum-count">
            overlapping regions across {zoneSources.length} drawings
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneOverlapsPopup;

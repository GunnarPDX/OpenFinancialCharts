import React from 'react';
import ColorTabs from './ColorTabs';

const fmtMMDD = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
const signPct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`;
const fmtSpan = (dys) => (Math.abs(dys) >= 1 ? `${dys.toFixed(1)}d` : `${(dys * 24).toFixed(1)}h`);

// per-ruler stats, then totals / averages / compounded change / velocity.
// tabs slice the stats by ruler color; 'all' aggregates everything.
// Only mounted while visible, so the full-tape scans only run then.
const RulerTotalsPopup = ({ drawings, quotes, lastClose, tab, setTab }) => {
  // the ruler subset keeps a stable identity while other drawings change,
  // so dragging a non-ruler drawing doesn't rerun the scans per mousemove
  const rulersRef = React.useRef([]);
  const rulers = React.useMemo(() => {
    const next = drawings.filter(d => d.type === 'ruler');
    const prev = rulersRef.current;
    if (prev.length === next.length && prev.every((d, i) => d === next[i])) return prev;
    rulersRef.current = next;
    return next;
  }, [drawings]);

  const rulerColors = [...new Set(rulers.map(d => d.color || '#3b82f6'))];
  const effTab = tab !== 'all' && !rulerColors.includes(tab) ? 'all' : tab;
  const tabRulers = effTab === 'all' ? rulers : rulers.filter(d => (d.color || '#3b82f6') === effTab);

  const rulerCalc = React.useMemo(() => {
    const tabbed = effTab === 'all' ? rulers : rulers.filter(d => (d.color || '#3b82f6') === effTab);
    const meanRange = (list) => (list.length
      ? list.reduce((a, q) => a + (q.high - q.low), 0) / list.length : 0);
    const allMeanRange = meanRange(quotes || []);
    const rulerStats = tabbed.map(d => {
      const sign = d.x2 >= d.x1 ? 1 : -1;
      const lo = Math.min(d.x1, d.x2), hi = Math.max(d.x1, d.x2);
      const inBars = (quotes || []).filter(q => +q.date > lo && +q.date <= hi);
      // move expressed in multiples of the average bar range over its own span
      const mr = meanRange(inBars) || allMeanRange;
      return {
        pct: ((d.y2 - d.y1) / (d.y1 || 1)) * 100,
        bars: inBars.length * sign,
        days: (d.x2 - d.x1) / 86400000,
        rangeX: mr ? Math.abs(d.y2 - d.y1) / mr : 0,
        color: d.color || '#3b82f6',
      };
    });
    const rulerSums = rulerStats.reduce(
      (a, r) => ({ pct: a.pct + r.pct, bars: a.bars + r.bars, days: a.days + r.days }),
      { pct: 0, bars: 0, days: 0 });
    const nRulers = rulerStats.length || 1;
    const rulerAvg = { pct: rulerSums.pct / nRulers, bars: rulerSums.bars / nRulers, days: rulerSums.days / nRulers };
    // sequential moves chain multiplicatively
    const compounded = (rulerStats.reduce((a, r) => a * (1 + r.pct / 100), 1) - 1) * 100;
    const withBars = rulerStats.filter(r => r.bars !== 0);
    const veloBar = withBars.length
      ? withBars.reduce((a, r) => a + r.pct / Math.abs(r.bars), 0) / withBars.length : 0;
    const withDays = rulerStats.filter(r => Math.abs(r.days) > 1e-9);
    const veloDay = withDays.length
      ? withDays.reduce((a, r) => a + r.pct / Math.abs(r.days), 0) / withDays.length : 0;
    // projection: next leg matches the average / the full chained sequence
    const projAvg = lastClose != null ? lastClose * (1 + rulerAvg.pct / 100) : null;
    const projAvgDate = fmtMMDD(new Date(Date.now() + Math.abs(rulerAvg.days) * 86400000));
    const projChained = lastClose != null ? lastClose * (1 + compounded / 100) : null;
    // win/loss tally across the measured legs
    const upLegs = rulerStats.filter(r => r.pct > 0);
    const downLegs = rulerStats.filter(r => r.pct < 0);
    const avgGain = upLegs.length ? upLegs.reduce((a, r) => a + r.pct, 0) / upLegs.length : 0;
    const avgLoss = downLegs.length ? downLegs.reduce((a, r) => a + r.pct, 0) / downLegs.length : 0;
    return {
      rulerStats, rulerSums, rulerAvg, compounded, veloBar, veloDay,
      projAvg, projAvgDate, projChained, upLegs, downLegs, avgGain, avgLoss,
    };
  }, [rulers, quotes, effTab, lastClose]);

  return (
    <div className="ofc-draw-confirm ofc-ruler-sum ofc-ruler-sum-wide">
      <div className="ofc-study-editor-title">Ruler Totals</div>
      <ColorTabs colors={rulerColors} active={effTab} onSelect={setTab} />
      {rulers.length === 0 ? (
        <div className="ofc-draw-confirm-text" style={{ color: 'var(--text-faint)', margin: '10px 0 4px' }}>
          No ruler drawings yet
        </div>
      ) : (
        <>
          <div className="ofc-ruler-sum-cols">
          <div className="ofc-ruler-sum-heading" style={{ marginTop: 0 }}>Totals</div>
          <div className="ofc-ruler-sum-row">
            <span>Σ change</span>
            <span style={{ color: rulerCalc.rulerSums.pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {rulerCalc.rulerSums.pct >= 0 ? '+' : '−'}{Math.abs(rulerCalc.rulerSums.pct).toFixed(2)}%
            </span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Σ bars</span>
            <span>{rulerCalc.rulerSums.bars}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Σ time</span>
            <span>{fmtSpan(rulerCalc.rulerSums.days)}</span>
          </div>
          <div className="ofc-ruler-sum-heading">Average move</div>
          <div className="ofc-ruler-sum-row">
            <span>Avg change</span>
            <span>{signPct(rulerCalc.rulerAvg.pct)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Avg bars</span>
            <span>{rulerCalc.rulerAvg.bars.toFixed(1)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Avg time</span>
            <span>{fmtSpan(rulerCalc.rulerAvg.days)}</span>
          </div>
          <div className="ofc-ruler-sum-heading">Compounded</div>
          <div className="ofc-ruler-sum-row">
            <span>Chained change</span>
            <span style={{ color: rulerCalc.compounded >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {signPct(rulerCalc.compounded)}
            </span>
          </div>
          <div className="ofc-ruler-sum-heading">Velocity</div>
          <div className="ofc-ruler-sum-row">
            <span>Per bar</span>
            <span>{signPct(rulerCalc.veloBar)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Per day</span>
            <span>{signPct(rulerCalc.veloDay)}</span>
          </div>
          {rulerCalc.projAvg != null && (
            <>
              <div className="ofc-ruler-sum-heading">Projection from close</div>
              <div className="ofc-ruler-sum-row">
                <span>Avg leg</span>
                <span>{rulerCalc.projAvg.toFixed(2)} · {rulerCalc.projAvgDate}</span>
              </div>
              <div className="ofc-ruler-sum-row">
                <span>Chained</span>
                <span>{rulerCalc.projChained.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="ofc-ruler-sum-heading">Win / loss</div>
          <div className="ofc-ruler-sum-row">
            <span>Up / down</span>
            <span>{rulerCalc.upLegs.length} / {rulerCalc.downLegs.length}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Avg gain</span>
            <span style={{ color: 'var(--green)' }}>{signPct(rulerCalc.avgGain)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Avg loss</span>
            <span style={{ color: 'var(--red)' }}>{signPct(rulerCalc.avgLoss)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Gain/loss ratio</span>
            <span>{rulerCalc.avgLoss !== 0 ? Math.abs(rulerCalc.avgGain / rulerCalc.avgLoss).toFixed(2) : '—'}</span>
          </div>
          <div className="ofc-ruler-sum-heading">Range comparison</div>
          <div className="ofc-ruler-range-list">
            {rulerCalc.rulerStats.map((r, k) => (
              <div key={k} className="ofc-ruler-sum-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: r.color }} />
                  {signPct(r.pct)}
                </span>
                <span>{r.rangeX.toFixed(1)}× range</span>
              </div>
            ))}
          </div>
          </div>
          <div className="ofc-ruler-sum-count">
            across {tabRulers.length} ruler{tabRulers.length === 1 ? '' : 's'}
          </div>
        </>
      )}
    </div>
  );
};

export default RulerTotalsPopup;

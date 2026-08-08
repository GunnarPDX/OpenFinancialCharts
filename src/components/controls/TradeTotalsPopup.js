import React from 'react';
import ColorTabs from './ColorTabs';

const fmtQ = (v) => String(Math.abs(v) >= 1000
  ? Math.round(v).toLocaleString()
  : +v.toFixed(Math.abs(v) >= 1 ? 2 : 4));
const fmtCash = (v) => `${v < 0 ? '−' : ''}$${fmtQ(Math.abs(v))}`;
const pnlColor = (v) => (v >= 0 ? 'var(--green)' : 'var(--red)');

// aggregates buy/sell markers into position, cash flow, and P&L stats.
// tabs slice the stats by marker color; 'all' aggregates everything.
// Only mounted while visible, so the tape scans only run then.
const TradeTotalsPopup = ({ drawings, quotes, lastClose, tab, setTab }) => {
  // the marker subset keeps a stable identity while other drawings change,
  // so dragging a non-marker drawing doesn't rerun the scans per mousemove
  const tradesRef = React.useRef([]);
  const trades = React.useMemo(() => {
    const next = drawings.filter(d => d.type === 'buy_marker' || d.type === 'sell_marker');
    const prev = tradesRef.current;
    if (prev.length === next.length && prev.every((d, i) => d === next[i])) return prev;
    tradesRef.current = next;
    return next;
  }, [drawings]);

  const colors = [...new Set(trades.map(d => d.color || '#3b82f6'))];
  const effTab = tab !== 'all' && !colors.includes(tab) ? 'all' : tab;
  const tabTrades = effTab === 'all' ? trades : trades.filter(d => (d.color || '#3b82f6') === effTab);

  const calc = React.useMemo(() => {
    // price each marker by its priceSource (bar open/high/low/close, or the
    // custom price) — the same basis as the marker's own val/price rows
    const qs = quotes || [];
    const barAt = (t) => {
      let best = null;
      for (const q of qs) {
        if (+q.date <= t) best = q;
        else break;
      }
      return best || qs[0] || null;
    };
    const legs = tabTrades
      .map(d => {
        const src = d.priceSource || 'close';
        const px = src === 'custom' ? d.p : (barAt(d.t)?.[src] ?? null);
        return { buy: d.type === 'buy_marker', qty: d.qty || 0, px: Number.isFinite(px) ? px : null };
      })
      .filter(l => l.qty > 0 && l.px != null);
    const buys = legs.filter(l => l.buy), sells = legs.filter(l => !l.buy);
    const buyQty = buys.reduce((a, l) => a + l.qty, 0);
    const sellQty = sells.reduce((a, l) => a + l.qty, 0);
    const buyCost = buys.reduce((a, l) => a + l.qty * l.px, 0);
    const sellVal = sells.reduce((a, l) => a + l.qty * l.px, 0);
    const avgBuy = buyQty ? buyCost / buyQty : null;
    const avgSell = sellQty ? sellVal / sellQty : null;
    const netQty = buyQty - sellQty;
    // realized: the overlapped qty closed out at the avg prices of each side;
    // unrealized: the open remainder marked at the latest close
    const matched = Math.min(buyQty, sellQty);
    const realized = matched > 0 && avgBuy != null && avgSell != null
      ? matched * (avgSell - avgBuy) : 0;
    const entry = netQty >= 0 ? avgBuy : avgSell;
    const unrealized = lastClose != null && entry != null && netQty !== 0
      ? netQty * (lastClose - entry) : 0;
    // % return on the capital put in: buy cost for long-side activity,
    // sell proceeds when the slice is short-only
    const basis = buyCost || sellVal;
    const total = realized + unrealized;
    return {
      nBuys: buys.length, nSells: sells.length,
      buyQty, sellQty, buyCost, sellVal, avgBuy, avgSell, netQty,
      realized, unrealized, total,
      pct: basis ? (total / basis) * 100 : null,
    };
  }, [tabTrades, quotes, lastClose]);

  return (
    <div className="ofc-draw-confirm ofc-ruler-sum">
      <div className="ofc-study-editor-title">Buy/Sell Totals</div>
      <ColorTabs colors={colors} active={effTab} onSelect={setTab} />
      {trades.length === 0 ? (
        <div className="ofc-draw-confirm-text" style={{ color: 'var(--text-faint)', margin: '10px 0 4px' }}>
          No buy/sell markers yet
        </div>
      ) : (
        <>
          <div className="ofc-ruler-sum-heading" style={{ marginTop: 0 }}>Position</div>
          <div className="ofc-ruler-sum-row">
            <span>Bought</span>
            <span>{fmtQ(calc.buyQty)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Sold</span>
            <span>{fmtQ(calc.sellQty)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Net qty</span>
            <span>{calc.netQty < 0 ? '−' : ''}{fmtQ(Math.abs(calc.netQty))}</span>
          </div>
          <div className="ofc-ruler-sum-heading">Cash flow</div>
          <div className="ofc-ruler-sum-row">
            <span>Buy cost</span>
            <span>{fmtCash(calc.buyCost)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Sell value</span>
            <span>{fmtCash(calc.sellVal)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Net cash</span>
            <span>{fmtCash(calc.sellVal - calc.buyCost)}</span>
          </div>
          <div className="ofc-ruler-sum-heading">Average price</div>
          <div className="ofc-ruler-sum-row">
            <span>Avg buy</span>
            <span>{calc.avgBuy != null ? calc.avgBuy.toFixed(2) : '—'}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Avg sell</span>
            <span>{calc.avgSell != null ? calc.avgSell.toFixed(2) : '—'}</span>
          </div>
          <div className="ofc-ruler-sum-heading">P&amp;L</div>
          <div className="ofc-ruler-sum-row">
            <span>Realized</span>
            <span style={{ color: pnlColor(calc.realized) }}>{fmtCash(calc.realized)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Unrealized</span>
            <span style={{ color: pnlColor(calc.unrealized) }}>{fmtCash(calc.unrealized)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>Total</span>
            <span style={{ color: pnlColor(calc.total) }}>{fmtCash(calc.total)}</span>
          </div>
          <div className="ofc-ruler-sum-row">
            <span>% gain/loss</span>
            <span style={{ color: calc.pct != null ? pnlColor(calc.pct) : undefined }}>
              {calc.pct != null ? `${calc.pct >= 0 ? '+' : '−'}${Math.abs(calc.pct).toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="ofc-ruler-sum-count">
            across {calc.nBuys} buy{calc.nBuys === 1 ? '' : 's'} / {calc.nSells} sell{calc.nSells === 1 ? '' : 's'}
          </div>
        </>
      )}
    </div>
  );
};

export default TradeTotalsPopup;

import React from 'react';
import ColorTabs from './ColorTabs';

// distance to levels: support/resistance ladder vs the latest close,
// sliceable by level color like the ruler tabs. Only mounted while visible.
const DistanceToLevelsPopup = ({ drawings, lastClose, tab, setTab }) => {
  const levels = drawings.filter(d => d.type === 'level');
  const levelColors = [...new Set(levels.map(d => d.color || '#3b82f6'))];
  const effDistTab = tab !== 'all' && !levelColors.includes(tab) ? 'all' : tab;

  const levelRows = React.useMemo(() => {
    return drawings
      .filter(d => d.type === 'level')
      .filter(d => effDistTab === 'all' || (d.color || '#3b82f6') === effDistTab)
      .map(d => ({
        p: d.p,
        color: d.color,
        dlr: lastClose != null ? d.p - lastClose : 0,
        pct: lastClose ? ((d.p - lastClose) / lastClose) * 100 : 0,
      }))
      .sort((a, b) => b.p - a.p);
  }, [drawings, effDistTab, lastClose]);

  return (
    <div className="ofc-draw-confirm ofc-ruler-sum">
      <div className="ofc-study-editor-title">Distance to Levels</div>
      <ColorTabs colors={levelColors} active={effDistTab} onSelect={setTab} />
      {levelRows.length === 0 ? (
        <div className="ofc-draw-confirm-text" style={{ color: 'var(--text-faint)', margin: '10px 0 4px' }}>
          No level drawings yet
        </div>
      ) : (
        <>
          <div className="ofc-level-dist-list">
            {levelRows.map((l, k) => (
              <div key={k} className="ofc-ruler-sum-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: l.color || 'var(--text-faint)' }} />
                  {l.p.toFixed(2)}
                </span>
                <span style={{ color: l.dlr >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {l.dlr >= 0 ? '+' : '−'}{Math.abs(l.dlr).toFixed(2)} ({l.dlr >= 0 ? '+' : '−'}{Math.abs(l.pct).toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
          <div className="ofc-ruler-sum-count">
            vs close {lastClose != null ? lastClose.toFixed(2) : '—'}
          </div>
        </>
      )}
    </div>
  );
};

export default DistanceToLevelsPopup;

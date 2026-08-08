import React from 'react';
import { useChartProvider, useQuotes, useDrawings } from '../ChartContext';
import ColorPicker from './ColorPicker';
import RulerTotalsPopup from './RulerTotalsPopup';
import TradeTotalsPopup from './TradeTotalsPopup';
import DistanceToLevelsPopup from './DistanceToLevelsPopup';
import ZoneOverlapsPopup from './ZoneOverlapsPopup';
import useClickOutside from '../../utils/useClickOutside';
import { T, MAIN_TOOLS, GROUPS } from './drawTools';

const Component = () => {
  const { drawTool, setDrawTool, clearDrawings, removeDrawing, drawColor, setDrawColor, config } = useChartProvider();
  const drawings = useDrawings();
  // config-hidden tools disappear; groups left empty disappear with them.
  // Hiding every tool between two dividers would leave them doubled (or
  // leading/trailing), so keep a divider only when a tool sits on both sides
  const toolShown = (t) => t.divider || !config.draw_tools_hidden.includes(t.id);
  const tidyDividers = (tools) => tools.filter((t, i, arr) => (
    !t.divider || (i > 0 && !arr[i - 1].divider && arr.slice(i + 1).some(x => !x.divider))
  ));
  const mainTools = MAIN_TOOLS.filter(toolShown);
  const groups = GROUPS
    .map(g => ({ ...g, tools: tidyDividers(g.tools.filter(toolShown)) }))
    .filter(g => g.tools.some(t => !t.divider));
  const { quotes } = useQuotes();
  const [openGroup, setOpenGroup] = React.useState(null); // GROUPS id | null
  const [calcOpen, setCalcOpen] = React.useState(false);
  const [rulerSumOpen, setRulerSumOpen] = React.useState(false);
  const [tradeSumOpen, setTradeSumOpen] = React.useState(false);
  const [distOpen, setDistOpen] = React.useState(false);
  const [zoneOpen, setZoneOpen] = React.useState(false);
  const [rulerTab, setRulerTab] = React.useState('all');
  const [tradeTab, setTradeTab] = React.useState('all');
  const [distTab, setDistTab] = React.useState('all');
  const [confirming, setConfirming] = React.useState(false);
  const rootRef = React.useRef(null);

  // clicks outside the toolbar complex (chart, menus, anywhere) dismiss the
  // open flyout and calc popups; the flyouts and `.ofc-ruler-sum` popups are
  // descendants of rootRef, so clicks inside them stay excluded
  useClickOutside(rootRef, () => {
    setOpenGroup(null);
    setCalcOpen(false);
    setRulerSumOpen(false);
    setTradeSumOpen(false);
    setDistOpen(false);
    setZoneOpen(false);
    setConfirming(false);
  }, openGroup !== null || calcOpen || confirming);

  const lastClose = (quotes && quotes.length) ? quotes[quotes.length - 1].close : null;

  React.useEffect(() => {
    if (!drawings.length) setConfirming(false);
  }, [drawings.length]);

  const pick = (t) => {
    if (t.id === 'highlight') setDrawColor('#facc15'); // highlighter defaults to yellow
    setDrawTool(t.id);
    setOpenGroup(null);
    setCalcOpen(false);
    setRulerSumOpen(false);
    setTradeSumOpen(false);
    setDistOpen(false);
    setZoneOpen(false);
  };

  // one fixed-position tooltip for every [data-title] in the toolbar,
  // delegated from the root. The old per-button ::before tooltips would be
  // clipped by the scrollable tool strips (overflow clips positioned
  // descendants), so the tooltip lives outside them and tracks the hovered
  // button's rect instead.
  const [tip, setTip] = React.useState(null); // { text, x, y }
  const tipOver = (e) => {
    const el = e.target.closest ? e.target.closest('[data-title]') : null;
    if (!el || !rootRef.current || !rootRef.current.contains(el)) {
      setTip(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const next = { text: el.getAttribute('data-title'), x: r.right + 8, y: r.top + r.height / 2 };
    setTip(t => (t && t.text === next.text && t.x === next.x && t.y === next.y ? t : next));
  };
  const tipClear = () => setTip(null);

  const toolButton = (t) => (
    <button
      key={t.id}
      className={`ofc-draw-tool${drawTool === t.id ? ' ofc-active' : ''}`}
      data-title={t.title}
      onClick={() => pick(t)}
    >
      {t.icon}
    </button>
  );

  const groupButton = (g) => {
    const inGroup = g.tools.some(t => t.id === drawTool);
    const face = g.tools.find(t => t.id === drawTool) || g.tools[0];
    return (
      <button
        key={g.id}
        className={`ofc-draw-tool ofc-draw-group${inGroup ? ' ofc-active' : ''}`}
        data-title={g.title}
        onClick={() => { setCalcOpen(false); setOpenGroup(o => (o === g.id ? null : g.id)); }}
      >
        {face.icon}
      </button>
    );
  };

  return (
    <div
      className="ofc-draw-bars"
      ref={rootRef}
      onMouseOver={tipOver}
      onMouseLeave={tipClear}
      onClickCapture={tipClear}
      onScrollCapture={tipClear}
    >
      <div className="ofc-draw-bar">
        {/* the tool strip scrolls when the chart is too short for it; the
            color/undo/trash/calc chrome below stays pinned */}
        <div className="ofc-draw-scroll">
          {mainTools.length > 0 && toolButton(mainTools[0])}
          {groups.length > 0 && groupButton(groups[0])}
          {mainTools.slice(1).map(toolButton)}
          {groups.slice(1).map(groupButton)}
        </div>
        <div className="ofc-draw-bar-divider" />
        <span className="ofc-draw-tip" data-title="Drawing Color">
          <ColorPicker value={drawColor} onChange={setDrawColor} palette={config.draw_palette} />
        </span>
        <div className="ofc-draw-bar-divider" />
        <button
          className="ofc-draw-tool"
          data-title="Undo Last Drawing"
          disabled={!drawings.length}
          onClick={() => drawings.length && removeDrawing(drawings[drawings.length - 1].id)}
        >
          <T>
            <path d="M7.5 6.5L4 10l3.5 3.5" />
            <path d="M4 10h10a6 6 0 016 6v2" />
          </T>
        </button>
        <div className="ofc-draw-trash-wrap">
          <button
            className={`ofc-draw-tool${confirming ? ' ofc-active' : ''}`}
            data-title="Clear All"
            disabled={!drawings.length}
            onClick={() => setConfirming(c => !c)}
          >
            <T>
              <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
              <circle cx="10.2" cy="13.5" r="1.5" strokeWidth="1.2" />
              <circle cx="13.8" cy="13.5" r="1.5" strokeWidth="1.2" />
            </T>
          </button>
          {confirming && (
            <div className="ofc-draw-confirm">
              <div className="ofc-draw-confirm-text">
                Delete all {drawings.length} drawing{drawings.length === 1 ? '' : 's'}?
              </div>
              <div className="ofc-draw-confirm-actions">
                <button className="ofc-button" onClick={() => setConfirming(false)}>Cancel</button>
                <button
                  className="ofc-button ofc-draw-confirm-delete"
                  onClick={() => { clearDrawings(); setConfirming(false); }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="ofc-draw-bar-divider" style={{ marginTop: 'auto' }} />
        <button
          className={`ofc-draw-tool ofc-draw-group${calcOpen ? ' ofc-active' : ''}`}
          data-title="Drawing Calculations"
          style={{ marginBottom: 6 }}
          onClick={() => { setOpenGroup(null); setCalcOpen(o => !o); }}
        >
          <T>
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M8 6.5h8" strokeWidth="1.8" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18.5h.01M12 18.5h.01M15.5 18.5h.01" strokeWidth="2" strokeLinecap="round" />
          </T>
        </button>
      </div>
      {groups.map(g => openGroup === g.id && (
        <div key={g.id} className="ofc-draw-bar ofc-draw-bar-sub">
          <div className="ofc-draw-scroll">
            {g.tools.map((t, k) => t.divider
              ? <div key={`div-${k}`} className="ofc-draw-bar-divider" />
              : toolButton(t))}
          </div>
        </div>
      ))}
      {calcOpen && (
        <div className="ofc-draw-bar ofc-draw-bar-sub">
          <div className="ofc-draw-trash-wrap">
            <button
              className={`ofc-draw-tool${rulerSumOpen ? ' ofc-active' : ''}`}
              data-title="Ruler Totals"
              onClick={() => { setTradeSumOpen(false); setDistOpen(false); setZoneOpen(false); setRulerSumOpen(o => !o); }}
            >
              <T>
                <g transform="rotate(-35 12 13)">
                  <rect x="3.5" y="10.5" width="17" height="5.5" rx="1" />
                  <path d="M7 10.5v2.3M10.5 10.5v2.3M14 10.5v2.3M17.5 10.5v2.3" />
                </g>
                <path d="M3.5 5h5.5M6.25 2.25v5.5" strokeWidth="1.7" />
                <path d="M15.5 21h5.5" strokeWidth="1.7" />
              </T>
            </button>
            {rulerSumOpen && (
              <RulerTotalsPopup
                drawings={drawings}
                quotes={quotes}
                lastClose={lastClose}
                tab={rulerTab}
                setTab={setRulerTab}
              />
            )}
          </div>
          {config.show_trade_markers && (
          <div className="ofc-draw-trash-wrap">
            <button
              className={`ofc-draw-tool${tradeSumOpen ? ' ofc-active' : ''}`}
              data-title="Buy/Sell Totals"
              onClick={() => { setRulerSumOpen(false); setDistOpen(false); setZoneOpen(false); setTradeSumOpen(o => !o); }}
            >
              <T>
                <text x="12" y="6.5" dy="0.34em" textAnchor="middle" fontSize="8.5" fontWeight="700"
                  fill="currentColor" stroke="none">BUY</text>
                <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1.2" />
                <text x="12" y="18" dy="0.34em" textAnchor="middle" fontSize="8.5" fontWeight="700"
                  fill="currentColor" stroke="none">SELL</text>
              </T>
            </button>
            {tradeSumOpen && (
              <TradeTotalsPopup
                drawings={drawings}
                quotes={quotes}
                lastClose={lastClose}
                tab={tradeTab}
                setTab={setTradeTab}
              />
            )}
          </div>
          )}
          <div className="ofc-draw-trash-wrap">
            <button
              className={`ofc-draw-tool${distOpen ? ' ofc-active' : ''}`}
              data-title="Distance to Levels"
              onClick={() => { setRulerSumOpen(false); setTradeSumOpen(false); setZoneOpen(false); setDistOpen(o => !o); }}
            >
              <T>
                <path d="M4 5h11M4 12h11M4 19h11" />
                <path d="M19.5 7.5v9M17.8 9.2L19.5 7.5l1.7 1.7M17.8 14.8l1.7 1.7 1.7-1.7" strokeWidth="1.3" />
              </T>
            </button>
            {distOpen && (
              <DistanceToLevelsPopup
                drawings={drawings}
                lastClose={lastClose}
                tab={distTab}
                setTab={setDistTab}
              />
            )}
          </div>
          <div className="ofc-draw-trash-wrap">
            <button
              className={`ofc-draw-tool${zoneOpen ? ' ofc-active' : ''}`}
              data-title="Zone Overlaps"
              onClick={() => { setRulerSumOpen(false); setTradeSumOpen(false); setDistOpen(false); setZoneOpen(o => !o); }}
            >
              <T>
                <rect x="3.5" y="4.5" width="12" height="8.5" />
                <rect x="8.5" y="10.5" width="12" height="8.5" />
                <rect x="8.5" y="10.5" width="7" height="2.5" fill="currentColor" opacity="0.45" stroke="none" />
              </T>
            </button>
            {zoneOpen && <ZoneOverlapsPopup drawings={drawings} />}
          </div>
        </div>
      )}
      {tip && (
        <div className="ofc-draw-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
};

export default Component;

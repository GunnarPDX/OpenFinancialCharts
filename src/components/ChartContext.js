import React from "react";
import { createStorage } from '../utils/storage';
import { useStableConfig, isTradeMarker } from '../utils/config';
import { normalizeQuotes, applyTicks, capQuotes, candleSizeToMs, minutesInNY } from '../utils/quotes';
import { ensureEngine } from '../utils/scriptEngine';
import { studies } from '../studies';
import useCustomThemes from './hooks/useCustomThemes';
import useScripts from './hooks/useScripts';

const ChartContext = React.createContext();
// quotes change up to 4x/sec under live ticks; they live in their own context
// so menus/toolbars subscribed to settings don't re-render per tick batch
const QuotesContext = React.createContext();
// drawings change per mousemove while one is dragged; isolated the same way
// so settings consumers (menus, toolbars) don't re-render per drag frame.
// The mutators stay in the settings context — they're useCallback-stable.
const DrawingsContext = React.createContext();

export const useChartProvider = () => React.useContext(ChartContext);
export const useQuotes = () => React.useContext(QuotesContext);
export const useDrawings = () => React.useContext(DrawingsContext);

// studies were rebranded; migrate ids persisted before the rename
const ID_RENAMES = {
  gonogo_trend: 'yesno_trend',
  gonogo_line: 'yesno_line',
  gonogo_oscillator: 'yesno_oscillator',
  gonogo_icons: 'yesno_icons',
  advance_decline_ratio_bars: 'candle_color_ratio',
  delta_profile: 'buy_sell_profile',
};
const migrateId = (id) => ID_RENAMES[id] || id;

const ChartProvider = ({ children, dataFeed, priceSocket, ticker, config, customStudies }) => {
  const feed = dataFeed || null;
  const socket = priceSocket || null;
  const cfg = useStableConfig(config);
  // behavior values/callbacks read through a ref so identity-stable callbacks
  // (addStudy, loadOlder) always see the latest config without re-creating.
  // Callbacks come from the RAW prop: useStableConfig deliberately ignores
  // function identity (inline handlers would otherwise churn cfg every
  // render), so cfg may hold a stale closure — the raw prop never does
  const cfgRef = React.useRef(cfg);
  cfgRef.current = {
    ...cfg,
    on_ticker_change: config?.on_ticker_change ?? null,
    on_candle_size_change: config?.on_candle_size_change ?? null,
    on_study_add: config?.on_study_add ?? null,
  };

  // persistence is fixed at mount (true → default key, string → custom key,
  // false → stateless); changing it afterwards is not supported
  const [storage] = React.useState(() => createStorage(cfg.persistence));
  const [saved] = React.useState(() => storage.loadState());
  // flush + drop the unload listener when this provider goes away; re-attach
  // on setup so StrictMode's unmount/remount cycle doesn't strip it for good
  React.useEffect(() => {
    storage.attach();
    return () => storage.destroy();
  }, [storage]);

  // warm the theta-script wasm engine at mount so scripts are runnable by
  // the time anything needs them; failures surface when a script actually
  // runs, not here
  React.useEffect(() => { ensureEngine().catch(() => {}); }, []);

  // ticker prop wins over the persisted symbol on mount; after that the chart
  // owns the symbol (search field, or setSymbol via useChartProvider)
  const [symbol, setSymbol] = React.useState(ticker ?? saved.symbol ?? 'AAPL');
  // persisted size wins over the default, but never outside a host's
  // restricted candle_sizes list (e.g. the list changed since last visit)
  const [candleSize, setCandleSize] = React.useState(() => {
    const size = saved.candleSize ?? cfg.default_candle_size;
    return cfg.candle_sizes && !cfg.candle_sizes.includes(size)
      ? cfg.default_candle_size
      : size;
  });
  const [timeframe, setTimeframe] = React.useState(saved.timeframe ?? cfg.default_timeframe);

  // change callbacks fire on real changes only, not the initial value —
  // guarded by previous-value refs (a mounted flag would misfire under
  // StrictMode's double-invoked effects)
  const prevSymbol = React.useRef(symbol);
  React.useEffect(() => {
    if (prevSymbol.current !== symbol) {
      prevSymbol.current = symbol;
      cfgRef.current.on_ticker_change?.(symbol);
    }
  }, [symbol]);
  const prevCandleSize = React.useRef(candleSize);
  React.useEffect(() => {
    if (prevCandleSize.current !== candleSize) {
      prevCandleSize.current = candleSize;
      cfgRef.current.on_candle_size_change?.(candleSize);
    }
  }, [candleSize]);

  // quotes come from the pluggable data feed; empty until a fetch lands
  const [quotes, setQuotes] = React.useState([]);
  const [feedLoading, setFeedLoading] = React.useState(false);
  const [feedError, setFeedError] = React.useState(null);
  // latest values for async callbacks (loadOlder, socket) without making them
  // dependencies — keeps callback identities stable across tick updates
  const quotesRef = React.useRef(quotes);
  quotesRef.current = quotes;
  const feedKey = `${symbol}|${candleSize}|${timeframe}`;
  const feedKeyRef = React.useRef(feedKey);
  feedKeyRef.current = feedKey;

  React.useEffect(() => {
    if (!feed || !symbol) return undefined;
    let cancelled = false;
    setFeedLoading(true);
    setFeedError(null);
    feed
      .fetchOHLC({ ticker: symbol, candleSize, timeframe })
      .then(bars => {
        if (cancelled) return;
        if (!bars.length) throw new Error('feed returned no bars');
        setQuotes(normalizeQuotes(bars));
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[open-financial-charts] data feed error:', err);
        setFeedError(err.message || String(err));
      })
      .finally(() => { if (!cancelled) setFeedLoading(false); });
    return () => { cancelled = true; };
  }, [feed, symbol, candleSize, timeframe]);

  // declared above the live-tick effect below, which gates on it via a ref so
  // toggling it doesn't tear down and reconnect the websocket
  const [showExtendedHours, setShowExtendedHours] = React.useState(saved.showExtendedHours ?? cfg.default_extended_hours);
  const showExtRef = React.useRef(showExtendedHours);
  showExtRef.current = showExtendedHours;

  // live ticks from the price socket (a prop — the chart never talks to a
  // provider directly) update the current candle in place and open the next
  // candle once the interval rolls over. Tick volume is cumulative session
  // volume, so we diff consecutive ticks to get each candle's share.
  // ticks are buffered and folded in batches (≤4 renders/sec) so a busy tape
  // doesn't re-render the chart once per trade
  // cumulative session volume baseline for tick deltas; lives outside the
  // socket effect so a candle-size switch doesn't lose the baseline (and with
  // it the first tick's volume). Cumulative volume is per-symbol, so only a
  // symbol change resets it — the very first tick after that genuinely has no
  // baseline, and its delta is unknowable (0).
  const lastVolRef = React.useRef({ symbol: null, vol: null });
  // pagination state, declared here because the live-tick flush below reads
  // count (cap trimming yields to paged-back history); managed by loadOlder
  const olderRef = React.useRef({ inflight: false, exhaustedKey: null, key: null, count: 0 });

  React.useEffect(() => {
    if (!socket || !symbol) return undefined;
    const intervalMs = candleSizeToMs(candleSize);
    const volState = lastVolRef.current;
    if (volState.symbol !== symbol) { volState.symbol = symbol; volState.vol = null; }
    let pending = [];
    let flushTimer = null;
    const flush = () => {
      flushTimer = null;
      const batch = pending;
      pending = [];
      // capQuotes bounds week-scale live sessions (no-op until the cap) —
      // but never while the user has paged back for older history: trimming
      // the oldest bars would silently eat exactly what loadOlder fetched
      setQuotes(qs => {
        const next = applyTicks(qs, batch, intervalMs);
        return olderRef.current.count > 0 ? next : capQuotes(next);
      });
    };
    const unsubscribe = socket.subscribe(symbol, (tick) => {
      // with extended hours hidden, drop out-of-session ticks so the live
      // candle doesn't build bars the chart won't show. Honor the feed's
      // session tag when the tick carries one (same 'r'/'pr'/'po' marketTime
      // tags historical bars use); otherwise fall back to the 09:30–16:00
      // market-clock heuristic the extended-hours bar filter uses
      if (!showExtRef.current) {
        if (tick.marketTime != null) {
          if (tick.marketTime !== 'r') return;
        } else {
          const m = minutesInNY(tick.time);
          if (m < 9 * 60 + 30 || m >= 16 * 60) return;
        }
      }
      const volDelta = volState.vol == null ? 0 : Math.max(0, tick.volume - volState.vol);
      volState.vol = tick.volume;
      pending.push([tick, volDelta]);
      if (!flushTimer) flushTimer = setTimeout(flush, cfgRef.current.tick_flush_ms);
    });
    return () => {
      // fold rather than drop any buffered ticks (candle-size switches would
      // otherwise lose up to 250ms of tape)
      if (flushTimer) { clearTimeout(flushTimer); flush(); }
      unsubscribe();
    };
  }, [socket, symbol, candleSize]);

  // backwards pagination: fetch the chunk ending at the oldest loaded bar and
  // prepend whatever is genuinely new; one request in flight, and a tape that
  // returns nothing older is marked exhausted until symbol/size changes.
  // quotes are read through a ref so the callback identity stays stable — the
  // scroll-triggered effect in the chart body re-fires only on real reaches,
  // not on every live tick.
  // (olderRef is declared above the tick effect, which consults count to
  // keep capQuotes from trimming freshly paged history)
  const [feedLoadingOlder, setFeedLoadingOlder] = React.useState(false);
  const loadOlder = React.useCallback(() => {
    const qs = quotesRef.current;
    if (!feed || !symbol || !qs.length) return;
    const key = feedKeyRef.current;
    const st = olderRef.current;
    if (st.key !== key) {
      st.key = key;
      st.count = 0;
    }
    // backwards pagination cap, resets on symbol/size/timeframe change
    if (st.inflight || st.exhaustedKey === key || st.count >= cfgRef.current.max_older_loads) return;
    st.inflight = true;
    st.count += 1;
    setFeedLoadingOlder(true);
    const oldest = qs[0].date;
    feed
      .fetchOHLC({ ticker: symbol, candleSize, timeframe, endDate: oldest })
      .then(bars => {
        // the user may have switched symbol/size while this was in flight;
        // merging would prepend the wrong instrument's history
        if (feedKeyRef.current !== key) return;
        const current = quotesRef.current;
        const seen = new Set(current.map(q => +q.date));
        const fresh = bars.filter(b => !seen.has(+b.date) && +b.date < +oldest);
        if (!fresh.length) {
          st.exhaustedKey = key;
          return;
        }
        setQuotes(cur => normalizeQuotes([...fresh, ...cur]));
      })
      .catch(err => console.error('[open-financial-charts] older-data fetch error:', err))
      .finally(() => {
        st.inflight = false;
        setFeedLoadingOlder(false);
      });
  }, [feed, symbol, candleSize, timeframe]);
  const [lineType, setLineType] = React.useState(saved.lineType ?? cfg.default_line_type);
  // custom gain/loss colors for the main series (candles, bars, baseline…);
  // off = the theme's standard green/red. Scoped to the main line only —
  // studies, panes and UI chrome keep the theme colors
  const [customLineColors, setCustomLineColors] = React.useState(saved.customLineColors ?? false);
  const [lineUpColor, setLineUpColor] = React.useState(saved.lineUpColor ?? '#22c55e');
  const [lineDownColor, setLineDownColor] = React.useState(saved.lineDownColor ?? '#ef4444');
  const [showBrushState, setShowBrush] = React.useState(saved.showBrush ?? true);
  // config can force the brush off entirely (the settings toggle hides too)
  const showBrush = cfg.show_brush && showBrushState;
  const [showGridH, setShowGridH] = React.useState(saved.showGridH ?? true);
  const [showGridV, setShowGridV] = React.useState(saved.showGridV ?? true);
  const [denseGrid, setDenseGrid] = React.useState(saved.denseGrid ?? false);
  const [showCrosshair, setShowCrosshair] = React.useState(saved.showCrosshair ?? false);
  const [showTooltip, setShowTooltip] = React.useState(saved.showTooltip ?? false);
  const [showPriceDisplay, setShowPriceDisplay] = React.useState(saved.showPriceDisplay ?? false);
  const [stickToData, setStickToData] = React.useState(saved.stickToData ?? false);
  const [theme, setTheme] = React.useState(saved.theme ?? cfg.default_theme);
  const {
    customThemes, saveCustomTheme, deleteCustomTheme, themePreview, setThemePreview,
  } = useCustomThemes(saved, setTheme);
  const [yLogScale, setYLogScale] = React.useState(saved.yLogScale ?? cfg.default_log_scale);
  const [yInvert, setYInvert] = React.useState(saved.yInvert ?? false);
  const [extHoursHighlight, setExtHoursHighlight] = React.useState(saved.extHoursHighlight ?? false);
  const [timezone, setTimezone] = React.useState(saved.timezone ?? cfg.default_timezone);

  // drawing tools: sidebar visibility, active tool, and the drawings
  // themselves (data-anchored: timestamps + prices, so they survive reloads).
  // every drawing carries a stable id — editors/selection reference drawings
  // by id, so deleting one never retargets dialogs open on another
  const [showDrawBarState, setShowDrawBar] = React.useState(true);
  const showDrawBar = cfg.show_drawing_tools && showDrawBarState;
  const [drawTool, setDrawTool] = React.useState('none');
  const [drawings, setDrawings] = React.useState(() =>
    (saved.drawings ?? []).map((d, i) => (d.id != null ? d : { ...d, id: i + 1 }))
  );
  const drawSeq = React.useRef(
    (saved.drawings ?? []).reduce((m, d, i) => Math.max(m, d.id ?? i + 1), 0)
  );
  const [drawColor, setDrawColor] = React.useState(saved.drawColor ?? cfg.default_draw_color);
  // chart-wide expansion for buy/sell markers: off (default) renders them
  // collapsed to just the BUY/SELL chip; on shows their qty/val/close rows
  const [showFullTrades, setShowFullTrades] = React.useState(saved.showFullTrades ?? false);
  // drawing colors currently hidden by the color filter menu
  const [hiddenColors, setHiddenColors] = React.useState(saved.hiddenColors ?? []);
  // all mutators use functional setState only, so they're identity-stable —
  // consumers can safely list them in effect deps without resubscribing
  const toggleHiddenColor = React.useCallback((c) =>
    setHiddenColors(h => (h.includes(c) ? h.filter(x => x !== c) : [...h, c])), []);
  const addDrawing = React.useCallback((d) => {
    const id = ++drawSeq.current;
    setDrawings(ds => [...ds, { ...d, id }]);
    // a fresh drawing in a hidden color unhides that color, so it's visible
    setHiddenColors(h => h.filter(c => c !== (d.color || 'multi')));
    return id;
  }, []);
  const removeDrawing = React.useCallback((id) => setDrawings(ds => ds.filter(d => d.id !== id)), []);
  const updateDrawing = React.useCallback((id, changes) => {
    setDrawings(ds => ds.map(d => (d.id === id ? { ...d, ...changes } : d)));
    // same for recolors: never let an edit make the drawing invisible
    if (changes.color) setHiddenColors(h => h.filter(c => c !== changes.color));
  }, []);
  const clearDrawings = React.useCallback(() => setDrawings([]), []);
  const removeDrawingsByColor = React.useCallback((c) =>
    setDrawings(ds => ds.filter(d => (d.color || 'multi') !== c)), []);

  // instances: { key, id, color, params } — every add creates a new instance
  // (multiple of the same study allowed), keyed for edit/remove
  // migrate renamed ids, then drop entries whose study no longer exists —
  // stale ids otherwise linger forever and make "active studies" look
  // non-empty while rendering nothing
  // studies_default seeds the chart only when nothing was ever persisted;
  // config-hidden studies are dropped even if a stale persisted state has them
  const [activeStudies, setActiveStudies] = React.useState(() => {
    // seeding respects max_active_studies like addStudy does; persisted state
    // is left alone — truncating what a user already had would be worse
    const seeded = cfg.studies_default
      .map((id, i) => {
        const def = studies.find(d => d.id === id);
        return def && { key: i + 1, id: def.id, color: def.color, params: { ...def.params } };
      })
      .filter(Boolean)
      .slice(0, cfg.max_active_studies ?? Infinity);
    return (saved.activeStudies ?? seeded)
      .map(s => ({ ...s, id: migrateId(s.id) }))
      .filter(s => studies.some(d => d.id === s.id) && !cfg.studies_hidden.includes(s.id));
  });
  const studySeq = React.useRef(
    Math.max(
      (saved.activeStudies ?? []).reduce((m, s) => Math.max(m, s.key || 0), 0),
      saved.activeStudies === undefined ? cfg.studies_default.length : 0
    )
  );

  const activeStudiesRef = React.useRef(activeStudies);
  activeStudiesRef.current = activeStudies;

  const addStudy = React.useCallback((def) => {
    const { max_active_studies, studies_hidden, on_study_add } = cfgRef.current;
    if (studies_hidden.includes(def.id)) return;
    if (max_active_studies != null && activeStudiesRef.current.length >= max_active_studies) return;
    on_study_add?.(def);
    setActiveStudies(a => [
      ...a,
      { key: ++studySeq.current, id: def.id, color: def.color, params: { ...def.params } },
    ]);
  }, []);

  const updateStudy = React.useCallback((key, changes) =>
    setActiveStudies(a => a.map(s => s.key === key ? { ...s, ...changes } : s)), []);

  const removeStudy = React.useCallback((key) =>
    setActiveStudies(a => a.filter(s => s.key !== key)), []);

  // favorited study definition ids
  const [favoriteStudies, setFavoriteStudies] = React.useState(
    (saved.favoriteStudies ?? cfg.favorite_studies_default).map(migrateId)
  );
  const toggleFavorite = React.useCallback((id) =>
    setFavoriteStudies(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]), []);

  // editor-authored scripts + host-provided studies (customStudies prop)
  const {
    customScripts, saveScript, deleteScript, toggleScript,
    providedStudies, providedState,
  } = useScripts({ saved, storage, cfg, customStudies });
  const [showScriptEditorState, setShowScriptEditor] = React.useState(!!cfg.default_script_editor_open);
  const showScriptEditor = cfg.show_script_editor && showScriptEditorState;
  // set by menus to open the editor on a specific script; the editor consumes
  // (clears) it after selecting
  const [scriptEditorSelect, setScriptEditorSelect] = React.useState(null);

  // set by the studies menu to open a study's editor window on the chart
  const [studyEditRequest, setStudyEditRequest] = React.useState(null);

  // persist the underlying user choices (showBrushState, not the effective
  // config-gated value) so a config change never rewrites what the user set
  React.useEffect(() => {
    storage.saveState({
      lineType, showBrush: showBrushState, showGridH, showGridV, denseGrid,
      showCrosshair, showTooltip, showPriceDisplay, stickToData,
      activeStudies, favoriteStudies, theme, customThemes, yLogScale, yInvert,
      showExtendedHours, extHoursHighlight, drawings, drawColor, hiddenColors, customScripts, providedStudyState: providedState, timezone, symbol, candleSize, timeframe,
      showFullTrades, customLineColors, lineUpColor, lineDownColor,
    });
  }, [
    storage,
    lineType, showBrushState, showGridH, showGridV, denseGrid,
    showCrosshair, showTooltip, showPriceDisplay, stickToData,
    activeStudies, favoriteStudies, theme, customThemes, yLogScale, yInvert,
    showExtendedHours, extHoursHighlight, drawings, drawColor, hiddenColors, customScripts, providedState, timezone, symbol, candleSize, timeframe,
    showFullTrades, customLineColors, lineUpColor, lineDownColor,
  ]);

  // memoized so consumers only re-render when a settings atom actually changes
  // (quotes deliberately live in QuotesContext, not here)
  /* eslint-disable react-hooks/exhaustive-deps */
  const ctx = React.useMemo(() => ({
    config: cfg,
    storage,
    symbol,
    setSymbol,
    candleSize,
    setCandleSize,
    timeframe,
    setTimeframe,
    lineType,
    setLineType,
    customLineColors,
    setCustomLineColors,
    lineUpColor,
    setLineUpColor,
    lineDownColor,
    setLineDownColor,
    showBrush,
    setShowBrush,
    showGridH,
    setShowGridH,
    showGridV,
    setShowGridV,
    denseGrid,
    setDenseGrid,
    showCrosshair,
    setShowCrosshair,
    showTooltip,
    setShowTooltip,
    showPriceDisplay,
    setShowPriceDisplay,
    stickToData,
    setStickToData,
    theme,
    setTheme,
    customThemes,
    saveCustomTheme,
    deleteCustomTheme,
    themePreview,
    setThemePreview,
    yLogScale,
    setYLogScale,
    yInvert,
    setYInvert,
    showExtendedHours,
    setShowExtendedHours,
    extHoursHighlight,
    setExtHoursHighlight,
    timezone,
    setTimezone,
    showDrawBar,
    setShowDrawBar,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    showFullTrades,
    setShowFullTrades,
    addDrawing,
    removeDrawing,
    updateDrawing,
    clearDrawings,
    removeDrawingsByColor,
    hiddenColors,
    toggleHiddenColor,
    activeStudies,
    addStudy,
    updateStudy,
    removeStudy,
    favoriteStudies,
    toggleFavorite,
    customScripts,
    providedStudies,
    saveScript,
    deleteScript,
    toggleScript,
    showScriptEditor,
    setShowScriptEditor,
    scriptEditorSelect,
    setScriptEditorSelect,
    studyEditRequest,
    setStudyEditRequest,
  }), [
    cfg, storage,
    symbol, candleSize, timeframe, lineType, customLineColors, lineUpColor, lineDownColor,
    showBrush, showGridH, showGridV,
    denseGrid, showCrosshair, showTooltip, showPriceDisplay, stickToData,
    theme, customThemes, themePreview, yLogScale, yInvert, showExtendedHours, extHoursHighlight, timezone,
    showDrawBar, drawTool, drawColor, showFullTrades, hiddenColors, activeStudies,
    favoriteStudies, customScripts, providedStudies, showScriptEditor, scriptEditorSelect, studyEditRequest,
  ]);

  const quotesCtx = React.useMemo(() => ({
    quotes, feedLoading, feedError, loadOlder, feedLoadingOlder,
  }), [quotes, feedLoading, feedError, loadOlder, feedLoadingOlder]);

  // with trade markers configured off, existing buy/sell drawings disappear
  // from the chart and every popup/count that consumes this context
  const visibleDrawings = React.useMemo(() => (
    cfg.show_trade_markers ? drawings : drawings.filter(d => !isTradeMarker(d))
  ), [drawings, cfg.show_trade_markers]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <ChartContext.Provider value={ctx}>
      <QuotesContext.Provider value={quotesCtx}>
        <DrawingsContext.Provider value={visibleDrawings}>
          {children}
        </DrawingsContext.Provider>
      </QuotesContext.Provider>
    </ChartContext.Provider>
  );
};

export default ChartProvider;

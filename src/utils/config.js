import React from 'react';
import { DEFAULT_CANDLE_SIZE, DEFAULT_TIMEFRAME } from './quotes';

// The `config` prop on ChartProvider. Keys are snake_case; every key is
// optional and falls back to the value here. `default_*` keys only apply
// when the user has no persisted value for that setting (first load, or
// persistence off) — they never override a choice the user already made.
export const DEFAULT_CONFIG = {
  // --- appearance defaults ---
  default_theme: 'default',
  default_line_type: 'candles',
  default_candle_size: DEFAULT_CANDLE_SIZE,
  default_timeframe: DEFAULT_TIMEFRAME,
  default_timezone: 'local',
  default_extended_hours: true,
  default_log_scale: false,
  default_draw_color: '#3b82f6',
  // extra CSS custom properties applied to the chart wrapper,
  // e.g. { '--green': '#00c076', '--red': '#ff3b46' }
  css_vars: null,

  // --- option lists ---
  themes_hidden: [],            // theme names to remove from the settings menu
  line_types_hidden: [],        // line type / aggregated type values to hide
  candle_sizes: null,           // replace the candle-size list, e.g. ['1d', '1w']
  timeframes: null,             // replace the timespan bar: '1M' strings, ['1M', '10m'] pairs, or { timeframe, candleSize } objects
  draw_palette: null,           // replace the color picker preset grid

  // --- feature visibility ---
  show_ticker_search_field: true,
  show_drawing_tools: true,
  show_drawing_color_filters: true,
  show_script_editor: true,
  show_studies_menu: true,
  show_views_menu: true,
  show_settings_menu: true,
  show_line_type_menu: true,
  show_candle_size_menu: true,
  show_crosshair_menu: true,
  show_timespan_bar: true,
  show_brush: true,
  show_volume: true,            // the volume underlay study
  show_trade_markers: true,     // buy/sell marker tools, drawings, and totals

  // --- studies & drawings ---
  studies_hidden: [],           // study ids to hide from the menu and the chart
  studies_default: [],          // study ids pre-added when nothing is persisted
  favorite_studies_default: [],
  draw_tools_hidden: [],        // draw tool ids to hide from the toolbar
  max_active_studies: null,     // cap on concurrently active studies

  // --- behavior ---
  persistence: true,            // true | false | custom localStorage key
  read_only: false,             // view-only: implies several show_* flags off
  max_older_loads: 3,           // backwards-pagination request cap
  tick_flush_ms: 250,           // live tick batching interval

  // --- callbacks ---
  on_ticker_change: null,       // (symbol) => void, fires on changes after mount
  on_candle_size_change: null,  // (candleSize) => void
  on_study_add: null,           // (studyDef) => void
};

const TRADE_MARKER_TYPES = ['buy_marker', 'sell_marker'];

export const isTradeMarker = (d) => TRADE_MARKER_TYPES.includes(d.type);

export const normalizeConfig = (raw) => {
  const c = { ...DEFAULT_CONFIG, ...(raw || {}) };

  // read_only = view-only embed: nothing that edits chart contents, no symbol
  // change, and no persistence (a viewer shouldn't overwrite the host's
  // saved state). Navigation/appearance menus stay available.
  if (c.read_only) {
    c.show_ticker_search_field = false;
    c.show_drawing_tools = false;
    c.show_drawing_color_filters = false;
    c.show_script_editor = false;
    c.show_studies_menu = false;
    c.show_views_menu = false;
    c.persistence = false;
  }

  // a host restricting candle_sizes without naming a default gets the first
  // entry — the built-in '1m' default may not even be in their list
  if (raw?.default_candle_size == null
      && Array.isArray(c.candle_sizes) && c.candle_sizes.length) {
    c.default_candle_size = c.candle_sizes[0];
  }

  // show_volume / show_trade_markers are sugar over the hidden lists
  if (!c.show_volume) {
    c.studies_hidden = [...c.studies_hidden, 'volume_underlay'];
  }
  if (!c.show_trade_markers) {
    c.draw_tools_hidden = [...c.draw_tools_hidden, ...TRADE_MARKER_TYPES];
  }

  return c;
};

// Structural equality for prop values passed as inline literals: arrays and
// plain objects (css_vars, timeframes pairs) compare by content, and two
// functions always count as equal — identity churn from inline callbacks must
// not invalidate the stable object, so callers read the LATEST callback
// through a ref instead of through the stabilized value.
export const sameValue = (x, y) => {
  if (Object.is(x, y)) return true;
  if (typeof x === 'function' && typeof y === 'function') return true;
  if (Array.isArray(x) && Array.isArray(y)) {
    return x.length === y.length && x.every((v, i) => sameValue(v, y[i]));
  }
  if (x && y && typeof x === 'object' && typeof y === 'object'
      && !Array.isArray(x) && !Array.isArray(y)) {
    const kx = Object.keys(x);
    return kx.length === Object.keys(y).length && kx.every(k => sameValue(x[k], y[k]));
  }
  return false;
};

// Normalize the raw config prop, keeping the previous object unless a value
// actually changed — consumers can use the result in deps/memos even when the
// caller passes an inline object literal every render.
export const useStableConfig = (raw) => {
  const prevRaw = React.useRef(null);
  const normalized = React.useRef(null);
  const a = raw || {};
  const b = prevRaw.current || {};
  const changed =
    normalized.current === null ||
    Object.keys(a).length !== Object.keys(b).length ||
    Object.keys(a).some(k => !sameValue(a[k], b[k]));
  if (changed) {
    prevRaw.current = raw;
    normalized.current = normalizeConfig(raw);
  }
  return normalized.current;
};

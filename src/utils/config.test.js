import { DEFAULT_CONFIG, normalizeConfig } from './config';

test('empty config resolves to the defaults', () => {
  expect(normalizeConfig()).toEqual(DEFAULT_CONFIG);
  expect(normalizeConfig({})).toEqual(DEFAULT_CONFIG);
});

test('read_only implies the editing surfaces off and persistence off', () => {
  const c = normalizeConfig({ read_only: true });
  expect(c.show_ticker_search_field).toBe(false);
  expect(c.show_drawing_tools).toBe(false);
  expect(c.show_drawing_color_filters).toBe(false);
  expect(c.show_script_editor).toBe(false);
  expect(c.show_studies_menu).toBe(false);
  expect(c.show_views_menu).toBe(false);
  expect(c.persistence).toBe(false);
  // navigation/appearance stays on
  expect(c.show_settings_menu).toBe(true);
  expect(c.show_timespan_bar).toBe(true);
});

test('candle_sizes without a default falls back to the first entry', () => {
  expect(normalizeConfig({ candle_sizes: ['1d', '1w'] }).default_candle_size).toBe('1d');
  // an explicit default is honored as-is
  expect(normalizeConfig({ candle_sizes: ['1d', '1w'], default_candle_size: '1w' }).default_candle_size).toBe('1w');
  // no list → built-in default untouched
  expect(normalizeConfig({}).default_candle_size).toBe(DEFAULT_CONFIG.default_candle_size);
});

test('show_volume off folds into studies_hidden', () => {
  const c = normalizeConfig({ show_volume: false, studies_hidden: ['rsi'] });
  expect(c.studies_hidden).toEqual(['rsi', 'volume_underlay']);
});

test('show_trade_markers off folds into draw_tools_hidden', () => {
  const c = normalizeConfig({ show_trade_markers: false });
  expect(c.draw_tools_hidden).toEqual(['buy_marker', 'sell_marker']);
});

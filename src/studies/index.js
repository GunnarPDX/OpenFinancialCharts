// Chart studies, split by category. Concatenated (in the original
// studies.js order) into the same exported `studies` array the app has always
// imported — resolving 'src/studies' lands here.

import { movingAveragesStudies } from './movingAverages';
import { trendStudies } from './trend';
import { oscillatorsStudies } from './oscillators';
import { momentumStudies } from './momentum';
import { volatilityStudies } from './volatility';
import { volumeStudies } from './volume';
import { moneyFlowStudies } from './moneyFlow';
import { bandsStudies } from './bands';
import { supportResistanceStudies } from './supportResistance';
import { statisticalStudies } from './statistical';
import { signalSystemsStudies } from './signalSystems';
import { comparisonStudies } from './comparison';
import { profileStudies } from './profiles';

export { maTypes, maFields } from './movingAverages';
export { yesnoColors } from './signalSystems';
// session timezone for the day/time-of-day keyed studies (VWAP, pivots,
// projected volume) — the chart sets this to the exchange's IANA zone
export { setSessionTimezone } from './math';

// original studies.js array order, kept so menu ordering is unchanged
const ORDER = [
  'moving_average',
  'adx_dms',
  'aroon_oscillator',
  'awesome_oscillator',
  'balance_of_power',
  'bull_bear_power',
  'bollinger_pct_b',
  'center_of_gravity',
  'chande_forecast',
  'chande_momentum',
  'cci',
  'coppock_curve',
  'disparity_index',
  'ease_of_movement',
  'fisher_transform',
  'elder_force',
  'elder_ray',
  'fractal_chaos_oscillator',
  'volume_oscillator',
  'volume_roc',
  'vwap',
  'volume_underlay',
  'average_true_range',
  'bb_trend',
  'bollinger_bandwidth',
  'psychological_line',
  'candle_color_ratio',
  'chaikin_volatility',
  'donchian_width',
  'gopalakrishnan_range',
  'high_minus_low',
  'mass_index',
  'relative_volatility',
  'starc_bands',
  'true_range',
  'ulcer_index',
  'accumulative_swing_index',
  'aroon',
  'choppiness_index',
  'detrended_price',
  'elder_impulse',
  'ma_cross',
  'darvas_box',
  'parabolic_sar',
  'pivot_points',
  'prime_number_bands',
  'supertrend',
  'correlation_coefficient',
  'drawdown',
  'historical_volatility',
  'linreg_r2',
  'linreg_slope',
  'prime_number_oscillator',
  'random_walk_index',
  'standard_deviation',
  'time_series_forecast',
  'valuation_lines',
  'projected_aggregate_volume',
  'projected_volume_at_time',
  'accum_dist',
  'connors_rsi',
  'chop_zone',
  'chaikin_oscillator',
  'chaikin_money_flow',
  'klinger_volume_osc',
  'market_facilitation',
  'money_flow_index',
  'negative_volume_index',
  'on_balance_volume',
  'positive_volume_index',
  'price_volume_trend',
  'trade_volume_index',
  'twiggs_money_flow',
  'beta',
  'performance_index',
  'price_relative',
  'high_low_bands',
  'highest_high',
  'ichimoku',
  'keltner_channel',
  'linreg_forecast',
  'linreg_intercept',
  'lowest_low',
  'median_price',
  'average_daily_range',
  'adx',
  'alma',
  'chande_kroll_stop',
  'ma_ribbon',
  'macd',
  'ppo',
  'multi_time_period',
  'moon_phases',
  'know_sure_thing',
  'kama',
  'gaps',
  'envelope',
  'chandelier_exit',
  'bollinger_bands',
  'donchian_channel',
  'fractal_chaos_bands',
  'guppy_mma',
  'atr_bands',
  'anchored_vwap',
  'alligator',
  'yesno_trend',
  'yesno_line',
  'yesno_oscillator',
  'momentum_oscillator',
  'pressure_trend',
  'yesno_icons',
  'volume_profile',
  'heat_profile',
  'buy_sell_profile',
  'acceptance_profile',
  'hot_zone_levels',
  'volume_display',
];

export const studies = [
  ...movingAveragesStudies,
  ...trendStudies,
  ...oscillatorsStudies,
  ...momentumStudies,
  ...volatilityStudies,
  ...volumeStudies,
  ...moneyFlowStudies,
  ...bandsStudies,
  ...supportResistanceStudies,
  ...statisticalStudies,
  ...signalSystemsStudies,
  ...comparisonStudies,
  ...profileStudies,
].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

// a study may live in one category (string) or several (array)
export const studiesByCategory = (category) =>
  studies.filter(s => Array.isArray(s.category)
    ? s.category.includes(category)
    : s.category === category);

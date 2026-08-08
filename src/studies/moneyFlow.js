// Money-flow studies — split out of studies.js; defs are verbatim.
import { sma, ema, wilders, adLine, typicalPrices } from './math';

// green bars / red bars over the trailing window — TradingView's bar-based
// "Advance/Decline Ratio (Bars)" convention (each bar's close vs its own
// open). The exchange-breadth ADR (ADVN ÷ DECL issue counts) needs market
// data the feed doesn't provide. Rolling counts, O(n).
const adRatioPoints = (series, length) => {
  const n = Math.max(1, Math.round(length));
  const points = [];
  let adv = 0, dec = 0;
  for (let i = 0; i < series.length; i++) {
    if (series[i].close > series[i].open) adv++;
    else if (series[i].close < series[i].open) dec++;
    const j = i - n; // bar leaving the window
    if (j >= 0) {
      if (series[j].close > series[j].open) adv--;
      else if (series[j].close < series[j].open) dec--;
    }
    if (i < n - 1) continue;
    // a window with no red bars has no ratio — emit a gap (like
    // TradingView's na) rather than a clamped spike
    if (dec > 0) points.push({ date: series[i].date, rank: series[i].rank, value: adv / dec });
  }
  return points;
};

export const moneyFlowStudies = [
  {
    id: 'ease_of_movement',
    name: 'Ease Of Movement',
    category: 'Money Flow',
    color: '#5eead4',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'How far price moves per unit of volume: midpoint change divided by a volume/range box ratio, smoothed. Large positive values mean price rises easily on light volume.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const raw = series.map((d, i) => {
        if (i === 0 || d.high === d.low || !d.volume) return 0;
        const move = (d.high + d.low) / 2 - (series[i - 1].high + series[i - 1].low) / 2;
        const box = (d.volume / 100000000) / (d.high - d.low);
        return box > 0 ? move / box : 0;
      });
      const line = sma(raw, n);
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(line[i])) points.push({ date: d.date, rank: d.rank, value: line[i] });
      });
      return points;
    },
  },
  {
    id: 'elder_force',
    name: 'Elder Force Index',
    category: 'Money Flow',
    color: '#4ade80',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 13, height: 70 },
    info: 'Price change times volume, EMA-smoothed — the force behind each move. Positive force confirms buyers in control; spikes flag conviction.',
    compute: (series, { length = 13 } = {}) => {
      const n = Math.max(1, Math.round(length));
      const raw = series.map((d, i) => (i === 0 ? 0 : (d.close - series[i - 1].close) * (d.volume || 0)));
      const line = ema(raw, n);
      const points = [];
      series.forEach((d, i) => {
        if (i > 0 && isFinite(line[i])) points.push({ date: d.date, rank: d.rank, value: line[i] });
      });
      return points;
    },
  },
  {
    id: 'candle_color_ratio',
    name: 'Candle Color Ratio',
    category: 'Money Flow',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'bars',
    paneRef: 1,
    fields: ['length'],
    params: { length: 9, height: 70 },
    info: 'Green candles (closed above their open) divided by red candles over the trailing period, as columns around parity: green above 1 (bulls dominating, darker when fading), red below 1 (bears dominating, darker when recovering).',
    compute: (series, { length = 9 } = {}) => adRatioPoints(series, length),
  },
  {
    id: 'accum_dist',
    name: 'Accumulation/Distribution',
    category: 'Money Flow',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'Cumulative volume weighted by where each close lands in its bar range — rising while price stalls hints at quiet accumulation, falling at distribution.',
    compute: (series) =>
      adLine(series).map((v, i) => ({ date: series[i].date, rank: series[i].rank, value: v })),
  },
  {
    id: 'chaikin_oscillator',
    name: 'Chaikin Oscillator',
    category: 'Money Flow',
    color: '#EC407A',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: ['color'],
    // TradingView's Fast/Slow Length inputs, fixed at their canonical 3/10 —
    // the study editor has no second period field
    params: { fast: 3, slow: 10, height: 70 },
    info: "EMA(3) minus EMA(10) of the Accumulation/Distribution line — momentum of money flow. Crossing above zero signals accumulation pressure, below zero distribution.",
    compute: (series, { fast = 3, slow = 10 } = {}) => {
      const adline = adLine(series);
      const f = ema(adline, Math.max(1, Math.round(fast)));
      const s = ema(adline, Math.max(1, Math.round(slow)));
      const points = [];
      series.forEach((d, i) => {
        if (isFinite(f[i]) && isFinite(s[i])) points.push({ date: d.date, rank: d.rank, value: f[i] - s[i] });
      });
      return points;
    },
  },
  {
    id: 'chaikin_money_flow',
    name: 'Chaikin Money Flow',
    category: 'Money Flow',
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 20, height: 70 },
    info: 'Money-flow volume summed over the period, divided by total volume (-1 to +1): sustained positive readings mean closes keep landing in the upper part of their ranges on good volume.',
    compute: (series, { length = 20 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const mfv = series.map(d => {
        const range = d.high - d.low;
        return range > 0 ? (((d.close - d.low) - (d.high - d.close)) / range) * (d.volume || 0) : 0;
      });
      const points = [];
      let sm = 0, sv = 0, traded = 0; // rolling sums + count of volume bars
      series.forEach((d, i) => {
        sm += mfv[i];
        sv += d.volume || 0;
        if (d.volume > 0) traded++;
        const j = i - n;
        if (j >= 0) {
          sm -= mfv[j];
          sv -= series[j].volume || 0;
          if (series[j].volume > 0) traded--;
        }
        if (i < n - 1) return;
        // `traded` guards the all-zero-volume window exactly, immune to
        // rolled-sum float residue
        if (traded > 0 && sv > 0) points.push({ date: d.date, rank: d.rank, value: sm / sv });
      });
      return points;
    },
  },
  {
    id: 'klinger_volume_osc',
    name: 'Klinger Volume Oscillator',
    category: 'Money Flow',
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 0,
    fields: [],
    params: { height: 70 },
    info: 'Volume force (volume signed by trend and scaled by range position) filtered through 34- and 55-period EMAs, with a 13-period signal line — long-horizon money flow around zero.',
    lines: [
      { key: 'kvo', color: '#38bdf8', label: 'KVO' },
      { key: 'signal', color: '#f97316', width: 1, label: 'Signal — EMA 13' },
    ],
    legend: [
      { color: '#38bdf8', label: 'KVO' },
      { color: '#f97316', label: 'Signal — EMA 13' },
    ],
    compute: (series) => {
      if (series.length < 2) return [];
      const vf = [0];
      let trend = 0, cm = 0, prevDm = series[0].high - series[0].low;
      for (let i = 1; i < series.length; i++) {
        const d = series[i], pd = series[i - 1];
        const t = (d.high + d.low + d.close) > (pd.high + pd.low + pd.close) ? 1 : -1;
        const dm = d.high - d.low;
        cm = t === trend ? cm + dm : prevDm + dm;
        trend = t;
        prevDm = dm;
        vf.push(cm > 0 ? (d.volume || 0) * Math.abs(2 * (dm / cm) - 1) * t * 100 : 0);
      }
      const kvoFast = ema(vf, 34);
      const kvoSlow = ema(vf, 55);
      const kvoArr = vf.map((_, i) => kvoFast[i] - kvoSlow[i]);
      const signal = ema(kvoArr, 13);
      const points = [];
      series.forEach((d, i) => {
        if (i < 55) return;
        points.push({ date: d.date, rank: d.rank, value: kvoArr[i], line: 'kvo' });
        points.push({ date: d.date, rank: d.rank, value: signal[i], line: 'signal' });
      });
      return points;
    },
  },
  {
    id: 'market_facilitation',
    name: 'Market Facilitation Index',
    category: ['Money Flow', 'Volume'],
    color: '#fbbf24',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: "Bill Williams' MFI: bar range per unit of volume (scaled per million shares) — how efficiently volume moves price. Rising efficiency with rising volume confirms genuine moves.",
    // zero-volume bars have no reading: they are omitted so their ranks skip —
    // the codebase's gap convention (renderers split segments on rank skips,
    // e.g. studySegments / adRatioPoints) — rather than bridged with a value
    compute: (series) => series
      .filter(d => d.volume > 0)
      .map(d => ({
        date: d.date,
        rank: d.rank,
        value: ((d.high - d.low) / d.volume) * 1e6,
      })),
  },
  {
    id: 'money_flow_index',
    name: 'Money Flow Index',
    category: 'Money Flow',
    color: '#c084fc',
    renderAs: 'pane',
    paneStyle: 'line',
    paneRef: 50,
    fields: ['color', 'length'],
    params: { length: 14, height: 70 },
    info: 'A volume-weighted RSI (0–100): positive vs negative typical-price money flow over the period. Above 80 reads overbought, below 20 oversold.',
    compute: (series, { length = 14 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const tp = typicalPrices(series);
      // signed money flow per bar, rolled over the window
      const posF = [0], negF = [0];
      for (let k = 1; k < series.length; k++) {
        const flow = tp[k] * (series[k].volume || 0);
        posF.push(tp[k] > tp[k - 1] ? flow : 0);
        negF.push(tp[k] < tp[k - 1] ? flow : 0);
      }
      const points = [];
      let pos = 0, neg = 0, flows = 0; // rolling sums + count of nonzero flows
      series.forEach((d, i) => {
        pos += posF[i];
        neg += negF[i];
        if (posF[i] > 0 || negF[i] > 0) flows++;
        const j = i - n;
        if (j >= 0) {
          pos -= posF[j];
          neg -= negF[j];
          if (posF[j] > 0 || negF[j] > 0) flows--;
        }
        if (i < n) return;
        // `flows` guards the no-flow window exactly, immune to rolled-sum
        // float residue
        if (flows > 0 && pos + neg > 0) {
          const v = (100 * pos) / (pos + neg);
          points.push({ date: d.date, rank: d.rank, value: Math.max(0, Math.min(100, v)) });
        }
      });
      return points;
    },
  },
  {
    id: 'negative_volume_index',
    name: 'Negative Volume Index',
    category: 'Money Flow',
    color: '#f472b6',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'A cumulative index (from 1000) that only moves on bars where volume fell — tracking what the "smart money" does on quiet days.',
    compute: (series) => {
      let nvi = 1000;
      const points = [];
      series.forEach((d, i) => {
        if (i > 0 && (d.volume || 0) < (series[i - 1].volume || 0) && series[i - 1].close) {
          nvi *= 1 + (d.close - series[i - 1].close) / series[i - 1].close;
        }
        points.push({ date: d.date, rank: d.rank, value: nvi });
      });
      return points;
    },
  },
  {
    id: 'on_balance_volume',
    name: 'On Balance Volume',
    category: ['Money Flow', 'Volume'],
    color: '#38bdf8',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'Cumulative volume, added on up closes and subtracted on down closes — the classic confirmation line: OBV should make new highs with price.',
    compute: (series) => {
      let obv = 0;
      const points = [];
      series.forEach((d, i) => {
        if (i > 0) {
          if (d.close > series[i - 1].close) obv += d.volume || 0;
          else if (d.close < series[i - 1].close) obv -= d.volume || 0;
        }
        points.push({ date: d.date, rank: d.rank, value: obv });
      });
      return points;
    },
  },
  {
    id: 'positive_volume_index',
    name: 'Positive Volume Index',
    category: 'Money Flow',
    color: '#4ade80',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: "A cumulative index (from 1000) that only moves on bars where volume rose — tracking the crowd's behavior on busy days.",
    compute: (series) => {
      let pvi = 1000;
      const points = [];
      series.forEach((d, i) => {
        if (i > 0 && (d.volume || 0) > (series[i - 1].volume || 0) && series[i - 1].close) {
          pvi *= 1 + (d.close - series[i - 1].close) / series[i - 1].close;
        }
        points.push({ date: d.date, rank: d.rank, value: pvi });
      });
      return points;
    },
  },
  {
    id: 'price_volume_trend',
    name: 'Price Volume Trend',
    category: 'Money Flow',
    color: '#5eead4',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'Like OBV but proportional: each bar adds volume scaled by its percent price change, so big moves on big volume dominate the cumulative line.',
    compute: (series) => {
      let pvt = 0;
      const points = [];
      series.forEach((d, i) => {
        if (i > 0 && series[i - 1].close) {
          pvt += (d.volume || 0) * ((d.close - series[i - 1].close) / series[i - 1].close);
        }
        points.push({ date: d.date, rank: d.rank, value: pvt });
      });
      return points;
    },
  },
  {
    id: 'trade_volume_index',
    name: 'Trade Volume Index',
    category: 'Money Flow',
    color: '#a78bda',
    renderAs: 'pane',
    paneStyle: 'line',
    fields: ['color'],
    params: { height: 70 },
    info: 'Cumulative volume signed by tick direction: accumulate on upticks, distribute on downticks, carrying the last direction through unchanged prices (0.01 minimum tick).',
    compute: (series) => {
      const MIN_TICK = 0.01;
      let tvi = 0, dir = 1;
      const points = [];
      series.forEach((d, i) => {
        if (i > 0) {
          const ch = d.close - series[i - 1].close;
          if (ch > MIN_TICK) dir = 1;
          else if (ch < -MIN_TICK) dir = -1;
          tvi += dir * (d.volume || 0);
        }
        points.push({ date: d.date, rank: d.rank, value: tvi });
      });
      return points;
    },
  },
  {
    id: 'twiggs_money_flow',
    name: 'Twiggs Money Flow',
    category: ['Money Flow', 'Volume'],
    color: '#34d399',
    renderAs: 'pane',
    paneStyle: 'baseline',
    paneRef: 0,
    fields: ['color', 'length'],
    params: { length: 21, height: 70 },
    info: "Colin Twiggs' refinement of Chaikin Money Flow: true-range-adjusted money-flow volume with Wilder smoothing instead of a hard window — less jumpy, fewer whipsaws.",
    compute: (series, { length = 21 } = {}) => {
      const n = Math.max(2, Math.round(length));
      const ad = series.map((d, i) => {
        const pc = i > 0 ? series[i - 1].close : d.close;
        const trh = Math.max(d.high, pc);
        const trl = Math.min(d.low, pc);
        const range = trh - trl;
        return range > 0 ? (((d.close - trl) - (trh - d.close)) / range) * (d.volume || 0) : 0;
      });
      const vols = series.map(d => d.volume || 0);
      const sAD = wilders(ad, n);
      const sV = wilders(vols, n);
      const points = [];
      series.forEach((d, i) => {
        if (i < n || !isFinite(sAD[i]) || !(sV[i] > 0)) return;
        points.push({ date: d.date, rank: d.rank, value: sAD[i] / sV[i] });
      });
      return points;
    },
  },
];

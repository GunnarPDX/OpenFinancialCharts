// Public package entry. Everything a consuming app needs:
//
//   import { AdvancedChart } from 'open-financial-charts';
//   import 'open-financial-charts/dist/styles.css';
//
//   <AdvancedChart dataFeed={myFeed} priceSocket={mySocket} />
//
// or, composed from the underlying pieces (chrome-less plots, host
// components placed around the chart):
//
//   <ChartProvider dataFeed={myFeed} priceSocket={mySocket}>
//     <AdvancedChartWrapper><Chart/></AdvancedChartWrapper>
//   </ChartProvider>

export { default as AdvancedChart } from './components/AdvancedChart';
export { default as ChartProvider, useChartProvider, useQuotes } from './components/ChartContext';
export { default as AdvancedChartWrapper } from './components/AdvancedChartWrapper';
export { default as Chart } from './components/ChartSizeWrapper';

// helpers for writing a data feed / live-tick handling
export {
  DEFAULT_CANDLE_SIZE,
  DEFAULT_TIMEFRAME,
  candleSizeToMs,
  applyTick,
  applyTicks,
  normalizeQuotes,
  minutesInNY,
} from './utils/quotes';

// valid values for the chart's lineType setting, for consumers building their
// own line-type pickers
export { lineTypes, aggregatedTypes } from './components/ChartMainLine';

// every config key with its default, for consumers building config objects
export { DEFAULT_CONFIG } from './utils/config';

// study definitions, for consumers filling studies_hidden / studies_default
export { studies } from './studies';

import ChartProvider from './ChartContext';
import AdvancedChartWrapper from './AdvancedChartWrapper';
import Chart from './ChartSizeWrapper';

// Convenience component for the common case: the full provider + chrome +
// chart stack as a single import. All props except `children` pass through
// to ChartProvider (dataFeed, priceSocket, ticker, config, customStudies);
// children render inside the provider, above the chart.
//
//   <AdvancedChart dataFeed={myFeed} />
//
// Apps that need a different arrangement (chrome-less plots, host components
// beside or below the chart) compose ChartProvider / AdvancedChartWrapper /
// Chart directly — this wrapper is sugar, not a replacement.
const AdvancedChart = ({ children, ...providerProps }) => (
  <ChartProvider {...providerProps}>
    {children}
    <AdvancedChartWrapper>
      <Chart />
    </AdvancedChartWrapper>
  </ChartProvider>
);

export default AdvancedChart;

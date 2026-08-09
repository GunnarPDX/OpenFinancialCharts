import { render, fireEvent } from '@testing-library/react';
import ChartProvider, { useChartProvider } from '../ChartContext';
import TimespanBar from './TimespanBar';

// pending-forever fetch: nothing below consumes bars, and an unresolved
// promise can't fire post-test state updates (the act() warning source)
const makeFeed = () => ({
  name: 'stub',
  fetchOHLC: jest.fn(() => new Promise(() => {})),
});

const Probe = () => {
  const { timeframe, candleSize } = useChartProvider();
  return <span data-testid="probe">{`${timeframe}|${candleSize}`}</span>;
};

beforeEach(() => localStorage.clear());

test('config.timeframes accepts object, pair, and string entries', () => {
  const { getByText, getByTestId } = render(
    <ChartProvider dataFeed={makeFeed()} config={{
      timeframes: [
        { timeframe: '1M', candleSize: '1d' },
        { timeframe: '1Y' },       // no candleSize: built-in default ('1h')
        ['3M', '30m'],
        '1W',                      // built-in default ('5m')
      ],
    }}>
      <TimespanBar />
      <Probe />
    </ChartProvider>
  );
  fireEvent.click(getByText('1M'));
  expect(getByTestId('probe').textContent).toBe('1M|1d');
  fireEvent.click(getByText('1Y'));
  expect(getByTestId('probe').textContent).toBe('1Y|1h');
  fireEvent.click(getByText('3M'));
  expect(getByTestId('probe').textContent).toBe('3M|30m');
  fireEvent.click(getByText('1W'));
  expect(getByTestId('probe').textContent).toBe('1W|5m');
});

test('a restricted candle_sizes list vetoes the auto-picked size', () => {
  const { getByText, getByTestId } = render(
    <ChartProvider dataFeed={makeFeed()} config={{
      candle_sizes: ['1d', '1w'],
      timeframes: [{ timeframe: '1Y', candleSize: '1h' }],
    }}>
      <TimespanBar />
      <Probe />
    </ChartProvider>
  );
  fireEvent.click(getByText('1Y'));
  // timeframe switches, but '1h' is outside candle_sizes so the size stays
  expect(getByTestId('probe').textContent).toBe('1Y|1d');
});

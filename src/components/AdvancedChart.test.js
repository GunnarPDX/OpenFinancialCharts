import { render } from '@testing-library/react';
import AdvancedChart from './AdvancedChart';
import { useChartProvider } from './ChartContext';

// pending-forever fetch: nothing below consumes bars, and an unresolved
// promise can't fire post-test state updates (the act() warning source)
const makeFeed = () => ({
  name: 'stub',
  fetchOHLC: jest.fn(() => new Promise(() => {})),
});

beforeEach(() => localStorage.clear());

test('renders the full chart stack from a single component', () => {
  const { container } = render(<AdvancedChart dataFeed={makeFeed()} />);
  expect(container.querySelector('.ofc-base-content-wrapper')).not.toBeNull();
});

test('passes provider props through and renders children inside the provider', () => {
  const Probe = () => <span data-testid="sym">{useChartProvider().symbol}</span>;
  const { getByTestId } = render(
    <AdvancedChart dataFeed={makeFeed()} ticker="TSLA">
      <Probe />
    </AdvancedChart>
  );
  expect(getByTestId('sym').textContent).toBe('TSLA');
});

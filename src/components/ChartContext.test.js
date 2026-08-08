import { render, waitFor, act } from '@testing-library/react';
import ChartProvider, { useChartProvider, useDrawings } from './ChartContext';

// pending-forever fetch: no test below consumes bars, and an unresolved
// promise can't fire post-test state updates (the act() warning source)
const makeFeed = () => ({
  name: 'stub',
  fetchOHLC: jest.fn(() => new Promise(() => {})),
});

const ShowSymbol = () => <span data-testid="sym">{useChartProvider().symbol}</span>;

beforeEach(() => localStorage.clear());

test('ticker prop sets the initial symbol and drives the first fetch', async () => {
  const feed = makeFeed();
  const { getByTestId } = render(
    <ChartProvider dataFeed={feed} ticker="TSLA">
      <ShowSymbol />
    </ChartProvider>
  );
  expect(getByTestId('sym').textContent).toBe('TSLA');
  await waitFor(() => expect(feed.fetchOHLC).toHaveBeenCalled());
  expect(feed.fetchOHLC.mock.calls[0][0].ticker).toBe('TSLA');
});

test('ticker prop overrides a persisted symbol', () => {
  localStorage.setItem('ofc-chart-state', JSON.stringify({ symbol: 'MSFT' }));
  const { getByTestId } = render(
    <ChartProvider dataFeed={makeFeed()} ticker="NVDA">
      <ShowSymbol />
    </ChartProvider>
  );
  expect(getByTestId('sym').textContent).toBe('NVDA');
});

test('without a ticker prop the persisted symbol still wins', () => {
  localStorage.setItem('ofc-chart-state', JSON.stringify({ symbol: 'MSFT' }));
  const { getByTestId } = render(
    <ChartProvider dataFeed={makeFeed()}>
      <ShowSymbol />
    </ChartProvider>
  );
  expect(getByTestId('sym').textContent).toBe('MSFT');
});

const Probe = ({ pick, testId = 'probe' }) => (
  <span data-testid={testId}>{JSON.stringify(pick(useChartProvider()))}</span>
);

describe('config prop', () => {
  test('default_* apply when nothing is persisted', () => {
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{
        default_theme: 'black',
        default_line_type: 'area',
        default_candle_size: '1d',
        default_timeframe: '1Y',
        default_log_scale: true,
      }}>
        <Probe pick={c => [c.theme, c.lineType, c.candleSize, c.timeframe, c.yLogScale]} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toEqual(['black', 'area', '1d', '1Y', true]);
  });

  test('default_* never override persisted user choices', () => {
    localStorage.setItem('ofc-chart-state', JSON.stringify({ theme: 'soft', lineType: 'bars' }));
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ default_theme: 'black', default_line_type: 'area' }}>
        <Probe pick={c => [c.theme, c.lineType]} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toEqual(['soft', 'bars']);
  });

  test('candle_sizes: first entry becomes the default; persisted sizes outside the list are clamped', () => {
    const { getByTestId, unmount } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ candle_sizes: ['1d', '1w'] }}>
        <Probe pick={c => c.candleSize} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toBe('1d');
    unmount();

    // a persisted size that the (new) list doesn't allow falls back too
    localStorage.setItem('ofc-chart-state', JSON.stringify({ candleSize: '1m' }));
    const second = render(
      <ChartProvider dataFeed={makeFeed()} config={{ candle_sizes: ['1d', '1w'] }}>
        <Probe pick={c => c.candleSize} />
      </ChartProvider>
    );
    expect(JSON.parse(second.getByTestId('probe').textContent)).toBe('1d');
    second.unmount();

    // a persisted size inside the list still wins
    localStorage.setItem('ofc-chart-state', JSON.stringify({ candleSize: '1w' }));
    const third = render(
      <ChartProvider dataFeed={makeFeed()} config={{ candle_sizes: ['1d', '1w'] }}>
        <Probe pick={c => c.candleSize} />
      </ChartProvider>
    );
    expect(JSON.parse(third.getByTestId('probe').textContent)).toBe('1w');
  });

  test('persistence: custom key reads and writes that key only', () => {
    localStorage.setItem('ofc-chart-state', JSON.stringify({ symbol: 'MSFT' }));
    localStorage.setItem('my-chart', JSON.stringify({ symbol: 'AMD' }));
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ persistence: 'my-chart' }}>
        <ShowSymbol />
      </ChartProvider>
    );
    expect(getByTestId('sym').textContent).toBe('AMD');
  });

  test('persistence: false ignores persisted state', () => {
    localStorage.setItem('ofc-chart-state', JSON.stringify({ symbol: 'MSFT', theme: 'warm' }));
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ persistence: false }}>
        <Probe pick={c => [c.symbol, c.theme]} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toEqual(['AAPL', 'default']);
  });

  test('studies_default seeds only a fresh chart; studies_hidden filters persisted studies', () => {
    const first = render(
      <ChartProvider dataFeed={makeFeed()} config={{ studies_default: ['vwap'] }}>
        <Probe pick={c => c.activeStudies.map(s => s.id)} />
      </ChartProvider>
    );
    expect(JSON.parse(first.getByTestId('probe').textContent)).toEqual(['vwap']);
    first.unmount();

    localStorage.setItem('ofc-chart-state', JSON.stringify({
      activeStudies: [{ key: 1, id: 'vwap', params: {} }, { key: 2, id: 'volume_underlay', params: {} }],
    }));
    const second = render(
      <ChartProvider dataFeed={makeFeed()} config={{ studies_default: ['cci'], show_volume: false }}>
        <Probe pick={c => c.activeStudies.map(s => s.id)} />
      </ChartProvider>
    );
    // persisted state wins over studies_default; hidden volume study dropped
    expect(JSON.parse(second.getByTestId('probe').textContent)).toEqual(['vwap']);
  });

  test('max_active_studies caps addStudy and on_study_add fires per add', () => {
    const added = [];
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    render(
      <ChartProvider dataFeed={makeFeed()} config={{ max_active_studies: 1, on_study_add: d => added.push(d.id) }}>
        <Grab />
      </ChartProvider>
    );
    act(() => ctx.addStudy({ id: 'vwap', params: {} }));
    act(() => ctx.addStudy({ id: 'cci', params: {} }));
    expect(ctx.activeStudies.map(s => s.id)).toEqual(['vwap']);
    expect(added).toEqual(['vwap']);
  });

  test('on_ticker_change fires on changes, not on mount', () => {
    const changes = [];
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    render(
      <ChartProvider dataFeed={makeFeed()} ticker="TSLA" config={{ on_ticker_change: s => changes.push(s) }}>
        <Grab />
      </ChartProvider>
    );
    expect(changes).toEqual([]);
    act(() => ctx.setSymbol('NVDA'));
    expect(changes).toEqual(['NVDA']);
  });

  test('read_only forces the brush-independent effective flags through context', () => {
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ read_only: true }}>
        <Probe pick={c => [c.config.show_drawing_tools, c.showDrawBar, c.config.persistence]} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toEqual([false, false, false]);
  });

  test('show_brush: false forces the effective brush off despite persisted true', () => {
    localStorage.setItem('ofc-chart-state', JSON.stringify({ showBrush: true }));
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ show_brush: false }}>
        <Probe pick={c => c.showBrush} />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('probe').textContent)).toBe(false);
  });

  test('config object identity survives re-renders with inline callbacks and css_vars', () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    const ui = () => (
      // fresh inline literals (incl. a function and a nested object) every render
      <ChartProvider dataFeed={makeFeed()} config={{
        on_ticker_change: (s) => s,
        css_vars: { '--green': '#0f0' },
        themes_hidden: ['ash'],
      }}>
        <Grab />
      </ChartProvider>
    );
    const r = render(ui());
    const first = ctx.config;
    r.rerender(ui());
    expect(ctx.config).toBe(first);
  });

  test('change callbacks always call the latest inline closure', () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    const calls = [];
    const ui = (tag) => (
      <ChartProvider dataFeed={makeFeed()} config={{ on_ticker_change: (s) => calls.push([tag, s]) }}>
        <Grab />
      </ChartProvider>
    );
    const r = render(ui('old'));
    r.rerender(ui('new'));
    act(() => ctx.setSymbol('NVDA'));
    expect(calls).toEqual([['new', 'NVDA']]);
  });

  test('custom themes: save, select, rename-safe delete falls back to default', () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    render(
      <ChartProvider dataFeed={makeFeed()}>
        <Grab />
      </ChartProvider>
    );
    act(() => ctx.saveCustomTheme({ name: 'Neon', vars: { '--background': '#000', '--green': '#0f0' } }));
    act(() => ctx.setTheme('custom:Neon'));
    expect(ctx.customThemes).toHaveLength(1);
    expect(ctx.theme).toBe('custom:Neon');

    // updating an existing name replaces, not duplicates
    act(() => ctx.saveCustomTheme({ name: 'Neon', vars: { '--background': '#111' } }));
    expect(ctx.customThemes).toHaveLength(1);
    expect(ctx.customThemes[0].vars['--background']).toBe('#111');

    act(() => ctx.deleteCustomTheme('Neon'));
    expect(ctx.customThemes).toHaveLength(0);
    expect(ctx.theme).toBe('default');
  });

  test('custom themes persist and reload', async () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    const first = render(
      <ChartProvider dataFeed={makeFeed()}>
        <Grab />
      </ChartProvider>
    );
    act(() => ctx.saveCustomTheme({ name: 'Neon', vars: { '--background': '#000' } }));
    act(() => ctx.setTheme('custom:Neon'));
    // storage debounces writes; wait for the flush
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('ofc-chart-state') || '{}');
      expect(saved.customThemes).toEqual([{ name: 'Neon', vars: { '--background': '#000' } }]);
      expect(saved.theme).toBe('custom:Neon');
    });
    first.unmount();

    const second = render(
      <ChartProvider dataFeed={makeFeed()}>
        <Probe pick={c => [c.theme, c.customThemes[0]?.name]} />
      </ChartProvider>
    );
    expect(JSON.parse(second.getByTestId('probe').textContent)).toEqual(['custom:Neon', 'Neon']);
  });

  test('customStudies prop exposes provided studies; toggle and recolor route to provided state', async () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    const studiesProp = [{ name: 'My Lib Study', source: 'study("x", overlay=true)\nplot(close)' }];
    render(
      <ChartProvider dataFeed={makeFeed()} customStudies={studiesProp}>
        <Grab />
      </ChartProvider>
    );
    // id derived from the name; disabled until toggled; marked provided
    expect(ctx.providedStudies).toHaveLength(1);
    const s = ctx.providedStudies[0];
    expect(s.id).toBe('my_lib_study');
    expect(s.provided).toBe(true);
    expect(s.enabled).toBe(false);

    act(() => ctx.toggleScript('my_lib_study'));
    expect(ctx.providedStudies[0].enabled).toBe(true);
    act(() => ctx.saveScript({ id: 'my_lib_study', lineColors: { p1: '#fff' } }));
    expect(ctx.providedStudies[0].lineColors).toEqual({ p1: '#fff' });
    // neither write leaked into the user's script library
    expect(ctx.customScripts).toHaveLength(0);

    // enabled/recolor state persists under providedStudyState
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('ofc-chart-state') || '{}');
      expect(saved.providedStudyState.my_lib_study.enabled).toBe(true);
    });
  });

  test('customStudies icon param (React element) passes through without breaking stabilization', () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    const icon = <svg data-testid="lib-icon" />;
    render(
      <ChartProvider
        dataFeed={makeFeed()}
        customStudies={[{ id: 'lib_i', name: 'Iconed', source: 's', icon }]}
      >
        <Grab />
      </ChartProvider>
    );
    expect(ctx.providedStudies[0].icon).toBe(icon);
  });

  test('studies_hidden also hides provided studies', () => {
    let ctx;
    const Grab = () => { ctx = useChartProvider(); return null; };
    render(
      <ChartProvider
        dataFeed={makeFeed()}
        customStudies={[{ id: 'lib_a', name: 'A', source: 's' }, { id: 'lib_b', name: 'B', source: 's' }]}
        config={{ studies_hidden: ['lib_a'] }}
      >
        <Grab />
      </ChartProvider>
    );
    expect(ctx.providedStudies.map(s => s.id)).toEqual(['lib_b']);
  });

  test('show_trade_markers: false filters trade drawings from the drawings context', () => {
    localStorage.setItem('ofc-chart-state', JSON.stringify({
      drawings: [
        { id: 1, type: 'level', p: 10 },
        { id: 2, type: 'buy_marker', t: 1, p: 10 },
        { id: 3, type: 'sell_marker', t: 2, p: 12 },
      ],
    }));
    const Drawn = () => <span data-testid="drawn">{JSON.stringify(useDrawings().map(d => d.type))}</span>;
    const { getByTestId } = render(
      <ChartProvider dataFeed={makeFeed()} config={{ show_trade_markers: false }}>
        <Drawn />
      </ChartProvider>
    );
    expect(JSON.parse(getByTestId('drawn').textContent)).toEqual(['level']);
  });
});

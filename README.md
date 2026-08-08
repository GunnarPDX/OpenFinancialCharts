# open-financial-charts

An advanced financial charting component for React. Candlesticks and a dozen
other line types, technical studies, drawing tools, a built-in script editor,
zoom/pan, live tick updates — driven entirely by a data feed **you** provide,
so it works with any market-data API.

**[Live demo →](https://gunnarpdx.github.io/OpenFinancialCharts/)** — the full
chart running on simulated ticker data (the bundled sample series replayed
with a random-walk live stream), so you can try every feature without an API
key.

The scripting language (editor studies, strategies, conformance-tested
backend runtimes) lives in its own package,
[`theta-script`](https://www.npmjs.com/package/theta-script), consumed as a
regular npm dependency — see [Custom scripting](#custom-scripting-theta-script).

## Installation

```sh
npm install open-financial-charts
```

`react >= 17` and `react-dom >= 17` are peer dependencies — your app provides
them.

## Quick start

```jsx
import { ChartProvider, AdvancedChartWrapper, Chart } from 'open-financial-charts';
import 'open-financial-charts/dist/styles.css';

import { myDataFeed } from './myDataFeed';

function App() {
  return (
    <div style={{ height: 600 }}>
      <ChartProvider dataFeed={myDataFeed}>
        <AdvancedChartWrapper>
          <Chart />
        </AdvancedChartWrapper>
      </ChartProvider>
    </div>
  );
}
```

The chart fills its parent, so give the wrapping element a height.

Don't forget the stylesheet import — without it the chart renders unstyled.

## Writing a data feed

The chart never talks to a market-data provider directly. You pass it a small
object implementing the `DataFeed` interface, and it calls `fetchOHLC`
whenever the symbol, candle size, or timeframe changes (and again with
`endDate` set when the user pans back for older history).

```js
// DataFeed interface
{
  name: string,
  fetchOHLC({ ticker, candleSize, timeframe, endDate }) => Promise<Bar[]>
}

// Bar — what fetchOHLC resolves to (any order; the chart sorts):
{
  date: Date,      // candle open time
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
}
```

- `ticker` — the symbol the user selected (e.g. `'AAPL'`).
- `candleSize` / `timeframe` — feed-defined strings (defaults `'1m'` / `'2D'`);
  the chart passes through whatever the user picked in the UI, so interpret
  them however your API expects.
- `endDate` — only set for backwards pagination: return the chunk of bars
  ending at that date. If you don't support paging, ignore it and return the
  same data; the chart dedupes and marks the feed exhausted.

### Example: REST API feed

```js
// myDataFeed.js
export const myDataFeed = {
  name: 'my-api',
  fetchOHLC: async ({ ticker, candleSize, timeframe, endDate }) => {
    const params = new URLSearchParams({ symbol: ticker, interval: candleSize, range: timeframe });
    if (endDate) params.set('end', endDate.toISOString());

    const res = await fetch(`https://api.example.com/ohlc?${params}`);
    if (!res.ok) throw new Error(`OHLC request failed: ${res.status}`);
    const rows = await res.json();

    return rows.map(r => ({
      date: new Date(r.timestamp),
      open: +r.open,
      high: +r.high,
      low: +r.low,
      close: +r.close,
      volume: +r.volume,
    }));
  },
};
```

Errors thrown from `fetchOHLC` are caught and shown in the chart's
placeholder area.

### Example: static/test data

```js
const staticFeed = {
  name: 'static',
  fetchOHLC: async () => myBarArray,   // Bar[] as above
};
```

## Live prices (optional)

For streaming updates, pass a second object implementing the `PriceSocket`
interface. The chart extends the current candle with each tick and opens a
new candle when the interval rolls over.

```js
// PriceSocket interface
{
  name: string,
  subscribe(ticker, onTick) => unsubscribe   // returns a cleanup function
}

// Tick — what you pass to onTick:
{
  price: number,
  time: Date,
  volume: number   // CUMULATIVE session volume as of this tick
                   // (the chart diffs consecutive ticks itself)
}
```

### Example: WebSocket price socket

```js
// myPriceSocket.js
export const myPriceSocket = {
  name: 'my-stream',
  subscribe: (ticker, onTick) => {
    const ws = new WebSocket(`wss://stream.example.com/trades?symbol=${ticker}`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      onTick({
        price: +msg.price,
        time: new Date(msg.time),
        volume: +msg.sessionVolume,
      });
    };
    return () => ws.close();
  },
};
```

```jsx
<ChartProvider dataFeed={myDataFeed} priceSocket={myPriceSocket}>
  <AdvancedChartWrapper>
    <Chart />
  </AdvancedChartWrapper>
</ChartProvider>
```

Ticks may arrive at any rate — the chart batches them internally (≤4
re-renders/sec).

## API

### Components

| Export | Role |
|---|---|
| `ChartProvider` | Context provider holding all chart state. Props below. Must wrap the others. |
| `AdvancedChartWrapper` | Full chrome: control bar, drawing toolbar, script editor, timespan bar. |
| `Chart` | The chart surface itself; sizes to its parent. |

### ChartProvider props

| Prop | Type | Description |
|---|---|---|
| `dataFeed` | `DataFeed` | Historical OHLC source — see [Writing a data feed](#writing-a-data-feed). |
| `priceSocket` | `PriceSocket` | Optional live tick source — see [Live prices](#live-prices-optional). |
| `ticker` | `string` | Optional initial symbol. Overrides the persisted one on mount; after that the chart owns the symbol (search field, or `setSymbol` from `useChartProvider()`). |
| `config` | `object` | Optional structured settings — see [Configuration](#configuration). |
| `customStudies` | `array` | Optional host-provided theta-script studies, listed in the studies menu — see [Providing studies](#providing-studies-customstudies). |

### Hook

`useChartProvider()` — access/drive chart state from your own components
inside `ChartProvider` (e.g. `const { symbol, setSymbol, quotes } = useChartProvider()`).

### Helpers

Useful when writing feeds or tests:

- `normalizeQuotes(bars)` — sort/validate a `Bar[]` into the chart's internal shape
- `applyTick(quotes, tick, intervalMs, volumeDelta)` — fold one tick into a quote list
- `candleSizeToMs(size)` — `'5m'` → `300000`
- `DEFAULT_CANDLE_SIZE` (`'1m'`), `DEFAULT_TIMEFRAME` (`'2D'`)
- `DEFAULT_CONFIG` — every config key with its default (see [Configuration](#configuration))
- `studies` — the built-in study definitions (ids for `studies_hidden` / `studies_default`)
- `lineTypes`, `aggregatedTypes` — valid `lineType` values

### Persistence

The chart persists user settings (theme, studies, drawings, symbol, …) to
`localStorage` under the key `ofc-chart-state` by default — see the
`persistence` config key to change the key or turn persistence off.

## Configuration

Every key of the `config` prop is optional; omitted keys use the defaults
below (also exported as `DEFAULT_CONFIG`). Keys are snake_case.

```jsx
<ChartProvider
  dataFeed={myDataFeed}
  ticker="SPY"
  config={{
    default_theme: 'black',
    themes_hidden: ['red'],
    candle_sizes: ['1d', '1w'],
    timeframes: ['1M', '6M', '1Y', '5Y'],
    show_script_editor: false,
    persistence: 'my-app-chart',
    on_ticker_change: (symbol) => router.push(`/charts/${symbol}`),
  }}
>
```

**`default_*` keys apply only when the user has no persisted value for that
setting** — first visit, a fresh `persistence` key, or `persistence: false`.
They never override a choice the user already made and saved.

### Appearance defaults

| Key | Default | Description |
|---|---|---|
| `default_theme` | `'default'` | One of `default` (shown as "Dark" in the menu), `black`, `submariner`, `red`, `green`, `ash`, `soft`, `warm`, `light`. Users can also build their own — see [Custom themes](#custom-themes). |
| `default_line_type` | `'candles'` | Any value from the exported `lineTypes` / `aggregatedTypes`. |
| `default_candle_size` | `'1m'` | Initial candle size (feed-defined string). |
| `default_timeframe` | `'2D'` | Initial fetch timeframe (feed-defined string). |
| `default_timezone` | `'local'` | `'local'`, `'UTC'`, or an IANA zone name from the settings menu. |
| `default_extended_hours` | `true` | Show pre/post-market bars initially. |
| `default_log_scale` | `false` | Start with a logarithmic y-axis. |
| `default_draw_color` | `'#3b82f6'` | Initial drawing color. |
| `css_vars` | `null` | Extra CSS custom properties applied to the chart wrapper, e.g. `{'--green': '#00c076', '--red': '#ff3b46'}` — see `src/styles/vars.css` for the available variables. |

### Option lists

| Key | Default | Description |
|---|---|---|
| `themes_hidden` | `[]` | Theme names removed from the settings menu. |
| `line_types_hidden` | `[]` | Line type values removed from the line-type menu. |
| `candle_sizes` | built-ins | Replace the candle-size list, e.g. `['1d', '1w']` for a daily-only feed. With no explicit `default_candle_size`, the first entry becomes the default; persisted sizes outside the list are clamped to it, and timespan-bar shortcuts never auto-pick a size outside it. |
| `timeframes` | built-ins | Replace the timespan bar. Entries are `'1M'` strings or `['1M', '10m']` pairs (timeframe + the candle size it selects). |
| `draw_palette` | built-ins | Replace the color picker's preset grid (array of CSS colors). |

### Feature visibility

All default to `true`.

| Key | Hides when `false` |
|---|---|
| `show_ticker_search_field` | The symbol search box (pair with the `ticker` prop for single-instrument embeds). |
| `show_drawing_tools` | The entire drawing toolbar and its control-bar toggle. |
| `show_drawing_color_filters` | The drawings-by-color filter menu. |
| `show_script_editor` | The script editor, its bottom-bar toggle, and script authoring/editing entry points in the studies menu. |
| `show_studies_menu` | The studies menu. |
| `show_views_menu` | The saved-views menu. |
| `show_settings_menu` | The settings menu. |
| `show_line_type_menu` | The line-type menu. |
| `show_candle_size_menu` | The candle-size menu. |
| `show_crosshair_menu` | The crosshair/tooltip menu. |
| `show_timespan_bar` | The timespan shortcut bar. |
| `show_brush` | The brush (minimap) strip and its settings toggle. |
| `show_volume` | The volume underlay study (shorthand for hiding `volume_underlay` via `studies_hidden`). |
| `show_trade_markers` | Buy/sell marker tools, existing buy/sell drawings, script-emitted trade chips, and the trade totals popup. |

### Studies & drawings

| Key | Default | Description |
|---|---|---|
| `studies_hidden` | `[]` | Study ids hidden from the menu and dropped from the chart (even if persisted). The full catalog is exported as `studies` (`studies.map(s => s.id)`). |
| `studies_default` | `[]` | Study ids pre-added the first time the chart loads (ignored once anything is persisted). |
| `favorite_studies_default` | `[]` | Initial favorites (same first-load rule). |
| `draw_tools_hidden` | `[]` | Draw tool ids removed from the toolbar; emptied groups disappear. |
| `max_active_studies` | `null` | Cap on concurrently active studies; adds beyond it are ignored. |

### Behavior

| Key | Default | Description |
|---|---|---|
| `persistence` | `true` | `true` → localStorage under `ofc-chart-state`; a string → that key instead (give each chart on a page its own); `false` → fully stateless (`default_*` apply every mount). Fixed at mount. |
| `read_only` | `false` | View-only embed: implies `show_ticker_search_field`, `show_drawing_tools`, `show_drawing_color_filters`, `show_script_editor`, `show_studies_menu`, `show_views_menu` all `false` and `persistence: false`. Navigation and appearance menus stay. |
| `max_older_loads` | `3` | Backwards-pagination request cap per symbol/size/timeframe. |
| `tick_flush_ms` | `250` | Live ticks are batched and folded into the chart at most once per this interval. |

### Callbacks

| Key | Signature | Fires |
|---|---|---|
| `on_ticker_change` | `(symbol) => void` | When the symbol changes after mount (search field or `setSymbol`) — not for the initial value. |
| `on_candle_size_change` | `(candleSize) => void` | When the candle size changes after mount. |
| `on_study_add` | `(studyDef) => void` | When a study is added (menu or `addStudy`), after the `max_active_studies` check. |

## Custom themes

Users can create their own themes from the settings menu: **Theme → + New
Custom Theme**. The builder pops up over the chart and offers every color the
built-in themes define — text (3 shades), surfaces (chart/page background,
menus, inputs, buttons), borders, grid and axis lines, the dots accent, and
the light/dark hint for native widgets.

- **Start from** seeds all colors from any built-in theme, so a custom theme
  is usually "pick the closest built-in, adjust a few colors".
- Each color has a swatch (preset grid + native picker) and a raw text field
  that accepts any CSS color — `rgba(...)` values keep their alpha for
  borders and grid lines.
- Edits preview live on the chart behind the popup; Cancel reverts.
- Custom themes appear in the theme selector under a "Custom" group, persist
  with the rest of the chart state (and inside saved views), and can be
  edited or deleted via the buttons under the selector.

Selecting a custom theme sets `theme` to `custom:<name>`; its colors apply as
inline CSS variables on the chart wrapper, with `config.css_vars` still
winning on top.

## Custom scripting (theta-script)

The built-in script editor is powered by
[`theta-script`](https://www.npmjs.com/package/theta-script), a small per-bar
scripting language for chart studies and trade signals. Users open the editor
from the chart's control bar and write scripts like:

```
study("My Script", overlay=true, description="")
fast = ema(close, 12)
slow = ema(close, 26)
plot(fast, color="#22d3ee", title="Fast EMA")
plot(slow, color="#f59e0b", title="Slow EMA")
```

Scripts run per bar against the loaded OHLCV data and can plot lines and
histograms as overlays or in their own study pane, color bars, draw markers,
and emit trade signals. Saved scripts appear in the studies menu alongside the
built-in indicators and persist with the rest of the chart state.

What the chart pulls from the package:

- **Interpreter** — `runScript` executes the user's script against the
  current bar data (`theta-script`)
- **Indicator math** — `sma`/`ema`/`wilders`/`rsi`/`atr` etc. are shared with
  the built-in studies, so a scripted EMA matches the native one exactly
  (`theta-script/math`)
- **Editor tooling** — syntax highlighting from the language's builtin/keyword
  tables, in-app help pages, and a gallery of example scripts from EMA
  crosses to full breakout strategies (`theta-script/builtins`, `/docs`,
  `/examples`)

The language has conformance-tested backend runtimes too, so scripts written
in the chart can also run server-side (screening, alerting, backtesting). See
the [theta-script docs](https://gunnarpdx.github.io/thetascript/) for the full
language reference. Note: theta-script is MIT-licensed and versioned
independently of this package.

Since theta-script v3 the engine is a wasm module. The chart initializes it
automatically at `ChartProvider` mount — no setup on your side — and script
studies simply appear a beat after load once the engine is ready. Your
bundler just needs to handle the `.wasm` asset reference (webpack 5 and Vite
do out of the box).

### Providing studies (customStudies)

Your app can ship its own theta-script studies with the chart — they appear
in the studies menu (search, their category, favorites) with a distinct plug
icon, alongside the built-ins:

```jsx
<ChartProvider
  dataFeed={myDataFeed}
  customStudies={[
    {
      id: 'my_ema_cross',          // optional — defaults to a slug of name
      name: 'EMA Cross Signals',
      category: 'Signal Systems',  // optional; string or array of menu categories
      info: 'Fast/slow EMA crosses with signal arrows.',  // hover card text
      source: 'study("EMA Cross", overlay=true)\n…',      // theta-script source
      icon: <MyIcon />,            // optional 16×16 node; default: diagonal teal line
    },
  ]}
>
```

Provided studies are read-only source: users can add/remove them, favorite
them, recolor their plots, and resize their panes, but not edit or delete
them. The **Source** button in a provided study's right-click dialog forks
its code into the script editor as a new user script ("… (copy)"), leaving
the original untouched. Per-user state persists separately (keyed by the study `id`, so
keep ids stable across releases) and never touches the user's own script
library. Pass `enabled: true` on an entry to start it on the chart by
default; `studies_hidden` in `config` hides provided ids like built-ins. The
demo app (`src/demo/App.js`) passes one this way as a working example.

## Developing this repo

The repo doubles as a demo app (Create React App):

```sh
npm start          # demo at localhost:3000
npm test           # unit tests
npm run build:lib  # package output → dist/ (transpiled JS + styles.css)
```

The demo (`src/App.js`) uses the feed in `src/data_feed/` (Unusual Whales;
token via `REACT_APP_UW_TOKEN` or localStorage `ofc-uw-token`). That directory
is demo-only and excluded from the package — it's a reference implementation
of both interfaces above. Without a token the demo falls back to the bundled
ticker-data simulator (`src/demo/data_feed/simulatorFeed.js`).

The [live demo](https://gunnarpdx.github.io/OpenFinancialCharts/) is this same
app deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` on every
push to `main`. CI builds without a token, so the published site always runs
on the simulator.

## Publishing

`npm publish` — the `prepack` hook builds `dist/` (transpiled JS + CSS)
automatically, and only `dist/`, the README, and the LICENSE are packed.

## License

[AGPL-3.0-only](./LICENSE). If you run a modified version of this library as
part of a network service, the AGPL requires you to offer the modified source
to that service's users.
# open-financial-charts

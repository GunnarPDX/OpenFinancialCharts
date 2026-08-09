import { useState } from 'react';
import ChartContext from '../components/ChartContext';
import AdvancedChartWrapper from '../components/AdvancedChartWrapper';
import Chart from '../components/ChartSizeWrapper';
import AdvancedChart from '../components/AdvancedChart';
import { BUILTIN_THEMES } from '../components/controls/themeVars';
import { lineTypes, aggregatedTypes } from '../components/ChartMainLine';
import { studies } from '../studies';
import { defaultDataFeed, defaultPriceSocket, usingSimulator } from './data_feed';
import { benchDataFeed, benchPriceSocket } from './data_feed/benchFeed';
import { EXAMPLES } from 'theta-script/examples';

import '../styles/base-colors.css';
import '../styles/vars.css';
import '../styles/app.scss';
import '../styles/dev-styles.scss';
import '../styles/site.scss';

const GITHUB_URL = 'https://github.com/GunnarPDX/OpenFinancialCharts';
const NPM_URL = 'https://www.npmjs.com/package/open-financial-charts';
const THETA_DOCS_URL = 'https://gunnarpdx.github.io/thetascript/';

// demo of the customStudies prop: a host-provided theta-script study that
// shows up in the studies menu (with the plug icon) without living in the
// user's script library
const emaCross = EXAMPLES.find(e => e.name === 'EMA Cross Signals');
const demoCustomStudies = [
  {
    id: 'demo_ema_cross',
    name: 'EMA Cross Signals (provided)',
    category: 'Signal Systems',
    info: emaCross.blurb,
    source: emaCross.source,
  },
];

// ?bench swaps in the synthetic feed for performance runs (no network)
const bench = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('bench');
const feed = bench ? benchDataFeed : defaultDataFeed;
const socket = bench ? benchPriceSocket : defaultPriceSocket;

// simulator sessions persist under their own key: view windows / settings
// saved against real-feed data (different series length, price range) would
// otherwise restore against the simulated series and can leave the live
// candle scrolled off-screen
const demoConfig = !bench && usingSimulator ? { persistence: 'ofc-sim-state' } : undefined;

// the studies showcase chart is fully stateless: persistence off means
// studies_default (and every other default_*) re-applies on each reload, so
// the section always opens with exactly these studies no matter what the
// visitor did last time
const STUDIES_SHOWCASE = ['bollinger_bands', 'vwap', 'macd', 'yesno_oscillator'];
const studiesShowcaseConfig = {
  persistence: false,
  studies_default: STUDIES_SHOWCASE,
};

const QUICKSTART_CODE = `import { AdvancedChart } from 'open-financial-charts';
import 'open-financial-charts/dist/styles.css';

import { myDataFeed } from './myDataFeed';

function App() {
  return (
    <div style={{ height: 600 }}>
      <AdvancedChart dataFeed={myDataFeed} />
    </div>
  );
}`;

const DATAFEED_CODE = `export const myDataFeed = {
  name: 'my-api',
  fetchOHLC: async ({ ticker, candleSize, timeframe, endDate }) => {
    const params = new URLSearchParams({ symbol: ticker, interval: candleSize, range: timeframe });
    if (endDate) params.set('end', endDate.toISOString());

    const res = await fetch(\`https://api.example.com/ohlc?\${params}\`);
    if (!res.ok) throw new Error(\`OHLC request failed: \${res.status}\`);
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
};`;

const SOCKET_CODE = `export const myPriceSocket = {
  name: 'my-stream',
  subscribe: (ticker, onTick) => {
    const ws = new WebSocket(\`wss://stream.example.com/trades?symbol=\${ticker}\`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      onTick({
        price: +msg.price,
        time: new Date(msg.time),
        volume: +msg.sessionVolume, // cumulative session volume
      });
    };
    return () => ws.close();
  },
};`;

const STUDIES_CODE = `<AdvancedChart
  dataFeed={myDataFeed}
  config={{
    persistence: false,   // stateless — defaults re-apply every mount
    studies_default: ['bollinger_bands', 'vwap', 'macd', 'yesno_oscillator'],
  }}
/>`;

const CONFIG_CODE = `<ChartProvider
  dataFeed={myDataFeed}
  ticker="SPY"
  config={{
    default_theme: 'black',
    candle_sizes: ['1d', '1w'],
    timeframes: ['1M', '6M', '1Y', '5Y'],
    show_script_editor: false,
    persistence: 'my-app-chart',
    on_ticker_change: (symbol) => router.push(\`/charts/\${symbol}\`),
  }}
/>`;

const SCRIPT_CODE = `study("My Script", overlay=true, description="")
fast = ema(close, 12)
slow = ema(close, 26)
plot(fast, color="#22d3ee", title="Fast EMA")
plot(slow, color="#f59e0b", title="Slow EMA")`;

const FEATURES = [
  {
    title: 'Bring your own data',
    text: 'No vendor lock-in: implement one small DataFeed interface over any market-data API and the chart handles fetching, pagination, and resampling triggers.',
  },
  {
    title: `${lineTypes.length + aggregatedTypes.length} chart types`,
    text: 'Candlesticks, hollow candles, bars, area, baseline, histogram, HLC, plus aggregated types like Heikin Ashi, Renko, Kagi, and Point & Figure.',
  },
  {
    title: `${studies.length} technical studies`,
    text: 'Moving averages, oscillators, bands, volume profiles, pivots, VWAP, signal systems and more — each with editable inputs, colors, and panes.',
  },
  {
    title: 'Drawing tools',
    text: 'Trendlines, fibs, boxes, annotations, and trade markers with per-color filtering — all persisted with the rest of the chart state.',
  },
  {
    title: 'Built-in script editor',
    text: 'Users write custom studies and trade signals in theta-script, a small per-bar language with a wasm interpreter, docs, and an example gallery.',
  },
  {
    title: 'Live ticks & themes',
    text: `Streaming updates batched to ≤4 renders/sec, ${BUILTIN_THEMES.length} built-in themes plus a visual custom-theme builder, log scale, timezones, and saved views.`,
  },
];

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const CodeBlock = ({ caption, code }) => (
  <figure className="site-code">
    {caption && <figcaption>{caption}</figcaption>}
    <pre>{code}</pre>
  </figure>
);

function App() {
  return (
    <div className="site">
      <nav className="site-nav">
        <div className="site-container">
          <a className="site-nav-logo" href="#top">open-financial-<span>charts</span></a>
          <div className="site-nav-links">
            <a href="#demo">Demo</a>
            <a href="#features">Features</a>
            <a href="#studies">Studies</a>
            <a href="#quickstart">Quick start</a>
            <a href="#datafeed">Data feeds</a>
            <a href="#scripting">Scripting</a>
            <a href={GITHUB_URL}>GitHub</a>
          </div>
        </div>
      </nav>

      <header className="site-hero" id="top">
        <div className="site-container">
          <div className="site-hero-eyebrow">Open source · React · AGPL-3.0</div>
          <h1>Advanced financial charts for React</h1>
          <p className="site-hero-tagline">
            Candlesticks and two dozen other chart types, technical studies, drawing
            tools, a built-in scripting engine, and live tick updates — driven entirely
            by a data feed you provide, so it works with any market-data API.
          </p>
          <div className="site-hero-actions">
            <a className="site-btn site-btn-primary" href="#demo">Try the live demo</a>
            <a className="site-btn site-btn-ghost" href={GITHUB_URL}>View on GitHub</a>
            <a className="site-btn site-btn-ghost" href={NPM_URL}>npm</a>
          </div>
          <div className="site-install">
            npm install open-financial-charts
            <CopyButton text="npm install open-financial-charts" />
          </div>
          <div className="site-stats">
            <div><strong>{lineTypes.length + aggregatedTypes.length}</strong><span>chart types</span></div>
            <div><strong>{studies.length}</strong><span>technical studies</span></div>
            <div><strong>{BUILTIN_THEMES.length}</strong><span>built-in themes</span></div>
            <div><strong>1</strong><span>interface to implement</span></div>
          </div>
        </div>
      </header>

      <section className="site-demo" id="demo">
        <div className="site-container">
          <div className="site-demo-panel">
            <div className="site-demo-panel-bar">
              <i /><i /><i />
              <span>
                Live demo using simulated data
              </span>
            </div>
            <div className="site-demo-chart">
              <ChartContext dataFeed={feed} priceSocket={socket} customStudies={demoCustomStudies} config={demoConfig}>
                <AdvancedChartWrapper>
                  <Chart/>
                </AdvancedChartWrapper>
              </ChartContext>
              {(usingSimulator || bench) && (
                <div className="ofc-demo-watermark">Simulated data</div>
              )}
            </div>
          </div>
          <p className="site-demo-hint">
            Scroll to zoom, drag to pan. Try the studies menu, the drawing toolbar on the
            left, the script editor in the bottom bar, and the theme picker under settings.
          </p>
        </div>
      </section>

      <section className="site-section" id="features">
        <div className="site-container">
          <div className="site-section-kicker">Features</div>
          <h2>Everything a trading UI needs</h2>
          <p>
            One component with the full charting workflow built in — state, persistence,
            interactions, and rendering — while your app keeps control of the data,
            the symbol list, and which features are exposed.
          </p>
          <div className="site-features">
            {FEATURES.map(f => (
              <div className="site-feature" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!bench && (
        <section className="site-section" id="studies">
          <div className="site-container">
            <div className="site-section-kicker">Studies</div>
            <h2>{studies.length} technical studies, ready to go</h2>
            <p>
              This chart mounts with Bollinger Bands and VWAP overlaid on the price,
              plus MACD and the YesNo Oscillator in their own panes — right-click any
              of them to edit inputs and colors, or open the studies menu to browse the
              rest of the catalog.
            </p>
            <div className="site-demo-panel site-studies-panel">
              <div className="site-demo-panel-bar">
                <i /><i /><i />
                <span>
                  Bollinger Bands · VWAP · MACD · YesNo Oscillator 
                </span>
              </div>
              <div className="site-demo-chart site-studies-chart">
                <AdvancedChart dataFeed={feed} priceSocket={socket} config={studiesShowcaseConfig} />
                {usingSimulator && (
                  <div className="ofc-demo-watermark">Simulated data</div>
                )}
              </div>
            </div>
            <div className="site-docrow">
              <div>
                <h3>Preset studies from config</h3>
                <p>
                  <code>studies_default</code> pre-adds studies whenever nothing is
                  persisted, and <code>persistence: false</code> keeps the chart stateless
                  so that's every mount — the recipe for kiosk views and marketing pages
                  like this one. With persistence on, it instead seeds a first-time
                  user's chart and never overrides their choices afterwards.
                </p>
              </div>
              <CodeBlock caption="Preset studies" code={STUDIES_CODE} />
            </div>
          </div>
        </section>
      )}

      <section className="site-section" id="quickstart">
        <div className="site-container">
          <div className="site-section-kicker">Documentation</div>
          <h2>Quick start</h2>
          <div className="site-docrow">
            <div>
              <h3>One component, one stylesheet</h3>
              <p>
                <code>AdvancedChart</code> renders the whole stack — state provider, control
                bar, toolbars, script editor, and the plot. The underlying pieces
                (<code>ChartProvider</code>, <code>AdvancedChartWrapper</code>, <code>Chart</code>) are exported
                too, for chrome-less plots or custom layouts around the chart.
              </p>
              <ul>
                <li>The chart fills its parent — give the wrapping element a height.</li>
                <li><code>react ≥ 17</code> and <code>react-dom ≥ 17</code> are peer dependencies.</li>
                <li>Don't forget the stylesheet import, or the chart renders unstyled.</li>
              </ul>
            </div>
            <CodeBlock caption="App.jsx" code={QUICKSTART_CODE} />
          </div>
        </div>
      </section>

      <section className="site-section" id="datafeed">
        <div className="site-container">
          <div className="site-section-kicker">Documentation</div>
          <h2>Bring your own data feed</h2>
          <div className="site-docrow">
            <div>
              <h3>One method: fetchOHLC</h3>
              <p>
                The chart never talks to a market-data provider directly. It calls your
                feed whenever the symbol, candle size, or timeframe changes — and again
                with <code>endDate</code> set when the user pans back for older history.
              </p>
              <ul>
                <li>Return bars as <code>{'{ date, open, high, low, close, volume }'}</code> in any order — the chart sorts and normalizes.</li>
                <li>Errors you throw are caught and shown in the chart's placeholder area.</li>
                <li>This demo's "feed" replays bundled sample data — a static array works fine for tests.</li>
              </ul>
            </div>
            <CodeBlock caption="myDataFeed.js" code={DATAFEED_CODE} />
          </div>
          <div className="site-docrow">
            <div>
              <h3>Optional: live prices</h3>
              <p>
                Add a <code>PriceSocket</code> and the chart extends the forming candle with
                each tick, rolling to a new candle when the interval turns over. Ticks are
                batched internally, so any update rate is safe.
              </p>
            </div>
            <CodeBlock caption="myPriceSocket.js" code={SOCKET_CODE} />
          </div>
          <div className="site-docrow">
            <div>
              <h3>Configure everything</h3>
              <p>
                Every menu, tool, and default is controlled by a single <code>config</code> prop —
                hide features for embeds, replace the candle-size and timeframe lists,
                scope persistence per chart, or hook navigation callbacks. See the{' '}
                <a href={`${GITHUB_URL}#configuration`}>full configuration reference</a> for
                every key.
              </p>
            </div>
            <CodeBlock caption="Configuration" code={CONFIG_CODE} />
          </div>
        </div>
      </section>

      <section className="site-section" id="themes">
        <div className="site-container">
          <div className="site-section-kicker">Appearance</div>
          <h2>{BUILTIN_THEMES.length} themes, or build your own</h2>
          <p>
            Every color is a CSS variable. Pick a built-in theme, override variables
            with <code>config.css_vars</code>, or let users design their own in the visual
            theme builder — custom themes persist and travel with saved views.
          </p>
          <div className="site-themes">
            {BUILTIN_THEMES.map(([value, label]) => (
              <div
                key={value}
                className={`site-theme-chip${value !== 'default' ? ` ofc-theme-${value}` : ''}`}
              >
                <div className="site-theme-candles"><i /><i /><i /><i /><i /></div>
                <div className="site-theme-name">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section" id="scripting">
        <div className="site-container">
          <div className="site-section-kicker">Scripting</div>
          <h2>Custom studies with theta-script</h2>
          <div className="site-docrow">
            <div>
              <h3>A per-bar language for traders</h3>
              <p>
                The built-in editor runs <a href={THETA_DOCS_URL}>theta-script</a>, a small
                scripting language for chart studies and trade signals. Scripts plot lines
                and histograms, color bars, draw markers, and emit trade signals — and the
                indicator math is shared with the built-in studies, so a scripted EMA
                matches the native one exactly.
              </p>
              <ul>
                <li>Open the editor from the chart's bottom bar and try the example gallery.</li>
                <li>Saved scripts appear in the studies menu and persist with chart state.</li>
                <li>Conformance-tested backend runtimes let the same scripts run server-side for screening and alerting.</li>
              </ul>
            </div>
            <CodeBlock caption="theta-script" code={SCRIPT_CODE} />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-container">
          <div>
            © {new Date().getFullYear()} Gunnar Rosenberg ·{' '}
            <a href={`${GITHUB_URL}/blob/main/LICENSE`}>AGPL-3.0</a>
          </div>
          <nav>
            <a href={GITHUB_URL}>GitHub</a>
            <a href={NPM_URL}>npm</a>
            <a href={THETA_DOCS_URL}>theta-script docs</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default App;

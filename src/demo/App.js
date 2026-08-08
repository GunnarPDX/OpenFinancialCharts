import ChartContext from '../components/ChartContext';
import AdvancedChartWrapper from '../components/AdvancedChartWrapper';
import Chart from '../components/ChartSizeWrapper';
import { defaultDataFeed, defaultPriceSocket, usingSimulator } from './data_feed';
import { benchDataFeed, benchPriceSocket } from './data_feed/benchFeed';
import { EXAMPLES } from 'theta-script/examples';

import '../styles/base-colors.css';
import '../styles/vars.css';
import '../styles/app.scss';
import '../styles/dev-styles.scss';

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

function App() {
  return (
    <div className="App">
      <div style={{position: 'relative', height: 800, width: '90%', margin: '100px auto'}}>
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
  );
}

export default App;

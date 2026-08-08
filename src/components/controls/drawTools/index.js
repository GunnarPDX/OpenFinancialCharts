// tool definitions (id/title/icon) for the draw toolbar, grouped by family;
// this index re-exports the same public names the old single-file module had
import { LINE_TOOLS } from './lineTools';
import { SHAPE_TOOLS } from './shapeTools';
import { FIB_TOOLS } from './fibTools';
import { PATTERN_TOOLS } from './patternTools';
import { FORECAST_TOOLS } from './forecastTools';
import { TEXT_TOOLS } from './textTools';

export { T } from './T';
export { MAIN_TOOLS } from './mainTools';
export { LINE_TOOLS, SHAPE_TOOLS, FIB_TOOLS, PATTERN_TOOLS, FORECAST_TOOLS, TEXT_TOOLS };

// the six flyout groups on the main bar, in render order
export const GROUPS = [
  { id: 'lines', title: 'Line Tools', tools: LINE_TOOLS },
  { id: 'shapes', title: 'Shape Tools', tools: SHAPE_TOOLS },
  { id: 'fib', title: 'Fibonacci & Gann Tools', tools: FIB_TOOLS },
  { id: 'patterns', title: 'Chart Patterns', tools: PATTERN_TOOLS },
  { id: 'forecast', title: 'Forecasting Tools', tools: FORECAST_TOOLS },
  { id: 'text', title: 'Text Tools', tools: TEXT_TOOLS },
];

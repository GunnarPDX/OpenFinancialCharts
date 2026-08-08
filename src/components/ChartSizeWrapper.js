import { ParentSize } from '@visx/responsive';
import ChartBody from './ChartBodyWithZoom';
import { useQuotes } from './ChartContext';

const Component = () => {
  const { quotes, feedError, feedLoading } = useQuotes();

  if (!quotes.length) {
    return (
      <div className="ofc-chart-placeholder">
        {feedLoading
          ? 'Loading data\u2026'
          : feedError
            ? `Feed error: ${feedError}`
            : 'No data'}
      </div>
    );
  }

  return (

      <ParentSize>
        { parent => 
          <ChartBody parentHeight={parent.height} parentWidth={parent.width}/>
        }
      </ParentSize>

  );
}

export default Component;

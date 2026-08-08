// styles are NOT imported here — the demo imports them in App.js, package
// consumers import 'open-financial-charts/dist/styles.css' (see README)
import { useChartProvider } from './ChartContext';
import { findCustomTheme } from './controls/themeVars';

import MainControlBar from './controls/MainControlBar'
import DrawToolbar from './controls/DrawToolbar'
import ScriptEditor from './ScriptEditor'
import TimespanBar from './controls/TimespanBar'

const Body = ({children}) => {
  const { theme, customThemes, themePreview, showDrawBar, showScriptEditor, setShowScriptEditor, config } = useChartProvider();
  // a custom theme applies its variables inline instead of a theme class; a
  // live preview from the theme builder overrides the selected theme, and
  // host-level config.css_vars still win on top of either
  const customVars = themePreview || findCustomTheme(customThemes, theme)?.vars;
  const themeClass = !customVars && theme && theme !== 'default' ? ` ofc-theme-${theme}` : '';
  const style = (customVars || config.css_vars)
    ? { ...customVars, ...config.css_vars }
    : undefined;
  const showBottomBar = config.show_script_editor || config.show_timespan_bar;

  return (
    <div className={`ofc-base-content-wrapper${themeClass}`} style={style}>
      <MainControlBar/>
      <div className='ofc-base-content-cell ofc-flex-row'>
        {showDrawBar && <DrawToolbar/>}
        <div className='ofc-chart-cell'>
          {children}
        </div>
      </div>
      {showScriptEditor && <ScriptEditor/>}
      {showBottomBar && (
        <div className='ofc-flex-row ofc-bottom-bar'>
          {config.show_script_editor && (
            <button
              className={`ofc-button ofc-script-toggle${showScriptEditor ? ' ofc-active' : ''}`}
              onClick={() => setShowScriptEditor(o => !o)}
            >
              {'\u0192x'} Script Editor
            </button>
          )}
          {config.show_timespan_bar && <TimespanBar/>}
        </div>
      )}
    </div>
  );
}

// expects a <ChartContext> (ChartProvider) ancestor supplying state + data feed
const Component = ({children}) => {
  return <Body>{children}</Body>;
}

export default Component;
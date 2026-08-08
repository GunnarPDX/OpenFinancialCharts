import SearchField from './SearchField';
import IconButton from './IconButton';
import { PencilIcon } from '../icons';
import { useChartProvider } from '../ChartContext';
import CandleSizeMenu from './CandleSizeMenu';
import LineTypeMenu from './LineTypeMenu';
import StudiesMenu from './StudiesMenu';
import ViewsMenu from './ViewsMenu';
import CrosshairMenu from './CrosshairMenu';
import ColorFilterMenu from './ColorFilterMenu';
import SettingsMenu from './SettingsMenu';

const Component = ({children}) => {
  const { showDrawBar, setShowDrawBar, setDrawTool, config } = useChartProvider();

  return (
    <div className="ofc-flex-row ofc-main-control-bar">
      <div className="ofc-flex-row ofc-content-left">
        {config.show_ticker_search_field && <SearchField/>}
        {config.show_drawing_tools && (
          <IconButton onClick={() => {
            if (showDrawBar) setDrawTool('none');
            setShowDrawBar(!showDrawBar);
          }}>
            <PencilIcon/>
          </IconButton>
        )}
        {config.show_drawing_tools && config.show_drawing_color_filters && <ColorFilterMenu/>}
      </div>

      <div className="ofc-flex-row ofc-content-right">
        {config.show_candle_size_menu && <CandleSizeMenu/>}
        {config.show_line_type_menu && <LineTypeMenu/>}
        {config.show_studies_menu && <StudiesMenu/>}
        {/* views save/load round-trip through storage + a reload, so the
            menu is useless (and confusing) on a stateless chart */}
        {config.show_views_menu && config.persistence !== false && <ViewsMenu/>}
        {config.show_crosshair_menu && <CrosshairMenu/>}
        {config.show_settings_menu && <SettingsMenu/>}
      </div>
    </div>
  )
}

export default Component;
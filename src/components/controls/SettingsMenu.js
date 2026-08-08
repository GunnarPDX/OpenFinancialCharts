import React from 'react';
import Dropdown from './Dropdown';
import ToggleRow from './ToggleRow';
import ColorPicker from './ColorPicker';
import ThemeBuilder from './ThemeBuilder';
import { BUILTIN_THEMES, CUSTOM_PREFIX, customThemeValue, findCustomTheme } from './themeVars';
import { SettingsIcon, KeyboardIcon, CloseIcon } from '../icons';
import { useChartProvider } from '../ChartContext';
import useClickOutside from '../../utils/useClickOutside';
import useDropdown from './useDropdown';

const Component = () => {
  const {
    showBrush, setShowBrush,
    showGridH, setShowGridH,
    showGridV, setShowGridV,
    denseGrid, setDenseGrid,
    theme, setTheme,
    yLogScale, setYLogScale,
    yInvert, setYInvert,
    showExtendedHours, setShowExtendedHours,
    extHoursHighlight, setExtHoursHighlight,
    timezone, setTimezone,
    customThemes, saveCustomTheme, deleteCustomTheme, setThemePreview,
    customLineColors, setCustomLineColors,
    lineUpColor, setLineUpColor, lineDownColor, setLineDownColor,
    config,
  } = useChartProvider();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const shortcutsRef = React.useRef(null);
  // null | { initial: customTheme | null } — non-null renders the builder
  const [themeBuilder, setThemeBuilder] = React.useState(null);
  const activeCustomTheme = findCustomTheme(customThemes, theme);

  const closeBuilder = () => {
    setThemePreview(null);
    setThemeBuilder(null);
  };
  const saveTheme = (t) => {
    const prev = themeBuilder?.initial?.name;
    if (prev && prev !== t.name) deleteCustomTheme(prev); // rename
    saveCustomTheme(t);
    setTheme(CUSTOM_PREFIX + t.name);
    closeBuilder();
  };
  const removeTheme = (name) => {
    deleteCustomTheme(name);
    closeBuilder();
  };

  useClickOutside(shortcutsRef, () => setShortcutsOpen(false), shortcutsOpen);
  const { open, setOpen, ref } = useDropdown();

  React.useEffect(() => {
    if (!shortcutsOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcutsOpen]);

  return (
    <Dropdown
      open={open} setOpen={setOpen} rootRef={ref}
      trigger={<SettingsIcon/>}
      menuClassName="ofc-settings-menu"
      after={<>
      {themeBuilder && (
        <ThemeBuilder
          initial={themeBuilder.initial}
          existingNames={customThemes.map(t => t.name)}
          onSave={saveTheme}
          onDelete={removeTheme}
          onClose={closeBuilder}
          onPreview={setThemePreview}
        />
      )}
      {shortcutsOpen && (
        <div className="ofc-shortcuts-pop" ref={shortcutsRef}>
          <div className="ofc-shortcuts-bar">
            <span>Keyboard Shortcuts</span>
            <button className="ofc-shortcuts-close" onClick={() => setShortcutsOpen(false)}>
              <CloseIcon/>
            </button>
          </div>
          <div className="ofc-shortcuts-list">
            {[
              ['← / →', 'Pan the chart (Shift for larger steps)'],
              ['+ / −', 'Zoom in / out'],
              ['0', 'Reset to the full data range'],
              ['C', 'Toggle crosshair'],
              ['B', 'Toggle brush strip'],
              ['G', 'Toggle gridlines'],
              ['D', 'Toggle drawing toolbar'],
              ['E', 'Toggle script editor'],
              ['L', 'Toggle log scale'],
              ['I', 'Invert the y-axis'],
              ['Delete', 'Delete the selected drawing'],
              ['Esc', 'Cancel an in-progress drawing'],
              ['Enter', 'Finish a polyline / ghost feed'],
            ].map(([k, desc]) => (
              <div key={k} className="ofc-shortcut-row">
                <kbd>{k}</kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>}
    >
      <div className="ofc-dropdown-section-title">Data</div>
      <ToggleRow label="Extended Hours" checked={showExtendedHours} onChange={setShowExtendedHours} />
      <ToggleRow label="Extended Hour Highlights" checked={extHoursHighlight} onChange={setExtHoursHighlight} />
      <div className="ofc-dropdown-divider" />
      {config.show_brush && (
        <>
          <ToggleRow label="Brush" checked={showBrush} onChange={setShowBrush} />
          <div className="ofc-dropdown-divider" />
        </>
      )}
      <div className="ofc-dropdown-section-title">Grid lines</div>
      <ToggleRow label="Horizontal" checked={showGridH} onChange={setShowGridH} />
      <ToggleRow label="Vertical" checked={showGridV} onChange={setShowGridV} />
      <ToggleRow label="Dense" checked={denseGrid} onChange={setDenseGrid} />
      <div className="ofc-dropdown-divider" />
      <div className="ofc-dropdown-section-title">Y-Axis</div>
      <ToggleRow label="Log Scale" checked={yLogScale} onChange={setYLogScale} />
      <ToggleRow label="Invert" checked={yInvert} onChange={setYInvert} />
      <div className="ofc-dropdown-divider" />
      <div className="ofc-dropdown-section-title">Line Colors</div>
      <ToggleRow label="Custom Line Color" checked={customLineColors} onChange={setCustomLineColors} />
      {customLineColors && (
        <>
          <label className="ofc-dropdown-toggle">
            <span>Gain</span>
            <ColorPicker drop="down" value={lineUpColor} onChange={setLineUpColor} />
          </label>
          <label className="ofc-dropdown-toggle">
            <span>Loss</span>
            <ColorPicker drop="down" value={lineDownColor} onChange={setLineDownColor} />
          </label>
        </>
      )}
      <div className="ofc-dropdown-divider" />
      <div
        className="ofc-dropdown-item ofc-shortcuts-item"
        onClick={() => { setShortcutsOpen(true); setOpen(false); }}
      >
        <KeyboardIcon/>
        Keyboard Shortcuts
      </div>
      <div className="ofc-dropdown-divider" />
      <div className="ofc-dropdown-section-title">Theme</div>
      <label className="ofc-dropdown-toggle">
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          {BUILTIN_THEMES
            .filter(([value]) => !config.themes_hidden.includes(value) || value === theme)
            .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          {customThemes.length > 0 && (
            <optgroup label="Custom">
              {customThemes.map(t => (
                <option key={t.name} value={customThemeValue(t)}>{t.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      <div className="ofc-theme-actions">
        <button
          className="ofc-button"
          onClick={() => { setThemeBuilder({ initial: null }); setOpen(false); }}
        >
          + New Custom Theme
        </button>
        {activeCustomTheme && (
          <button
            className="ofc-button"
            onClick={() => { setThemeBuilder({ initial: activeCustomTheme }); setOpen(false); }}
          >
            Edit
          </button>
        )}
      </div>
      <div className="ofc-dropdown-divider" />
      <div className="ofc-dropdown-section-title">Timezone</div>
      <label className="ofc-dropdown-toggle">
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          <option value="local">Local (auto)</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">New York</option>
          <option value="America/Chicago">Chicago</option>
          <option value="America/Denver">Denver</option>
          <option value="America/Los_Angeles">Los Angeles</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Europe/Berlin">Berlin</option>
          <option value="Europe/Zurich">Zurich</option>
          <option value="Asia/Kolkata">Mumbai</option>
          <option value="Asia/Shanghai">Shanghai</option>
          <option value="Asia/Hong_Kong">Hong Kong</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Australia/Sydney">Sydney</option>
        </select>
      </label>
    </Dropdown>
  );
};

export default Component;

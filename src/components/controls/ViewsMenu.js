import React from 'react';
import Dropdown from './Dropdown';
import { ViewsIcon, CloseIcon } from '../icons';
import { useChartProvider } from '../ChartContext';
import useDropdown from './useDropdown';

// saved views: named snapshots of the persisted chart state. Loading writes
// the snapshot back and reloads, so everything (settings, studies, zoom
// window, theme) restores through the normal boot path.
const Component = () => {
  const { storage } = useChartProvider();
  const { loadState, saveStateNow, flushState } = storage;
  const [views, setViews] = React.useState(() => loadState().savedViews ?? []);
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState('');
  const { open, setOpen, ref } = useDropdown();

  React.useEffect(() => {
    if (!open) {
      setNaming(false);
      setName('');
    }
  }, [open]);

  const saveView = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    flushState();
    // the script library is global — views remember only which scripts were
    // enabled, so deleted scripts never come back through a view
    const { savedViews: _omit, customScripts: scripts, ...snapshot } = loadState();
    snapshot.enabledScripts = (scripts || []).filter(sc => sc.enabled).map(sc => sc.id);
    const next = [...views.filter(v => v.name !== trimmed), { name: trimmed, state: snapshot }];
    setViews(next);
    saveStateNow({ savedViews: next });
    setNaming(false);
    setName('');
  };

  const loadView = (v) => {
    // strip any script library captured by older views — enabledScripts (applied
    // against the CURRENT library on boot) carries the view's active scripts
    const { customScripts: _cs, ...rest } = v.state;
    // the write is a merge patch — default drawings to empty so a view saved
    // without them clears the current view's drawings instead of inheriting them
    saveStateNow({ drawings: [], hiddenColors: [], ...rest, savedViews: views });
    window.location.reload();
  };

  const deleteView = (v) => {
    const next = views.filter(x => x.name !== v.name);
    setViews(next);
    saveStateNow({ savedViews: next });
  };

  return (
    <Dropdown
      open={open} setOpen={setOpen} rootRef={ref}
      trigger={<ViewsIcon/>}
      after={open && naming && (
        <div className="ofc-view-save">
          <div className="ofc-study-editor-title">Save view</div>
          <input
            className="ofc-study-search"
            type="text"
            placeholder="View name…"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveView(); }}
          />
          <div className="ofc-study-editor-actions">
            <button className="ofc-button" onClick={() => { setNaming(false); setName(''); }}>
              Cancel
            </button>
            <button className="ofc-button" disabled={!name.trim()} onClick={saveView}>
              Save
            </button>
          </div>
        </div>
      )}
    >
      <div className="ofc-dropdown-section-title">Views</div>
      <button className="ofc-button ofc-view-save-btn" onClick={() => setNaming(true)}>
        + Save
      </button>
      {views.length > 0 && <div className="ofc-dropdown-divider" />}
      <div className="ofc-views-list">
        {views.map(v => (
          <div key={v.name} className="ofc-study-row">
            <span className="ofc-fav-name" onClick={() => loadView(v)}>{v.name}</span>
            <span className="ofc-study-row-actions">
              <button title="Delete view" onClick={() => deleteView(v)}>
                <CloseIcon/>
              </button>
            </span>
          </div>
        ))}
      </div>
    </Dropdown>
  );
};

export default Component;

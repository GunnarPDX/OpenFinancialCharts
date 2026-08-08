import React from 'react';
import Dropdown from './Dropdown';
import HoverCard from './HoverCard';
import { StudiesIcon, EditIcon, StarIcon, CloseIcon, SearchIcon, EyeIcon, EyeOffIcon } from '../icons';
import { studies, studiesByCategory } from '../../studies';
import StudyIcon from '../StudyIcon';
import { useChartProvider } from '../ChartContext';
import useDropdown from './useDropdown';
import useHoverCard from './useHoverCard';

const studyViews = ['Active Studies', 'Favorites', 'Custom Studies', 'Search'];

export const studyCategories = [
  'Moving Averages',
  'Bands & Channels',
  'Bollinger',
  'Momentum',
  'Oscillators',
  'Trend Strength',
  'Trend Following',
  'Signal Systems',
  'Support Resistance',
  'Volatility',
  'Volume',
  'Money Flow',
  'Comparison',
  'Projection',
  'Statistical',
];

const Component = () => {
  const {
    activeStudies, addStudy, removeStudy, updateStudy,
    favoriteStudies, toggleFavorite, setStudyEditRequest,
    customScripts, providedStudies, toggleScript, setShowScriptEditor, setScriptEditorSelect,
    config,
  } = useChartProvider();
  const notHidden = (s) => !config.studies_hidden.includes(s.id);
  // with the script editor configured off, the authoring surface goes away
  // (existing scripts can still be toggled from Active Studies / Favorites)
  const views = config.show_script_editor
    ? studyViews
    : studyViews.filter(v => v !== 'Custom Studies');
  const { open, setOpen, ref } = useDropdown();
  // with nothing on the chart yet, Active Studies is an empty page — land on
  // Search instead so the first open goes straight to picking a study
  const hasActive = activeStudies.length > 0
    || customScripts.some(sc => sc.enabled)
    || providedStudies.some(s => s.enabled);
  const defaultView = hasActive ? studyViews[0] : 'Search';
  const [selected, setSelected] = React.useState(defaultView);
  const [query, setQuery] = React.useState('');
  const menuRef = React.useRef(null);
  const { hover, setHover, showCard: showHoverCard, cardRef } = useHoverCard(menuRef);
  const showCard = (e, s) => showHoverCard(e, { s });

  // reset on close: no stale hover card, and reopen lands on the default view
  React.useEffect(() => {
    if (!open) {
      setHover(null);
      setSelected(defaultView);
      setQuery('');
    }
  }, [open, setHover, defaultView]);

  const openInEditor = (sc) => {
    setScriptEditorSelect(sc.id);
    setShowScriptEditor(true);
    setOpen(false);
  };

  // a browsable study row: click the name to add, the star to (un)favorite
  const studyRow = (s) => (
    <div
      key={s.id}
      className={`ofc-study-row${activeStudies.some(a => a.id === s.id) ? ' ofc-active' : ''}`}
      onMouseEnter={(e) => showCard(e, s)}
      onMouseLeave={() => setHover(null)}
    >
      <StudyIcon def={s} />
      <span
        className="ofc-fav-name"
        onClick={() => { addStudy(s); setHover(null); setOpen(false); }}
      >
        {s.name}
      </span>
      <span className="ofc-study-row-actions">
        <button
          title={favoriteStudies.includes(s.id) ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => toggleFavorite(s.id)}
        >
          <StarIcon className={favoriteStudies.includes(s.id) ? 'ofc-star-active' : ''}/>
        </button>
      </span>
    </div>
  );

  const scriptFavId = (sc) => `script:${sc.id}`;
  const scriptDef = (sc) => ({ name: sc.name, category: 'Custom Study', info: sc.description || '', custom: true });

  // host-provided theta-script studies (ChartProvider's customStudies prop):
  // browsable like built-ins, toggled like scripts, never editable in-app
  const providedDef = (s) => ({
    name: s.name, category: s.category || 'Provided', info: s.info || s.blurb || '',
    provided: true, icon: s.icon,
  });
  const providedRow = (s) => (
    <div
      key={`ps-${s.id}`}
      className={`ofc-study-row${s.enabled ? ' ofc-active' : ''}`}
      onMouseEnter={(e) => showCard(e, providedDef(s))}
      onMouseLeave={() => setHover(null)}
    >
      <StudyIcon def={{ provided: true, icon: s.icon }} />
      <span
        className="ofc-fav-name"
        title={s.enabled ? 'Remove from chart' : 'Add to chart'}
        onClick={() => { toggleScript(s.id); setOpen(false); }}
      >
        {s.name}
      </span>
      <span className="ofc-study-row-actions">
        <button
          title={favoriteStudies.includes(scriptFavId(s)) ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => toggleFavorite(scriptFavId(s))}
        >
          <StarIcon className={favoriteStudies.includes(scriptFavId(s)) ? 'ofc-star-active' : ''}/>
        </button>
      </span>
    </div>
  );
  const providedInCategory = (cat) => providedStudies.filter(s =>
    (Array.isArray(s.category) ? s.category.includes(cat) : s.category === cat));
  // merge built-in and provided rows into one alphabetical list
  const mergedRows = (defs, provided) => [
    ...defs.map(s => ({ name: s.name, row: () => studyRow(s) })),
    ...provided.map(s => ({ name: s.name, row: () => providedRow(s) })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const scriptRow = (sc) => (
    <div
      key={`cs-${sc.id}`}
      className={`ofc-study-row${sc.enabled ? ' ofc-active' : ''}`}
      onMouseEnter={(e) => showCard(e, scriptDef(sc))}
      onMouseLeave={() => setHover(null)}
    >
      <StudyIcon def={{ custom: true }} />
      <span
        className="ofc-fav-name"
        title={sc.enabled ? 'Remove from chart' : 'Add to chart'}
        onClick={() => { toggleScript(sc.id); setOpen(false); }}
      >
        {sc.name}
      </span>
      <span className="ofc-study-row-actions">
        {config.show_script_editor && (
          <button
            title="Open in script editor"
            onClick={() => openInEditor(sc)}
          >
            <EditIcon/>
          </button>
        )}
        <button
          title={favoriteStudies.includes(scriptFavId(sc)) ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => toggleFavorite(scriptFavId(sc))}
        >
          <StarIcon className={favoriteStudies.includes(scriptFavId(sc)) ? 'ofc-star-active' : ''}/>
        </button>
      </span>
    </div>
  );

  const item = (label) => (
    <button
      key={label}
      className={`ofc-dropdown-item${label === selected ? ' ofc-active' : ''}`}
      onClick={() => setSelected(label)}
    >
      {label}
    </button>
  );

  return (
    <Dropdown
      open={open} setOpen={setOpen} rootRef={ref}
      trigger={<StudiesIcon/>}
      menuClassName="ofc-studies-menu"
      menuRef={menuRef}
      after={open && hover && (
        <HoverCard hover={hover} cardRef={cardRef}>
          <div className="ofc-study-editor-title"><StudyIcon def={hover.s} /> {hover.s.name}</div>
          <div className="ofc-hovercard-category">
            {Array.isArray(hover.s.category) ? hover.s.category.join(' · ') : hover.s.category}
          </div>
          {hover.s.info && <div className="ofc-study-info">{hover.s.info}</div>}
          {hover.s.legend && (
            <div className="ofc-study-legend">
              {hover.s.legend.map(l => l.heading ? (
                <div key={l.heading} className="ofc-study-legend-heading">{l.heading}</div>
              ) : (
                <div key={l.label} className="ofc-study-legend-row">
                  <span className="ofc-study-legend-swatch" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          )}
        </HoverCard>
      )}
    >
      <div className="ofc-studies-left">
        <div className="ofc-dropdown-section-title">Studies</div>
        <div className="ofc-studies-views">{views.map(item)}</div>
        <div className="ofc-dropdown-divider" />
        <div className="ofc-dropdown-section-title">Categories</div>
        <div className="ofc-studies-cats">{studyCategories.map(item)}</div>
      </div>
      <div className="ofc-studies-right">
        {selected === 'Search' && (
          <div className="ofc-study-search-bar">
            <SearchIcon className="ofc-study-search-icon"/>
            <input
              className="ofc-study-search"
              type="text"
              placeholder="Search studies…"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        <div className="ofc-studies-right-list">
        {selected === 'Active Studies' && activeStudies.length === 0
          && !customScripts.some(sc => sc.enabled) && !providedStudies.some(s => s.enabled) && (
          <div className="ofc-studies-empty">
            No active studies yet — pick one from a category, favorites, or search, and it will show up here.
          </div>
        )}
        {selected === 'Active Studies' && providedStudies.filter(s => s.enabled).map(s => (
          <div
            key={`ps-${s.id}`}
            className="ofc-study-row"
            onMouseEnter={(e) => showCard(e, providedDef(s))}
            onMouseLeave={() => setHover(null)}
          >
            <StudyIcon def={{ provided: true, icon: s.icon }} />
            <span className="ofc-fav-name">{s.name}</span>
            <span className="ofc-study-row-actions">
              <button title="Remove" onClick={() => toggleScript(s.id)}>
                <CloseIcon/>
              </button>
            </span>
          </div>
        ))}
        {selected === 'Active Studies' && customScripts.filter(sc => sc.enabled).map(sc => (
          <div
            key={`cs-${sc.id}`}
            className="ofc-study-row"
            onMouseEnter={(e) => showCard(e, scriptDef(sc))}
            onMouseLeave={() => setHover(null)}
          >
            <StudyIcon def={{ custom: true }} />
            <span className="ofc-fav-name">{sc.name}</span>
            <span className="ofc-study-row-actions">
              {config.show_script_editor && (
                <button
                  title="Open in script editor"
                  onClick={() => openInEditor(sc)}
                >
                  <EditIcon/>
                </button>
              )}
              <button title="Remove" onClick={() => toggleScript(sc.id)}>
                <CloseIcon/>
              </button>
            </span>
          </div>
        ))}
        {selected === 'Custom Studies' && (
          <>
            <button
              className="ofc-button ofc-custom-study-new"
              onClick={() => { setShowScriptEditor(true); setOpen(false); }}
            >
              + Create New Script
            </button>
            {customScripts.length === 0 && (
              <div className="ofc-studies-empty">
                No custom studies yet — create one in the script editor and it will show up here.
              </div>
            )}
            {customScripts.map(scriptRow)}
          </>
        )}
        {selected === 'Custom Studies' ? null : selected === 'Active Studies'
          ? activeStudies.map(inst => {
              const def = studies.find(s => s.id === inst.id);
              return def && (
                <div
                  key={inst.key}
                  className="ofc-study-row"
                  onMouseEnter={(e) => showCard(e, def)}
                  onMouseLeave={() => setHover(null)}
                >
                  <StudyIcon def={def} />
                  <span className="ofc-fav-name">{def.name} ({inst.params.length})</span>
                  <span className="ofc-study-row-actions">
                    <button
                      title="Edit"
                      onClick={(e) => {
                        setStudyEditRequest({ key: inst.key, x: e.clientX, y: e.clientY });
                        setOpen(false);
                      }}
                    >
                      <EditIcon/>
                    </button>
                    <button title="Favorite" onClick={() => toggleFavorite(inst.id)}>
                      <StarIcon className={favoriteStudies.includes(inst.id) ? 'ofc-star-active' : ''}/>
                    </button>
                    <button
                      title={inst.hidden ? 'Show' : 'Hide'}
                      onClick={() => updateStudy(inst.key, { hidden: !inst.hidden })}
                    >
                      {inst.hidden ? <EyeOffIcon/> : <EyeIcon/>}
                    </button>
                    <button title="Remove" onClick={() => removeStudy(inst.key)}>
                      <CloseIcon/>
                    </button>
                  </span>
                </div>
              );
            })
          : selected === 'Search'
          ? mergedRows(studies.filter(notHidden), providedStudies)
              .filter(x => x.name.toLowerCase().includes(query.trim().toLowerCase()))
              .map(x => x.row())
          : selected === 'Favorites'
          ? [
              ...studies.filter(notHidden).filter(s => favoriteStudies.includes(s.id)).map(studyRow),
              ...providedStudies.filter(s => favoriteStudies.includes(scriptFavId(s))).map(providedRow),
              ...customScripts.filter(sc => favoriteStudies.includes(scriptFavId(sc))).map(scriptRow),
            ]
          : mergedRows(studiesByCategory(selected).filter(notHidden), providedInCategory(selected))
              .map(x => x.row())}
        </div>
      </div>
    </Dropdown>
  );
};

export default Component;

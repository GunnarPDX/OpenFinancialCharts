import React from 'react';
import { useChartProvider } from './ChartContext';
import { runScript, useScriptEngineReady } from '../utils/scriptEngine';
import { DEFAULT_SCRIPT } from 'theta-script/examples';
import ColorPop from './controls/ColorPop';
import ScriptDocs from './ScriptDocs';
import highlightSource from './highlightSource';
import useClickOutside from '../utils/useClickOutside';
import startWindowDrag from './chart/startWindowDrag';

// panel below the chart for authoring custom studies in the built-in
// scripting language; scripts persist to localStorage via ChartContext

// tiny synthetic tape for validating a script without the real series
const TEST_BARS = Array.from({ length: 60 }, (_, i) => {
  const c = 100 + Math.sin(i / 5) * 4 + i * 0.1;
  return { date: new Date(1700000000000 + i * 60000), open: c - 0.4, high: c + 0.8, low: c - 0.9, close: c, volume: 1000 + (i % 7) * 100 };
});

const Component = () => {
  const {
    customScripts, saveScript, deleteScript, toggleScript,
    scriptEditorSelect, setScriptEditorSelect,
    storage,
  } = useChartProvider();
  // drag the top edge to resize; the height persists like other chart state
  const [editorH, setEditorH] = React.useState(() => storage.loadState().scriptEditorHeight ?? 220);
  const startResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = editorH;
    let lastH = startH;
    startWindowDrag((ev) => {
      lastH = Math.max(140, Math.min(Math.round(window.innerHeight * 0.7), startH + (startY - ev.clientY)));
      setEditorH(lastH);
    }, () => storage.saveState({ scriptEditorHeight: lastH }));
  };
  const [selectedId, setSelectedId] = React.useState(customScripts[0]?.id ?? null);
  const selected = customScripts.find(s => s.id === selectedId) || null;
  const [name, setName] = React.useState(selected?.name ?? 'My Script');
  const [source, setSource] = React.useState(selected?.source ?? DEFAULT_SCRIPT);
  const [error, setError] = React.useState(null);
  const engineReady = useScriptEngineReady();
  // docs panel: null closed, else the open tab
  const [docsTab, setDocsTab] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const delWrapRef = React.useRef(null);
  useClickOutside(delWrapRef, () => setConfirmDelete(false), confirmDelete);
  // inline hex-color editing: { start, end, value, x, y }
  const [colorEdit, setColorEdit] = React.useState(null);
  // the live splice range for the popup — advanced synchronously in
  // applyColor because the native color input can fire onChange again before
  // React re-renders colorEdit, and the stale start/end would corrupt the
  // splice (e.g. a 3-digit hex already replaced by a 7-char value)
  const colorEditRangeRef = React.useRef(null);
  const mirrorRef = React.useRef(null);
  const taRef = React.useRef(null);
  const gutterRef = React.useRef(null);
  const colorPopRef = React.useRef(null);

  useClickOutside(colorPopRef, () => setColorEdit(null), !!colorEdit);

  // the form state last loaded from (or saved to) the store — lets us tell
  // our own save round-tripping apart from external record changes, and
  // doubles as the baseline for the dirtiness check
  const loadedRef = React.useRef(null);

  // resync the form when the selected script's stored record changes identity
  // (external save, storage sync); a record matching what we last loaded or
  // saved is our own round-trip and must not clobber in-progress edits
  React.useEffect(() => {
    if (!selected) return;
    const l = loadedRef.current;
    if (l && l.id === selected.id && l.name === selected.name && l.source === selected.source) return;
    setName(selected.name);
    setSource(selected.source);
    setError(null);
    loadedRef.current = { id: selected.id, name: selected.name, source: selected.source };
  }, [selected]);

  // the studies menu can request a specific script via context
  React.useEffect(() => {
    if (scriptEditorSelect == null) return;
    const sc = customScripts.find(s => s.id === scriptEditorSelect);
    if (sc) {
      setSelectedId(sc.id);
      setName(sc.name);
      setSource(sc.source);
      setError(null);
      loadedRef.current = { id: sc.id, name: sc.name, source: sc.source };
    }
    setScriptEditorSelect(null);
  }, [scriptEditorSelect, customScripts, setScriptEditorSelect]);

  const dirty = !!selected && (name !== selected.name || source !== selected.source);

  const applyColor = (c) => {
    const range = colorEditRangeRef.current;
    if (!range) return;
    const end = range.start + c.length;
    setSource(src => src.slice(0, range.start) + c + src.slice(range.end));
    colorEditRangeRef.current = { start: range.start, end };
    setColorEdit(ce => (ce ? { ...ce, value: c, end } : ce));
  };

  const syncScroll = () => {
    if (mirrorRef.current && taRef.current) {
      mirrorRef.current.scrollTop = taRef.current.scrollTop;
      mirrorRef.current.scrollLeft = taRef.current.scrollLeft;
    }
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  // syntax-highlighted mirror of the source; hex tokens stay clickable
  const openHexEdit = (e, start, end, val) => {
    e.preventDefault();
    e.stopPropagation(); // the still-bubbling event must not reach the just-registered close listener
    colorEditRangeRef.current = { start, end };
    setColorEdit({
      start, end, value: val,
      x: Math.min(e.clientX - 20, window.innerWidth - 260),
      y: Math.max(10, Math.min(e.clientY + 14, window.innerHeight - 150)),
    });
  };
  const hexSpan = (val, start, key) => (
    <span
      key={key}
      className="ofc-hex-token"
      style={{ borderBottomColor: val, backgroundColor: `${val}2e` }}
      onMouseDown={(e) => openHexEdit(e, start, start + val.length, val)}
    >
      {val}
    </span>
  );
  const mirrorParts = highlightSource(source, hexSpan);

  const select = (sc) => {
    setSelectedId(sc ? sc.id : null);
    setName(sc ? sc.name : 'My Script');
    setSource(sc ? sc.source : DEFAULT_SCRIPT);
    setError(null);
    setConfirmDelete(false);
    loadedRef.current = sc ? { id: sc.id, name: sc.name, source: sc.source } : null;
  };

  const save = () => {
    // the wasm engine loads once at provider mount; only a save attempted
    // within the first moments of the app's life can land here early
    if (!engineReady) {
      setError('Script engine is still loading — try again in a moment.');
      return;
    }
    const res = runScript(source, TEST_BARS);
    setError(res.error);
    if (res.error) return;
    const id = selectedId ?? Date.now();
    const nm = name.trim() || 'Untitled';
    saveScript({
      id, name: nm, description: res.description || '', source,
      enabled: selected ? selected.enabled : true,
    });
    setSelectedId(id);
    setName(nm);
    loadedRef.current = { id, name: nm, source };
  };

  return (
    <div className="ofc-script-editor" style={{ height: editorH }}>
      <div className="ofc-script-editor-grip" onMouseDown={startResize} />
      <div className="ofc-script-list">
        <button className="ofc-button ofc-script-new" onClick={() => select(null)}>+ New Script</button>
        {customScripts.map(sc => (
          <div
            key={sc.id}
            className={`ofc-script-item${sc.id === selectedId ? ' ofc-active' : ''}`}
            onClick={() => select(sc)}
          >
            <span className="ofc-script-item-name">{sc.name}</span>
            <input
              className="ofc-switch"
              type="checkbox"
              title="Show on chart"
              checked={!!sc.enabled}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleScript(sc.id)}
            />
          </div>
        ))}
        {!customScripts.length && (
          <div className="ofc-script-empty">No saved scripts yet</div>
        )}
      </div>
      <div className="ofc-script-main">
        <div className="ofc-script-toolbar">
          <input
            className="ofc-script-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Script name"
          />
          <button className="ofc-button" onClick={save}>Save</button>
          {selected && (
            <span className="ofc-script-del-wrap" ref={delWrapRef}>
              <button
                className="ofc-button ofc-script-delete"
                onClick={() => setConfirmDelete(c => !c)}
              >
                Delete
              </button>
              {confirmDelete && (
                <div className="ofc-script-del-confirm">
                  <div className="ofc-script-del-text">
                    Delete script <strong>{selected.name}</strong>?
                  </div>
                  <div className="ofc-script-del-actions">
                    <button className="ofc-button" onClick={() => setConfirmDelete(false)}>Cancel</button>
                    <button
                      className="ofc-button ofc-script-delete"
                      onClick={() => {
                        setConfirmDelete(false);
                        deleteScript(selected.id);
                        select(customScripts.find(s => s.id !== selected.id) || null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </span>
          )}
          <button className="ofc-button" onClick={() => setDocsTab(t => (t ? null : 'reference'))}>Documentation</button>
          {error
            ? <span className="ofc-script-error">{error}</span>
            : selected && (dirty
              ? <span className="ofc-script-saved" style={{ opacity: 0.65 }}>unsaved changes</span>
              : (
                <span className="ofc-script-saved">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12.5l4 4L14 8" />
                    <path d="M10 12.5l4 4L22 8" />
                  </svg>
                  saved{selected.enabled ? ' · on chart' : ''}
                </span>
              ))}
        </div>
        {docsTab && (
          <ScriptDocs
            tab={docsTab}
            setTab={setDocsTab}
            onClose={() => setDocsTab(null)}
            onImport={(ex) => {
              setSelectedId(null);
              setName(ex.name);
              setSource(ex.source);
              setError(null);
              setDocsTab(null);
            }}
          />
        )}
        <div className="ofc-script-srcwrap">
          <div ref={gutterRef} className="ofc-script-gutter" aria-hidden="true">
            {source.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea
            ref={taRef}
            className="ofc-script-source"
            spellCheck={false}
            wrap="off"
            value={source}
            onScroll={syncScroll}
            onChange={(e) => { setSource(e.target.value); setError(null); setColorEdit(null); colorEditRangeRef.current = null; }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
            }}
          />
          <div ref={mirrorRef} className="ofc-script-mirror" aria-hidden="true">
            {mirrorParts}
            {'\n'}
          </div>
        </div>
        {colorEdit && (
          <span className="ofc-color-picker" ref={colorPopRef}>
            <ColorPop
              value={colorEdit.value}
              onPick={applyColor}
              onClose={() => setColorEdit(null)}
              left={colorEdit.x}
              top={colorEdit.y}
              zIndex={80}
            />
          </span>
        )}
      </div>
    </div>
  );
};

export default Component;

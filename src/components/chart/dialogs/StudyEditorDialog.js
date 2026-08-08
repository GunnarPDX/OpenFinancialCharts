import React from 'react';

import { studies, maTypes, maFields } from '../../../studies';
import { rewritePlotColor, rewritePlotWidths } from 'theta-script/rewriteStyle';
import ColorPicker from '../../controls/ColorPicker';
import StudyIcon from '../../StudyIcon';

// right-click editor state for a study line: { key, defId, x, y, draft: { color, params } }
// plus the open/clamp/outside-click plumbing
export const useStudyEditor = ({ activeStudies, studyEditRequest, setStudyEditRequest }) => {
  const [editor, setEditor] = React.useState(null);
  const editorRef = React.useRef(null);

  // stable identity: memoized children (StudyPane) receive it as a prop
  const openStudyEditor = React.useCallback((event, inst) => {
    event.preventDefault();
    setEditor({
      key: inst.key,
      defId: inst.id,
      x: event.clientX,
      y: event.clientY,
      draft: {
        color: inst.color,
        params: { ...inst.params },
        lineColors: { ...(inst.lineColors || {}) },
        lineWidth: inst.lineWidth,
      },
    });
  }, []);

  React.useEffect(() => {
    if (!editor) return;
    const close = (e) => {
      if (editorRef.current && !editorRef.current.contains(e.target)) setEditor(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [editor]);

  // clamp the editor to the viewport using its real rendered size — tall
  // editors (legend + zones) overflow any fixed-height guess
  React.useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || !editor) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(8, Math.min(editor.x, window.innerWidth - r.width - 10));
    const ny = Math.max(8, Math.min(editor.y, window.innerHeight - r.height - 10));
    if (nx !== editor.x || ny !== editor.y) setEditor(ed => ({ ...ed, x: nx, y: ny }));
  }, [editor]);

  // the studies menu's edit button requests the editor from outside the chart
  React.useEffect(() => {
    if (!studyEditRequest) return;
    const inst = activeStudies.find(s => s.key === studyEditRequest.key);
    if (inst) {
      setEditor({
        key: inst.key,
        defId: inst.id,
        x: studyEditRequest.x,
        y: studyEditRequest.y,
        draft: {
          color: inst.color,
          params: { ...inst.params },
          lineColors: { ...(inst.lineColors || {}) },
          lineWidth: inst.lineWidth,
        },
      });
    }
    setStudyEditRequest(null);
  }, [studyEditRequest, activeStudies, setStudyEditRequest]);

  return { editor, setEditor, editorRef, openStudyEditor };
};

// right-click editor for custom-script studies: the script's declared
// input.*() values, persisted per script and re-run on save
const ScriptInputsEditor = ({ editor, setEditor, editorRef, scriptResults, customScripts, saveScript, setShowScriptEditor, setScriptEditorSelect }) => {
  const sr = scriptResults.find(x => `script_${x.cs.id}` === editor.defId);
  if (!sr) return null;
  const { cs, res } = sr;
  const draftIn = editor.draft.inputs || {};
  const setIn = (key, v) => setEditor(ed => ({
    ...ed,
    draft: { ...ed.draft, inputs: { ...(ed.draft.inputs || {}), [key]: v } },
  }));
  return (
    <div className="ofc-study-editor" ref={editorRef} style={{ left: editor.x, top: editor.y }}>
      <div className="ofc-study-editor-title">
        <StudyIcon def={cs.provided ? { provided: true, icon: cs.icon } : { custom: true }} /> {res.title || cs.name}
      </div>
      {res.description && <div className="ofc-study-info">{res.description}</div>}
      {res.plots.length > 0 && (
        <div className="ofc-study-legend">
          {res.plots.map(pl => (
            <div key={pl.key} className="ofc-study-legend-row">
              <ColorPicker
                drop="down"
                swatchClassName="ofc-study-legend-swatch ofc-study-legend-swatch-btn"
                value={(cs.lineColors || {})[pl.key] || pl.color}
                onChange={(c) => {
                  // provided studies keep the host's source pristine — always
                  // store an override, or a persisted source rewrite would
                  // shadow future host updates to the script
                  if (cs.provided) {
                    saveScript({ id: cs.id, lineColors: { ...(cs.lineColors || {}), [pl.key]: c } });
                    return;
                  }
                  // when the source declares the color as a plain literal,
                  // rewrite the code itself; otherwise store an override
                  const { source, rewritten } = rewritePlotColor(cs.source, pl, c);
                  if (rewritten) {
                    const { [pl.key]: _drop, ...rest } = cs.lineColors || {};
                    saveScript({ id: cs.id, source, lineColors: rest });
                  } else {
                    saveScript({ id: cs.id, lineColors: { ...(cs.lineColors || {}), [pl.key]: c } });
                  }
                }}
              />
              {pl.title || pl.key}
            </div>
          ))}
        </div>
      )}
      {res.plots.length > 0 && (
        <label>Line width
          <input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={cs.lineWidth ?? (res.plots.every(pl => pl.width === res.plots[0].width) ? res.plots[0].width : 2)}
            onChange={(e) => {
              const w = e.target.value === ''
                ? undefined
                : Math.max(0.5, Math.min(10, +e.target.value || 2));
              if (w === undefined) {
                saveScript({ id: cs.id, lineWidth: undefined });
                return;
              }
              // provided source stays pristine (see the color handler)
              if (cs.provided) {
                saveScript({ id: cs.id, lineWidth: w });
                return;
              }
              // rewrite width= wherever the source declares it; the shared
              // override only remains for plots without one (else it would
              // mask the freshly rewritten values)
              const { source, allRewritten } = rewritePlotWidths(cs.source, res.plots, w);
              saveScript({
                id: cs.id,
                source,
                lineWidth: allRewritten ? undefined : w,
              });
            }}
          />
        </label>
      )}
      {res.inputs.length === 0 && (
        <div className="ofc-study-info">
          This script has no inputs — declare them in the source with input.int(), input.float(), input.bool(), input.string() or input.time().
        </div>
      )}
      {res.inputs.map(inp => (
        <label key={inp.key} title={inp.tooltip || undefined}>{inp.label}
          {inp.type === 'time' ? (
            <input
              type="datetime-local"
              // overrides for time inputs are raw strings; datetime-local
              // needs the T separator and a time part
              value={(() => {
                let s = String(draftIn[inp.key] ?? inp.text ?? '').trim().replace(' ', 'T');
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00';
                return s;
              })()}
              onChange={(e) => setIn(inp.key, e.target.value)}
            />
          ) : inp.type === 'bool' ? (
            <input
              className="ofc-switch"
              type="checkbox"
              checked={!!(draftIn[inp.key] ?? inp.value)}
              onChange={(e) => setIn(inp.key, e.target.checked ? 1 : 0)}
            />
          ) : inp.type === 'string' && inp.options ? (
            <select
              value={draftIn[inp.key] ?? inp.value}
              onChange={(e) => setIn(inp.key, e.target.value)}
            >
              {inp.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : inp.type === 'string' ? (
            <input
              type="text"
              value={draftIn[inp.key] ?? inp.value}
              onChange={(e) => setIn(inp.key, e.target.value)}
            />
          ) : (
            <input
              type="number"
              min={inp.minval}
              max={inp.maxval}
              step={inp.step ?? (inp.type === 'int' ? 1 : 0.01)}
              value={draftIn[inp.key] ?? inp.value}
              onChange={(e) => setIn(inp.key, e.target.value === '' ? inp.default : +e.target.value)}
            />
          )}
        </label>
      ))}
      <div className="ofc-study-editor-actions">
        <button
          className="ofc-button ofc-study-delete"
          onClick={() => { saveScript({ id: cs.id, enabled: false }); setEditor(null); }}
        >
          Delete
        </button>
        <button
          className="ofc-button"
          onClick={() => {
            if (cs.provided) {
              // provided studies are read-only — Source forks the code into
              // the user's library as a fresh editable script, deduping the
              // name so repeat forks don't all read "X (copy)"
              const id = Date.now();
              const taken = new Set((customScripts || []).map(s => s.name));
              const base = res.title || cs.name;
              let name = `${base} (copy)`;
              for (let n = 2; taken.has(name); n++) name = `${base} (copy ${n})`;
              saveScript({ id, name, source: cs.source, enabled: false });
              setScriptEditorSelect(id);
            } else {
              setScriptEditorSelect(cs.id);
            }
            setShowScriptEditor(true);
            setEditor(null);
          }}
        >
          Source
        </button>
        <button
          className="ofc-button"
          onClick={() => {
            saveScript({ id: cs.id, inputs: { ...(cs.inputs || {}), ...draftIn } });
            setEditor(null);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

// right-click editor for built-in studies
const BuiltinStudyEditor = ({ editor, setEditor, editorRef, updateStudy, removeStudy }) => {
  const def = studies.find(s => s.id === editor.defId);
  if (!def) return null;
  const d = editor.draft;
  const set = (changes, paramChanges = null) => setEditor(ed => ({
    ...ed,
    draft: {
      ...ed.draft,
      ...(changes || {}),
      params: paramChanges ? { ...ed.draft.params, ...paramChanges } : ed.draft.params,
    },
  }));
  const show = (f) => (def.fields || ['color', 'length', 'source', 'type', 'offset']).includes(f);
  // style edits (colors, line width) apply to the chart immediately and
  // auto-save; numeric params (period etc.) stay draft-only until Save so the
  // study isn't recomputed on every keystroke
  const applyLive = (changes) => {
    set(changes);
    updateStudy(editor.key, changes);
  };
  // line-styled studies get color-per-line and shared-width controls; bar,
  // dot, icon and momentum-colored render styles keep their semantic colors.
  // Baseline panes color by sign (green/red), so only the width applies there.
  const rendersLines = (!def.renderAs && !def.dots && !def.segmented)
    || (def.renderAs === 'pane' && (def.paneStyle === 'line' || def.paneStyle === 'baseline'));
  const colorPerLine = rendersLines && def.lines
    && !(def.renderAs === 'pane' && def.paneStyle === 'baseline');
  const defaultWidth = def.renderAs === 'pane' ? 1.5 : 2;
  // legend labels double as long descriptions — the row label is the short part
  const lineLabel = (l) => ((l.label || l.key || 'Line').split(' — ')[0]);
  // a legend row edits every line sharing its color (Bollinger's "Bands" row
  // recolors upper+lower together); lines no legend row covers get their own
  // picker row below
  const legendKeys = (l) => (colorPerLine && !l.heading
    ? def.lines.filter(ln => ln.color === l.color).map(ln => ln.key)
    : []);
  const legendCovered = new Set((def.legend || []).flatMap(legendKeys));
  const uncoveredLines = colorPerLine
    ? def.lines.filter(ln => !legendCovered.has(ln.key))
    : [];
  return (
    <div
      className="ofc-study-editor"
      ref={editorRef}
      style={{ left: editor.x, top: editor.y }}
    >
      <div className="ofc-study-editor-title"><StudyIcon def={def} /> {def.name}</div>
      {def.info && <div className="ofc-study-info">{def.info}</div>}
      {def.legend && (
        <div className="ofc-study-legend">
          {def.legend.map(l => {
            if (l.heading) {
              return <div key={l.heading} className="ofc-study-legend-heading">{l.heading}</div>;
            }
            const keys = legendKeys(l);
            const cur = keys.length ? (d.lineColors[keys[0]] || l.color) : l.color;
            return (
              <div key={l.label} className="ofc-study-legend-row">
                {keys.length ? (
                  <ColorPicker
                    drop="down"
                    swatchClassName="ofc-study-legend-swatch ofc-study-legend-swatch-btn"
                    value={cur}
                    onChange={(c) => applyLive({
                      lineColors: {
                        ...d.lineColors,
                        ...Object.fromEntries(keys.map(k => [k, c])),
                      },
                    })}
                  />
                ) : (
                  <span className="ofc-study-legend-swatch" style={{ background: cur }} />
                )}
                {l.label}
              </div>
            );
          })}
        </div>
      )}
      {show('color') && !colorPerLine && <label>Color
        <ColorPicker drop="down" value={d.color} onChange={(c) => applyLive({ color: c })} />
      </label>}
      {uncoveredLines.map(l => (
        <label key={l.key}>{lineLabel(l)}
          <ColorPicker
            drop="down"
            value={d.lineColors[l.key] || l.color || d.color}
            onChange={(c) => applyLive({ lineColors: { ...d.lineColors, [l.key]: c } })}
          />
        </label>
      ))}
      {rendersLines && <label>Line width
        <input
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          value={d.lineWidth ?? defaultWidth}
          onChange={(e) => applyLive({
            lineWidth: e.target.value === ''
              ? undefined
              : Math.max(0.5, Math.min(10, +e.target.value || defaultWidth)),
          })}
        />
      </label>}
      {show('length') && <label>Period
        <input
          type="number"
          min="1"
          value={d.params.length}
          onChange={(e) => set(null, { length: Math.max(1, +e.target.value || 1) })}
        />
      </label>}
      {def.renderAs === 'profile' && <label>Sidebar Panel
        <input
          className="ofc-switch"
          type="checkbox"
          checked={!!d.params.sidebar}
          onChange={(e) => {
            // applies live (like style edits): the strip reserves/releases
            // its slice of the plot immediately
            const sidebar = e.target.checked;
            set(null, { sidebar });
            updateStudy(editor.key, { params: { ...d.params, sidebar } });
          }}
        />
      </label>}
      {show('source') && <label>Field
        <select value={d.params.source} onChange={(e) => set(null, { source: e.target.value })}>
          {maFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </label>}
      {show('type') && <label>Type
        <select value={d.params.type} onChange={(e) => set(null, { type: e.target.value })}>
          {maTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>}
      {show('mult') && <label>Multiplier
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={d.params.mult}
          onChange={(e) => set(null, { mult: Math.max(0.1, +e.target.value || 2) })}
        />
      </label>}
      {show('anchor') && <label>Anchor
        <button
          className="ofc-button"
          onClick={() => {
            updateStudy(editor.key, { params: { ...d.params, anchor: null } });
            setEditor(null);
          }}
        >
          Click chart to set
        </button>
      </label>}
      {show('offset') && <label>Offset
        <input
          type="number"
          value={d.params.offset}
          onChange={(e) => set(null, { offset: +e.target.value || 0 })}
        />
      </label>}
      <div className="ofc-study-editor-actions">
        <button
          className="ofc-button ofc-study-delete"
          onClick={() => { removeStudy(editor.key); setEditor(null); }}
        >
          Delete
        </button>
        <button
          className="ofc-button"
          onClick={() => {
            updateStudy(editor.key, {
              color: d.color,
              params: d.params,
              lineColors: d.lineColors,
              lineWidth: d.lineWidth,
            });
            setEditor(null);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

// dispatches to the script-inputs or built-in variant on the defId prefix
const StudyEditorDialog = ({
  editor, setEditor, editorRef, scriptResults, customScripts, saveScript, setShowScriptEditor, setScriptEditorSelect, updateStudy, removeStudy,
}) => {
  if (!editor) return null;
  if (`${editor.defId}`.startsWith('script_')) {
    return (
      <ScriptInputsEditor
        editor={editor}
        setEditor={setEditor}
        editorRef={editorRef}
        scriptResults={scriptResults}
        customScripts={customScripts}
        saveScript={saveScript}
        setShowScriptEditor={setShowScriptEditor}
        setScriptEditorSelect={setScriptEditorSelect}
      />
    );
  }
  return (
    <BuiltinStudyEditor
      editor={editor}
      setEditor={setEditor}
      editorRef={editorRef}
      updateStudy={updateStudy}
      removeStudy={removeStudy}
    />
  );
};

export default StudyEditorDialog;

import React from 'react';
import { sameValue } from '../../utils/config';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Script studies, both kinds:
//
// - customScripts: authored in the in-app editor, { id, name, source,
//   enabled } — fully user-owned, persisted as-is.
// - provided studies (customStudies prop): the host ships read-only source;
//   user state on them (enabled, recolors, pane height, input overrides)
//   lives in providedState keyed by study id and persists — a reload keeps a
//   provided study on the chart even though the list itself arrives fresh
//   from the host each mount.
//
// Split out of ChartContext for readability only; behavior is unchanged.
const useScripts = ({ saved, storage, cfg, customStudies }) => {
  // enabledScripts is a one-shot handoff from view loading: it re-applies the
  // view's active set against the current library (stale ids just no-op)
  const [customScripts, setCustomScripts] = React.useState(() => {
    const list = saved.customScripts ?? [];
    return Array.isArray(saved.enabledScripts)
      ? list.map(sc => ({ ...sc, enabled: saved.enabledScripts.includes(sc.id) }))
      : list;
  });
  React.useEffect(() => {
    if (saved.enabledScripts !== undefined) storage.saveState({ enabledScripts: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stabilize the prop by content so inline array literals don't re-run the
  // scripts every render. icon is excluded from the comparison — it may be a
  // React element (compared by neither identity nor content), so icon-only
  // changes keep the first render's element
  const stable = React.useRef({ probe: null, base: [] });
  const probe = (customStudies || []).map(({ icon, ...rest }) => rest);
  if (!sameValue(probe, stable.current.probe)) {
    stable.current = {
      probe,
      base: (customStudies || []).map(s => ({ ...s, id: s.id || slug(s.name) })),
    };
  }
  const providedBase = stable.current.base;

  const [providedState, setProvidedState] = React.useState(saved.providedStudyState ?? {});

  // drop state for studies the host no longer ships, so removed ids don't
  // linger in storage forever. Mount-only, and only when the prop is in use —
  // a chart rendered without customStudies keeps whatever state exists
  React.useEffect(() => {
    if (!providedBase.length) return;
    const ids = new Set(providedBase.map(s => s.id));
    setProvidedState(st => {
      const entries = Object.entries(st).filter(([k]) => ids.has(k));
      return entries.length === Object.keys(st).length ? st : Object.fromEntries(entries);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providedStudies = React.useMemo(() => (
    providedBase
      .filter(s => !cfg.studies_hidden.includes(s.id))
      .map(s => ({ provided: true, enabled: false, ...s, ...(providedState[s.id] || {}) }))
  ), [providedBase, providedState, cfg.studies_hidden]);
  const providedIds = React.useRef(new Set());
  providedIds.current = new Set(providedBase.map(s => s.id));

  // saveScript/toggleScript route provided ids into providedState, so the
  // script-editing machinery (recolor dialogs, pane resize, input rewrites)
  // works on provided studies without copying them into the user's library
  const saveScript = React.useCallback((sc) => {
    if (providedIds.current.has(sc.id)) {
      setProvidedState(st => ({ ...st, [sc.id]: { ...st[sc.id], ...sc } }));
      return;
    }
    setCustomScripts(list => (
      list.some(x => x.id === sc.id) ? list.map(x => (x.id === sc.id ? { ...x, ...sc } : x)) : [...list, sc]
    ));
  }, []);
  const deleteScript = React.useCallback((id) => setCustomScripts(list => list.filter(x => x.id !== id)), []);
  const toggleScript = React.useCallback((id) => {
    if (providedIds.current.has(id)) {
      setProvidedState(st => ({ ...st, [id]: { ...st[id], enabled: !st[id]?.enabled } }));
      return;
    }
    setCustomScripts(list => list.map(x => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  }, []);

  return {
    customScripts, saveScript, deleteScript, toggleScript,
    providedStudies, providedState,
  };
};

export default useScripts;

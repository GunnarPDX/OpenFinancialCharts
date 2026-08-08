import React from 'react';

import {
  TRIPLE_TOOLS, PATTERN_N, MULTI_CLICK, TEXT_PLACE, TEXT_DEFAULTS, smoothPath,
} from '../constants';

// the drawing-tool state machine: the in-progress draft, its mouse/keyboard
// handlers, the draft preview, and the selection/menu/dialog state for
// committed drawings
const useDrawTools = ({ drawTool, setDrawTool, drawColor, addDrawing, removeDrawing, pointToData }) => {
  const [draft, setDraft] = React.useState(null);
  // text-entry dialog for text drawings: { i, x, y, value, isNew }
  const [textEdit, setTextEdit] = React.useState(null);
  const openTextEdit = (targetId, clientX, clientY, value, isNew = false) => setTextEdit({
    id: targetId,
    x: Math.min(clientX, window.innerWidth - 260),
    y: Math.max(10, Math.min(clientY, window.innerHeight - 220)),
    value, isNew,
  });
  // amount-entry dialog for buy/sell markers: { id, x, y, mode, value, isNew }
  const [tradeEdit, setTradeEdit] = React.useState(null);
  const openTradeEdit = (targetId, clientX, clientY, opts = {}) => setTradeEdit({
    id: targetId,
    x: Math.min(clientX, window.innerWidth - 260),
    y: Math.max(10, Math.min(clientY, window.innerHeight - 220)),
    mode: opts.mode || 'qty',
    value: opts.value ?? '',
    isNew: !!opts.isNew,
  });
  const startDraw = (event) => {
    if (event.button !== 0) return;
    const d = pointToData(event);
    if (!d) return;
    if (drawTool === 'level') {
      addDrawing({ type: 'level', p: d.p, color: drawColor });
      setDrawTool('none');
      return;
    }
    if (drawTool === 'vline' || drawTool === 'crossline') {
      addDrawing({ type: drawTool, t: d.t, p: d.p, color: drawColor });
      setDrawTool('none');
      return;
    }
    if (drawTool === 'avwap_draw') {
      addDrawing({ type: drawTool, t: d.t, p: d.p, color: drawColor });
      setDrawTool('none');
      return;
    }
    if (drawTool === 'buy_marker' || drawTool === 'sell_marker') {
      const newId = addDrawing({ type: drawTool, t: d.t, p: d.p, priceSource: 'close', color: drawColor });
      openTradeEdit(newId, event.clientX, event.clientY, { isNew: true });
      setDrawTool('none');
      return;
    }
    if (TEXT_PLACE.includes(drawTool)) {
      const newId = addDrawing({ type: drawTool, t: d.t, p: d.p, color: drawColor, text: TEXT_DEFAULTS[drawTool] || '' });
      if (TEXT_DEFAULTS[drawTool]) openTextEdit(newId, event.clientX, event.clientY, TEXT_DEFAULTS[drawTool], true);
      setDrawTool('none');
      return;
    }
    if (drawTool === 'arrow_up' || drawTool === 'arrow_down') {
      addDrawing({ type: drawTool, t: d.t, p: d.p, color: drawColor });
      setDrawTool('none');
      return;
    }
    if (TRIPLE_TOOLS.includes(drawTool)) {
      // three clicks: two anchors, then the third defining point
      if (!draft || draft.type !== drawTool) {
        setDraft({ type: drawTool, pts: [d], hover: d });
      } else if (draft.pts.length === 1) {
        setDraft({ ...draft, pts: [...draft.pts, d] });
      } else {
        const [p1, p2] = draft.pts;
        setDraft(null);
        addDrawing({
          type: drawTool, color: drawTool === 'bars_copy' ? undefined : drawColor,
          x1: p1.t, y1: p1.p, x2: p2.t, y2: p2.p, x3: d.t, y3: d.p,
        });
        setDrawTool('none');
      }
      return;
    }
    if (drawTool === 'poly' || drawTool === 'polygon' || drawTool === 'ghost') {
      if (!draft || draft.type !== drawTool) setDraft({ type: drawTool, pts: [d], hover: d });
      else setDraft({ ...draft, pts: [...draft.pts, d], hover: d });
      return;
    }
    if (PATTERN_N[drawTool]) {
      const pts = (!draft || draft.type !== drawTool) ? [d] : [...draft.pts, d];
      if (pts.length >= PATTERN_N[drawTool]) {
        setDraft(null);
        addDrawing({ type: drawTool, color: drawColor, pts: pts.map(q => ({ t: q.t, p: q.p })) });
        setDrawTool('none');
      } else {
        setDraft({ type: drawTool, pts, hover: d });
      }
      return;
    }
    if (draft && draft.type === drawTool && !draft.dragging) {
      // click-move-click: the second click completes the drawing
      commitTwoPoint(draft.type, draft.start, d, event);
      setDraft(null);
      return;
    }
    setDraft({ type: drawTool, start: d, end: d, pts: [d], dragging: true });
  };

  // preview shows the genuine end result: build a temp drawing from the
  // draft's data coords and run it through the committed renderer
  const renderDraftPreview = (renderDrawing) => {
    if (draft.type === 'free' || draft.type === 'highlight') {
      const hl = draft.type === 'highlight';
      return <path d={smoothPath(draft.pts)} fill="none" stroke={drawColor}
        strokeWidth={hl ? 12 : 1.8} opacity={hl ? 0.35 : 1} strokeLinejoin="round" strokeLinecap="round" />;
    }
    if (draft.type === 'poly' || draft.type === 'polygon' || draft.type === 'ghost') {
      return renderDrawing({
        type: draft.type,
        color: drawColor,
        pts: [...draft.pts, draft.hover].map(q => ({ t: q.t, p: q.p })),
      }, 'preview', false);
    }
    if (PATTERN_N[draft.type]) {
      return renderDrawing({
        type: draft.type,
        color: drawColor,
        pts: [...draft.pts, draft.hover].map(q => ({ t: q.t, p: q.p })),
      }, 'preview', false);
    }
    if (MULTI_CLICK.includes(draft.type)) {
      if (draft.pts.length < 2) {
        const p1 = draft.pts[0];
        return (
          <>
            <circle cx={p1.x} cy={p1.y} r={2.5} fill={drawColor} />
            <line x1={p1.x} y1={p1.y} x2={draft.hover.x} y2={draft.hover.y}
              stroke={drawColor} strokeWidth={1.5} strokeDasharray="4,3" />
          </>
        );
      }
      const [p1, p2] = draft.pts;
      return renderDrawing({
        type: draft.type, color: draft.type === 'bars_copy' ? undefined : drawColor,
        x1: p1.t, y1: p1.p, x2: p2.t, y2: p2.p, x3: draft.hover.t, y3: draft.hover.p,
      }, 'preview', false);
    }
    return renderDrawing({
      type: draft.type, color: drawColor,
      x1: draft.start.t, y1: draft.start.p, x2: draft.end.t, y2: draft.end.p,
    }, 'preview', false);
  };

  const commitTwoPoint = (type, start, end, evt) => {
    if (Math.abs(end.x - start.x) < 2 && Math.abs(end.y - start.y) < 2) return;
    const newId = addDrawing({
      type, color: drawColor, x1: start.t, y1: start.p, x2: end.t, y2: end.p,
      ...(type === 'callout' ? { text: TEXT_DEFAULTS.callout } : {}),
    });
    if (type === 'callout') {
      openTextEdit(newId,
        evt ? evt.clientX : window.innerWidth / 2 - 110,
        evt ? evt.clientY : window.innerHeight / 2 - 80,
        TEXT_DEFAULTS.callout, true);
    }
    setDrawTool('none');
  };
  const moveDraw = (event) => {
    if (!draft) return;
    const d = pointToData(event);
    if (!d) return;
    setDraft(prev => {
      if (!prev) return prev;
      if (MULTI_CLICK.includes(prev.type)) return { ...prev, hover: d };
      if (prev.type === 'free' || prev.type === 'highlight') {
        const last = prev.pts[prev.pts.length - 1];
        if (Math.abs(d.x - last.x) + Math.abs(d.y - last.y) < 3) return prev;
        return { ...prev, pts: [...prev.pts, d], end: d };
      }
      return { ...prev, end: d };
    });
  };
  const finishPoly = () => {
    if (!draft || (draft.type !== 'poly' && draft.type !== 'polygon' && draft.type !== 'ghost')) return;
    // the double-click added a duplicate final vertex — drop near-duplicates
    const pts = draft.pts.filter((q, k, arr) =>
      k === 0 || Math.abs(q.x - arr[k - 1].x) + Math.abs(q.y - arr[k - 1].y) > 3);
    setDraft(null);
    const need = draft.type === 'polygon' ? 3 : 2;
    if (pts.length >= need) {
      addDrawing({ type: draft.type, color: drawColor, pts: pts.map(q => ({ t: q.t, p: q.p })) });
      setDrawTool('none');
    }
  };

  const endDraw = () => {
    if (!draft) return;
    if (MULTI_CLICK.includes(draft.type)) return; // multi-click; Escape cancels
    const { type, start, end, pts } = draft;
    if (type === 'free' || type === 'highlight') {
      setDraft(null);
      if (pts.length > 1) {
        addDrawing({ type, color: drawColor, pts: pts.map(q => ({ t: q.t, p: q.p })) });
        setDrawTool('none');
      }
      return;
    }
    const moved = Math.abs(end.x - start.x) >= 3 || Math.abs(end.y - start.y) >= 3;
    if (!moved) {
      // a plain click: keep the draft armed and wait for the second click
      setDraft(prev => (prev ? { ...prev, dragging: false } : prev));
      return;
    }
    setDraft(null);
    commitTwoPoint(type, start, end);
  };

  // keyboard handlers go through refs so the window listeners subscribe once
  // instead of re-attaching on all of this component's (frequent) renders
  const draftKeyRef = React.useRef(null);
  draftKeyRef.current = (e) => {
    if (!draft) return;
    // Enter commits a multi-point draft; Escape always cancels (matches the
    // shortcuts help in the settings menu)
    if ((draft.type === 'poly' || draft.type === 'polygon' || draft.type === 'ghost') && e.key === 'Enter') finishPoly();
    else if (e.key === 'Escape') setDraft(null);
  };
  React.useEffect(() => {
    const onKey = (e) => draftKeyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // right-click context menu for a drawing: { i, x, y }
  const [drawMenu, setDrawMenu] = React.useState(null);
  // double-click settings dialog for position drawings: { i, x, y }
  const [posEdit, setPosEdit] = React.useState(null);
  // single-click-selected drawing index (positions show handles/labels only when selected)
  const [selDraw, setSelDraw] = React.useState(null);

  React.useEffect(() => {
    if (selDraw == null) return;
    const onKey = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      removeDrawing(selDraw);
      setSelDraw(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selDraw, removeDrawing]);
  const drawMenuRef = React.useRef(null);
  React.useEffect(() => {
    if (!drawMenu) return;
    const close = (e) => {
      if (drawMenuRef.current && !drawMenuRef.current.contains(e.target)) setDrawMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [drawMenu]);

  return {
    draft, startDraw, moveDraw, endDraw, finishPoly, renderDraftPreview,
    textEdit, setTextEdit, openTextEdit,
    tradeEdit, setTradeEdit, openTradeEdit,
    drawMenu, setDrawMenu, drawMenuRef,
    posEdit, setPosEdit,
    selDraw, setSelDraw,
  };
};

export default useDrawTools;

import React from 'react';

import { format } from 'd3-format';
import { runScript, useScriptEngineReady } from '../../../utils/scriptEngine';
import { studies, setSessionTimezone } from '../../../studies';
import startWindowDrag from '../startWindowDrag';
import { lineColorOf } from '../lineStyle';

// study/script computation cluster: custom-script results, pane layout
// (plotBottom), the study point series, bar recoloring, and volume-profile
// bucketing. Pixel-space study derivations live in useStudyPixels below,
// because yScale itself depends on plotBottom computed here.
const useStudies = ({
  series, studySeries = series, visible, drawn, yMax, activeStudies, customScripts, timezone,
  updateStudy, saveScript,
}) => {
  // the exchange clock shared by session-keyed studies (VWAP, pivots) and the
  // scripts' calendar/session builtins; unset/'local' means local grouping
  // for studies, while scripts fall back to the language default (New York).
  // Studies read it via the module-level setSessionTimezone, applied inside
  // their memos so the timezone dep actually triggers a recompute
  const studyTz = !timezone || timezone === 'local' ? null : timezone;

  // scripts and full-series studies run against studySeries — the bar-close
  // gated series — so live tick batches don't re-execute them 4x/sec; their
  // tails lag the forming candle by at most one bar close.
  // engineReady gates on the theta-script wasm engine: scripts simply don't
  // render until it has loaded (a beat after mount), then this recomputes
  const engineReady = useScriptEngineReady();
  const scriptResults = React.useMemo(() => (
    !engineReady ? [] : (customScripts || [])
      .filter(cs => cs.enabled)
      .map(cs => ({ cs, res: runScript(cs.source, studySeries, { inputs: cs.inputs, timezone: studyTz }) }))
      // an error-free run always draws something (the interpreter rejects
      // scripts that draw nothing), so trades/panel/barcolor-only scripts
      // survive this filter
      .filter(x => !x.res.error)
  ), [engineReady, customScripts, studySeries, studyTz]);

  // computed once per script-result change and shared by the panes memo and
  // studyLines (it used to run twice per script per render, rebuilding every
  // point object both times)
  const scriptEntries = React.useMemo(() => scriptResults.map(({ cs, res }) => {
    const def = {
      id: `script_${cs.id}`,
      name: res.title || cs.name,
      renderAs: res.overlay ? 'script' : 'pane',
      paneStyle: 'line',
      scriptId: cs.id,
      script: res,
      lines: res.plots.map(pl => ({
        key: pl.key, label: pl.title || pl.key, color: pl.color, width: pl.width,
        style: pl.style, lineStyle: pl.lineStyle,
      })),
    };
    const points = res.plots.flatMap(pl =>
      pl.values
        .map((v, r) => (isFinite(v) ? { date: studySeries[r].date, rank: r, value: v, line: pl.key } : null))
        .filter(Boolean));
    return {
      // lineColors/lineWidth ride the instance so the shared line-style
      // helpers (lineColorOf/lineWidthOf) apply script editor overrides in
      // both the overlay and pane render paths
      inst: {
        key: `cs-${cs.id}`,
        id: def.id,
        color: res.plots[0]?.color,
        params: { height: cs.paneHeight || 70 },
        lineColors: cs.lineColors,
        lineWidth: cs.lineWidth,
      },
      def,
      points,
    };
  }), [scriptResults, studySeries]);

  // 'pane' studies (volume, oscillators) reserve resizable strips between the
  // price plot and the x axis, stacked bottom-up; the plot ends at plotBottom.
  // paneResize is the transient height override while a resize drag is live
  const [paneResize, setPaneResize] = React.useState(null); // { key, h }
  const panes = React.useMemo(() => {
    let bottom = yMax;
    return [
      ...activeStudies
        .filter(inst => !inst.hidden)
        .map(inst => ({ inst, def: studies.find(d => d.id === inst.id) }))
        .filter(x => x.def?.renderAs === 'pane'),
      ...scriptEntries.filter(x => x.def.renderAs === 'pane'),
    ].map(({ inst, def }) => {
      const override = paneResize && paneResize.key === inst.key ? paneResize.h : null;
      const height = Math.max(30, override ?? inst.params.height ?? 70);
      const pane = { inst, def, height, bottom, top: bottom - height };
      bottom = pane.top - 8;
      return pane;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudies, yMax, scriptEntries, paneResize]);
  const plotBottom = panes.length ? Math.max(panes[panes.length - 1].top - 8, 20) : yMax;

  // stable identity (saveScript/updateStudy are useCallback-stable in the
  // provider) so the memoized StudyPane isn't re-rendered by it
  const startPaneResize = React.useCallback((event, pane) => {
    event.stopPropagation();
    const startY = event.clientY;
    const startH = pane.height;
    let lastH = startH;
    // drag updates only the transient override (cheap layout recompute);
    // committing per mousemove re-ran scripts/studies once per frame
    startWindowDrag((ev) => {
      lastH = Math.max(30, Math.min(300, startH + (startY - ev.clientY)));
      setPaneResize({ key: pane.inst.key, h: lastH });
    }, () => {
      if (pane.def.scriptId != null) saveScript({ id: pane.def.scriptId, paneHeight: lastH });
      else updateStudy(pane.inst.key, { params: { ...pane.inst.params, height: lastH } });
      setPaneResize(null);
    });
  }, [saveScript, updateStudy]);

  // active studies computed over the full series; sliced to the drawn window at
  // render so they pan/zoom in lockstep with the data.
  // split by input: full-series studies must NOT depend on `visible` (a fresh
  // slice per pan frame) or every 1-bar pan recomputes every study — only the
  // visibleWindow studies (valuation lines) recompute while panning
  const seriesStudyLines = React.useMemo(() => {
    setSessionTimezone(studyTz);
    return activeStudies
      .filter(inst => !inst.hidden)
      .map(inst => {
        const def = studies.find(s => s.id === inst.id);
        return def && !def.visibleWindow && { inst, def, points: def.compute(studySeries, inst.params) };
      })
      .filter(Boolean);
  }, [studySeries, activeStudies, studyTz]);
  const windowStudyLines = React.useMemo(() => {
    setSessionTimezone(studyTz);
    return activeStudies
      .filter(inst => !inst.hidden)
      .map(inst => {
        const def = studies.find(s => s.id === inst.id);
        return def && def.visibleWindow && { inst, def, points: def.compute(visible, inst.params) };
      })
      .filter(Boolean);
  }, [visible, activeStudies, studyTz]);
  // enabled custom scripts: overlays render inline, panes via the pane system
  const studyLines = React.useMemo(
    () => [...seriesStudyLines, ...windowStudyLines, ...scriptEntries],
    [seriesStudyLines, windowStudyLines, scriptEntries]
  );

  // a 'recolor' study doesn't draw its own marks — it paints the main line by
  // tagging each drawn bar with an overlayColor the renderers prefer
  const recolorStudy = studyLines.find(({ def }) => def.renderAs === 'recolor');
  const drawnColored = React.useMemo(() => {
    const scriptBarColors = scriptResults.flatMap(({ res }) => res.barColors);
    if (!recolorStudy && !scriptBarColors.length) return drawn;
    const colorByRank = recolorStudy
      ? new Map(recolorStudy.points.map(p => [p.rank, p.color]))
      : new Map();
    return drawn.map(b => {
      let c = colorByRank.get(b.rank);
      scriptBarColors.forEach(perBar => { if (perBar[b.rank]) c = perBar[b.rank]; });
      return c ? { ...b, overlayColor: c } : b;
    });
  }, [drawn, recolorStudy, scriptResults]);

  // side profiles: each profile study buckets the visible window by price
  // range itself (def.profile — see studies/profileUtils.js for the entry
  // contract). Bucketing depends only on the visible data; the pixel mapping
  // is applied in a second memo so y-axis drags (which change yScale per
  // mousemove) don't re-bucket the whole window each frame.
  const profileBuckets = React.useMemo(() => (
    studyLines
      .filter(({ def }) => def.renderAs === 'profile' && def.profile)
      .map(({ inst, def }) => {
        const rows = Math.max(4, Math.min(80, Math.round(inst.params.length || 24)));
        let lo = Infinity, hi = -Infinity;
        visible.forEach(b => {
          if (b.low < lo) lo = b.low;
          if (b.high > hi) hi = b.high;
        });
        if (!(hi > lo)) return null;
        const buckets = def.profile(visible, rows, lo, hi);
        // streaks/levels are annotations — only real bars set the scale
        const maxV = Math.max(...buckets.map(e => (e && !e.streak ? e.v : 0)), 1e-9);
        return { inst, rows, lo, hi, buckets, maxV };
      })
      .filter(Boolean)
  ), [studyLines, visible]);

  return {
    scriptResults, scriptEntries, panes, plotBottom, startPaneResize,
    studyLines, drawnColored, profileBuckets,
  };
};

// pixel-space study derivations, split out of useStudies because they need
// yScale (which is built from useStudies' plotBottom)
export const useStudyPixels = ({ profileBuckets, studyLines, drawLo, drawHi, xMax, sidebarW = 0, sidebarSlots = null, yScale, plotBottom }) => {
  const profileData = React.useMemo(() => (
    profileBuckets.map(({ inst, rows, lo, hi, buckets, maxV }) => {
      // sidebar-mode profiles each own their reserved strip; overlay-mode
      // profiles hug the plot's right edge (which the strips, when present,
      // push left of the axis)
      const slot = sidebarSlots?.get(inst.key) || null;
      const sidebar = !!slot;
      const right = sidebar ? slot.x + slot.w : xMax - sidebarW;
      const maxW = sidebar ? Math.max(slot.w - 10, 4) : (xMax - sidebarW) * 0.25;
      const center = right - maxW / 2; // baseline for diverging (side) bars
      const diverging = buckets.some(e => e && e.side);
      const bars = [];
      const levels = [];
      buckets.forEach((e, k) => {
        if (!e) return;
        const pLo = lo + ((hi - lo) * k) / rows;
        const pHi = lo + ((hi - lo) * (k + 1)) / rows;
        const y = yScale(pHi);
        const h = Math.max(yScale(pLo) - y - 1, 1);
        if (e.level) {
          levels.push({ k, y: y + h / 2, price: (pLo + pHi) / 2, color: e.color });
        }
        if (e.streak) {
          // annotation line spanning the strip; height independent of v
          const sh = Math.min(2, h);
          bars.push({
            k, v: e.v, y: y + (h - sh) / 2, h: sh, w: maxW, x: right - maxW,
            fill: e.color, opacity: e.opacity ?? 0.6, poc: false, streak: true,
          });
          return;
        }
        if (!(e.v > 0)) return;
        const poc = e.v === maxV;
        // diverging profiles split the strip: side +1 grows left of the
        // center line (into the chart), side -1 grows right (to the axis)
        const w = e.side ? (e.v / maxV) * (maxW / 2) : (e.v / maxV) * maxW;
        const x = e.side ? (e.side > 0 ? center - w : center) : right - w;
        // strip bars sit on their own background, not under candles, so the
        // overlay translucency would read washed out there — boost it
        const opacity = e.opacity ?? (poc ? 0.35 : 0.18);
        bars.push({
          k, v: e.v, y, h, w, x, side: e.side || 0,
          fill: e.color, opacity: sidebar ? Math.min(0.95, opacity * 1.8) : opacity, poc,
          labelValue: e.labelValue ?? e.v,
        });
      });
      // a mini value axis along the strip's bottom edge: what a full-width
      // bar means. Right-anchored strips read max → max/2 → 0 toward the
      // anchor; diverging strips read +max / 0 / −max around the center line
      // with unlabeled minor marks at the halves (labeling five values would
      // crowd the strip). Anchors keep every label inside its own strip.
      let sidebarAxis = null;
      if (sidebar) {
        const fmt = format('.2~s');
        sidebarAxis = diverging
          ? [
              { x: center - maxW / 2, label: fmt(maxV), anchor: 'start' },
              { x: center - maxW / 4, label: null },
              { x: center, label: '0', anchor: 'middle' },
              { x: center + maxW / 4, label: null },
              { x: center + maxW / 2, label: `-${fmt(maxV)}`, anchor: 'end' },
            ]
          : [
              { x: right - maxW, label: fmt(maxV), anchor: 'start' },
              { x: right - maxW / 2, label: fmt(maxV / 2), anchor: 'middle' },
              { x: right, label: '0', anchor: 'end' },
            ];
      }
      return { inst, bars, levels, centerX: diverging ? center : null, sidebarAxis };
    })
  ), [profileBuckets, xMax, sidebarW, sidebarSlots, yScale]);

  // y-axis price tags at each overlay study line's last visible value; computed
  // here so the hovered tag can be re-rendered last in the svg (on top)
  const studyAxisTags = React.useMemo(() => studyLines
    .filter(({ def }) => !def.renderAs && !def.axisTags)
    .flatMap(({ inst, def, points }) =>
      (def.lines || [{ key: null, color: inst.color }]).map(l => {
        const pts = l.key == null ? points : points.filter(p => p.line === l.key);
        let pt = null;
        for (let i = pts.length - 1; i >= 0; i--) {
          if (pts[i].rank >= drawLo && pts[i].rank <= drawHi && isFinite(pts[i].value)) { pt = pts[i]; break; }
        }
        if (!pt) return null;
        const y = yScale(pt.value);
        if (y < 10 || y > plotBottom - 6) return null;
        return { id: `${inst.key}-${l.key || 'main'}`, color: lineColorOf(inst, l), value: pt.value, y };
      }).filter(Boolean)
    ), [studyLines, drawLo, drawHi, yScale, plotBottom]);

  return { profileData, studyAxisTags };
};

export default useStudies;

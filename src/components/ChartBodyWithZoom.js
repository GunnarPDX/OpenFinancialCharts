import React from "react";

import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleLinear, scaleBand } from '@visx/scale';

import { localPoint } from '@visx/event';

import { format } from 'd3-format';

import { useChartProvider, useQuotes, useDrawings } from './ChartContext';

import ChartMainLine, { aggregatedTypes } from './ChartMainLine';

import DragPlane from "./DragPlane";
import StudyPane from './chart/StudyPane';
import { DRAWING_RENDERERS, trendline } from './chart/drawings';
import { extendedSession } from './chart/sessionUtils';
import useSeries from './chart/hooks/useSeries';
import useXAxisTicks from './chart/hooks/useXAxisTicks';
import useYScale from './chart/hooks/useYScale';
import useTimeRankMap from './chart/hooks/useTimeRankMap';
import useDrawTools from './chart/hooks/useDrawTools';
import useStudies, { useStudyPixels } from './chart/hooks/useStudies';
import useClosedQuotes from './chart/hooks/useClosedQuotes';
import useSidebarSlots from './chart/hooks/useSidebarSlots';
import StudyOverlays, {
  studyPointsAttr, ScriptBgWashes, VolumeUnderlay, ProfileBars, ProfileLabels, ScriptShapes, ScriptTrades, ScriptObjects,
} from './chart/StudyOverlays';
import ChartAxes, { studyTagEl, LevelTags, AxisMarkers } from './chart/ChartAxes';
import BrushStrip, { brushHeight, brushGap } from './chart/BrushStrip';
import TickerChip, { FeedStatus, ScriptInfoPanel } from './chart/TickerChip';
import DrawingMenu from './chart/dialogs/DrawingMenu';
import PositionEditDialog from './chart/dialogs/PositionEditDialog';
import TextEditDialog from './chart/dialogs/TextEditDialog';
import TradeAmountDialog from './chart/dialogs/TradeAmountDialog';
import StudyEditorDialog, { useStudyEditor } from './chart/dialogs/StudyEditorDialog';
import CursorLayer from './chart/CursorLayer';
import useZoomWindow, { MAX_WINDOW } from './chart/useZoomWindow';

const formatPrice = format('$,.2f');

// stable xGetter identity so the React.memo'd renderer isn't defeated by
// fresh closures each render
const getDateX = (b) => b.date;

// live count of mounted chart instances — window-level shortcuts fire only on
// the hovered instance when several charts share a page
let mountedCharts = 0;

const Chart = ({
  parentHeight,
  parentWidth,
  marginTop = 0,
  marginLeft = 0,
  marginRight = 60,
  marginBottom = 26
}) => {
  const { quotes, feedLoading, feedError, loadOlder, feedLoadingOlder } = useQuotes();
  const {
    lineType, customLineColors, lineUpColor, lineDownColor,
    showBrush, setShowBrush, showGridH, setShowGridH, showGridV, setShowGridV, denseGrid,
    showCrosshair, setShowCrosshair, showTooltip, showPriceDisplay, stickToData,
    yLogScale, setYLogScale, yInvert, setYInvert, showExtendedHours, extHoursHighlight,
    showDrawBar, setShowDrawBar, setShowScriptEditor, setScriptEditorSelect,
    symbol,
    drawTool, setDrawTool, addDrawing, removeDrawing, updateDrawing, drawColor, hiddenColors,
    showFullTrades, setShowFullTrades,
    customScripts, providedStudies, saveScript,
    timezone,
    activeStudies, updateStudy, removeStudy,
    studyEditRequest, setStudyEditRequest,
    config, storage,
  } = useChartProvider();
  const drawings = useDrawings();
  const gridDensity = denseGrid ? 5 : 1;

  // bar sequence + timezone-aware formatters + ticker chip data
  const { series, fmtTime, fmtDay, tickerQuote } = useSeries({
    quotes, lineType, showExtendedHours, timezone,
  });

  // studies, scripts and the brush read the series through a bar-close gate:
  // they recompute when a candle closes/appends or the dataset changes, not
  // on every live tick batch (see useClosedQuotes). Ranks stay aligned with
  // the render series — between closes the two differ only in the forming
  // bar's OHLCV values. Aggregated line types are exempt: a live tick can
  // form a new brick mid-candle, so a gated aggregation would drift out of
  // rank alignment with the render series (misplaced overlays, recolors and
  // brush length) — and the gate saves little there anyway, since the render
  // aggregation reruns per batch regardless.
  const isAggregated = aggregatedTypes.some(t => t.value === lineType);
  const closedQuotes = useClosedQuotes(quotes);
  const { series: gatedSeries } = useSeries({
    quotes: closedQuotes, lineType, showExtendedHours, timezone,
  });
  const studySeries = isAggregated ? series : gatedSeries;

  const [savedView] = React.useState(() => storage.loadState().view || {});

  const xMax = Math.max(parentWidth - marginRight - 5, 0);
  // sidebar strips for sidebar-mode profile studies (see useSidebarSlots).
  // The time scale compresses into [0, plotW]; with no sidebar profiles
  // plotW === xMax and nothing changes.
  const { sidebarSlots, sidebarW, startStripResize } = useSidebarSlots({
    activeStudies, xMax, updateStudy,
  });
  const plotW = Math.max(xMax - sidebarW, 0);
  const {
    w0, w1, frac, setWindow, setFrac, handleDrag, handlePinch,
    maxIdx, visible, drawLo, drawHi, drawn,
  } = useZoomWindow(series, savedView, loadOlder, { xMax: plotW });

  // crosshair/tooltip/price display live in CursorLayer, which owns the cursor
  // state and subscribes to the svg's mousemove itself so pointer movement
  // doesn't re-render the whole chart body. The parent reads the bar under
  // the cursor through this ref (tap-to-anchor below).
  const svgRef = React.useRef(null);
  const hoveredBarRef = React.useRef(null);

  // a genuine tap (not the click that follows a pan) anchors a pending
  // Anchored VWAP to the bar under the cursor
  const tapStart = React.useRef(null);
  const onSvgMouseDown = (e) => {
    tapStart.current = { x: e.clientX, y: e.clientY };
  };
  const onSvgClick = (e) => {
    const s = tapStart.current;
    if (!s || Math.abs(e.clientX - s.x) > 3 || Math.abs(e.clientY - s.y) > 3) return;
    setSelDraw(null); // clicks that reach the svg background deselect (drawings stopPropagation)
    const pending = activeStudies.find(a => a.id === 'anchored_vwap' && !a.params.anchor);
    if (pending && hoveredBarRef.current) {
      updateStudy(pending.key, { params: { ...pending.params, anchor: +hoveredBarRef.current.date } });
    }
  };


  // brushGap above the strip, a little breathing room below it (the strip's
  // background rect extends 3px past brushHeight); hiding the brush gives the
  // strip's space back to the chart
  const chartHeight = Math.max(
    showBrush ? parentHeight - brushHeight - brushGap - 10 : parentHeight,
    0
  );
  const yMax = Math.max(chartHeight - marginBottom, 0);

  // studies/scripts: script results, pane layout (plotBottom), study point
  // series, bar recoloring, volume-profile buckets
  // host-provided studies run through the same script pipeline as
  // editor-authored ones; the provider routes their state writes separately
  const allScripts = React.useMemo(
    () => (providedStudies.length ? [...customScripts, ...providedStudies] : customScripts),
    [customScripts, providedStudies]
  );
  const {
    scriptResults, panes, plotBottom, startPaneResize,
    studyLines, drawnColored, profileBuckets,
  } = useStudies({
    series, studySeries, visible, drawn, yMax, activeStudies, customScripts: allScripts, timezone,
    updateStudy, saveScript,
  });

  // horizontal width of one datapoint slot
  const step = plotW / (w1 - w0 + 1);

  // vertical scale/pan state, the y scale, and its drag handlers
  const {
    yScale, yStretch, yShift, baselineFrac,
    baselineY, baselineDragging, startBaselineDrag,
    handleDragY, axisDragStart, axisDragMove, axisDragEnd,
  } = useYScale({ savedView, visible, plotBottom, yLogScale, yInvert });

  // persist the view (debounced in storage.js, so panning doesn't spam writes)
  React.useEffect(() => {
    storage.saveState({ view: { w0, w1, frac, yStretch, yShift, baselineFrac } });
  }, [storage, w0, w1, frac, yStretch, yShift, baselineFrac]);

  // --- drawing tools -------------------------------------------------------
  // time/rank/pixel conversions for the current window
  const { rankForTime, pxForTime, pxForRank, timeForRank, pointToData } =
    useTimeRankMap({ series, maxIdx, w0, frac, step, yScale });

  // draft state machine + selection/menu/dialog state for drawings
  const {
    draft, startDraw, moveDraw, endDraw, finishPoly, renderDraftPreview,
    textEdit, setTextEdit, openTextEdit,
    tradeEdit, setTradeEdit, openTradeEdit,
    drawMenu, setDrawMenu, drawMenuRef,
    posEdit, setPosEdit,
    selDraw, setSelDraw,
  } = useDrawTools({ drawTool, setDrawTool, drawColor, addDrawing, removeDrawing, pointToData });
  // chart keyboard shortcuts (see the keyboard popup in the settings menu).
  // Listeners are on window, so with several charts mounted only the hovered
  // instance responds (a lone chart always does).
  const hoveredRef = React.useRef(false);
  React.useEffect(() => {
    mountedCharts++;
    return () => { mountedCharts--; };
  }, []);
  const shortcutKeyRef = React.useRef(null);
  {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.target.isContentEditable) return;
      if (mountedCharts > 1 && !hoveredRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      switch (key) {
        case 'ArrowLeft': handleDrag({ shift: e.shiftKey ? 20 : 5, direction: 'right' }); break;
        case 'ArrowRight': handleDrag({ shift: e.shiftKey ? 20 : 5, direction: 'left' }); break;
        case '+': case '=': handlePinch.current('IN'); break;
        case '-': case '_': handlePinch.current('OUT'); break;
        case '0': setWindow([Math.max(0, maxIdx - MAX_WINDOW + 1), maxIdx]); setFrac(0); break;
        case 'c': setShowCrosshair(!showCrosshair); break;
        case 'b': setShowBrush(!showBrush); break;
        case 'g': {
          const on = showGridH || showGridV;
          setShowGridH(!on);
          setShowGridV(!on);
          break;
        }
        case 'd': {
          if (showDrawBar) setDrawTool('none');
          setShowDrawBar(!showDrawBar);
          break;
        }
        case 'e': setShowScriptEditor(o => !o); break;
        case 'l': setYLogScale(!yLogScale); break;
        case 'i': setYInvert(!yInvert); break;
        default: return;
      }
      e.preventDefault();
    };
    shortcutKeyRef.current = onKey;
  }
  React.useEffect(() => {
    const onKey = (e) => shortcutKeyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  // render one committed drawing in current px space; drawings are addressed
  // by their stable id (never by index — deletes shift indices). Dispatches
  // to the per-type renderer registry (chart/drawings); unknown types fall
  // back to the plain trend line, exactly like the old if-chain
  const renderDrawing = (d, i, interactive = true) => {
    if (interactive && hiddenColors.includes(d.color || 'multi')) return null;
    return (DRAWING_RENDERERS[d.type] || trendline)(d, i, interactive, drawingCtx);
  };

  const xScale = React.useMemo(() => scaleBand({
      // buffered points sit outside [0, plotW] on the same step; the clipPath cuts them
      range: [(drawLo - w0) * step, plotW + (drawHi - w1) * step],
      domain: drawn.map(b => b.date),
      padding: 0.3
  }), [plotW, step, drawn, drawLo, drawHi, w0, w1]);

  // axis scale + tick ranks/labels + dense-grid ticks + session markers
  const {
    xAxisScale, xTicksMajor, xTicksMinor, xTickLabel, xTicksEvery, axisMarkers,
  } = useXAxisTicks({ series, w0, w1, frac, step, parentWidth, maxIdx, fmtDay, fmtTime });

  // id of the study price tag under the cursor (lifted above overlapping tags)
  const [hoverStudyTag, setHoverStudyTag] = React.useState(null);

  // id of the buy/sell marker under the cursor (collapsed markers expand on hover)
  const [hoverTrade, setHoverTrade] = React.useState(null);

  // everything the per-type drawing renderers (chart/drawings) close over,
  // built once per render; renderDrawing above runs only at JSX-eval time,
  // after this object exists
  const drawingCtx = {
    pxForTime, pxForRank, rankForTime, timeForRank, yScale, xMax, plotBottom, step, w0, frac,
    series, maxIdx, selDraw, setSelDraw, updateDrawing, setPosEdit, openTextEdit, openTradeEdit, setDrawMenu,
    showFullTrades, hoverTrade, setHoverTrade,
  };

  // pixel-space study derivations (need yScale, hence after useYScale)
  const { profileData, studyAxisTags } = useStudyPixels({
    profileBuckets, studyLines, drawLo, drawHi, xMax, sidebarW, sidebarSlots, yScale, plotBottom,
  });

  // study editor dialog state + open/clamp/outside-click plumbing
  const { editor, setEditor, editorRef, openStudyEditor } = useStudyEditor({
    activeStudies, studyEditRequest, setStudyEditRequest,
  });

  // maps pixels to data indices so drag shift is 1:1 with the visible window
  const dragScale = React.useMemo(() => scaleLinear({
      range: [0, xMax],
      domain: [w0, w1]
  }), [xMax, w0, w1]);


  return (
    <>
    <svg
      ref={svgRef}
      width={parentWidth}
      height={parentHeight}
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
      onMouseDownCapture={onSvgMouseDown}
      onClick={onSvgClick}
    >
      <Group top={marginTop} left={marginLeft}>
        {showGridH && (
          <GridRows
            scale={yScale}
            width={xMax}
            numTicks={5 * gridDensity}
            stroke="var(--grid-lines)"
          />
        )}
        {showGridV && (
          <GridColumns
            scale={xAxisScale}
            height={yMax}
            tickValues={denseGrid ? xTicksEvery : xTicksMajor}
            stroke="var(--grid-lines)"
          />
        )}

      <ScriptBgWashes scriptResults={scriptResults} series={series} xScale={xScale}
        drawLo={drawLo} drawHi={drawHi} frac={frac} step={step} plotBottom={plotBottom} />

      </Group>

      <clipPath id="chart_area_clip">
        <rect x={0} y={0} width={plotW} height={plotBottom} />
      </clipPath>
      {/* profiles may extend past the plot into the sidebar strip */}
      <clipPath id="profile_area_clip">
        <rect x={0} y={0} width={xMax} height={plotBottom} />
      </clipPath>

      {/* extended-hours background highlight */}
      {extHoursHighlight && (
        <g clipPath="url(#chart_area_clip)" pointerEvents="none">
          <g transform={`translate(${-frac * step}, 0)`}>
            {drawn.map(b => {
              const sess = extendedSession(b);
              if (!sess) return null;
              return (
                <rect
                  key={b.rank}
                  x={xScale(b.date) - step * 0.15}
                  y={0}
                  width={step}
                  height={plotBottom}
                  fill={sess === 'pre' ? '#f59e0b' : '#3b82f6'}
                  opacity={0.08}
                />
              );
            })}
          </g>
        </g>
      )}

      <VolumeUnderlay studyLines={studyLines} visible={visible} drawn={drawn}
        xScale={xScale} frac={frac} step={step} plotBottom={plotBottom} />

      <ProfileBars profileData={profileData} xMax={xMax} plotBottom={plotBottom}
        sidebarSlots={sidebarSlots} />

      <g clipPath="url(#chart_area_clip)">
        <g transform={`translate(${-frac * step}, 0)`}>
          {/* custom gain/loss colors override the theme's --green/--red for
              the main series only — every renderer colors through those two
              variables, and the override cascades no further than this group */}
          <g style={customLineColors ? { '--green': lineUpColor, '--red': lineDownColor } : undefined}>
            <ChartMainLine
              quotes={drawnColored}
              lineType={lineType}
              xScale={xScale}
              yScale={yScale}
              width={parentWidth}
              height={chartHeight}
              baselineY={baselineY}
              xGetter={getDateX}
            />
          </g>
          <StudyOverlays
            studyLines={studyLines}
            series={series}
            xScale={xScale}
            yScale={yScale}
            drawLo={drawLo}
            drawHi={drawHi}
            w0={w0}
            frac={frac}
            step={step}
            xMax={xMax}
            plotBottom={plotBottom}
          />
        </g>
      </g>

      <ChartAxes
        parentWidth={parentWidth}
        marginRight={marginRight}
        yMax={yMax}
        xMax={xMax}
        plotBottom={plotBottom}
        yScale={yScale}
        xAxisScale={xAxisScale}
        xTicksMajor={xTicksMajor}
        xTicksMinor={xTicksMinor}
        xTickLabel={xTickLabel}
        studyLines={studyLines}
        studyAxisTags={studyAxisTags}
        series={series}
      />

      {/* spinner in the empty past region while older data loads */}
      {feedLoadingOlder && w0 + frac < 0 && (() => {
        const edge = (0 - w0 - frac) * step; // px where the first bar sits
        const cx2 = Math.min(Math.max(24, edge / 2), xMax - 24);
        const cy2 = plotBottom / 2;
        return (
          <g pointerEvents="none">
            <circle className="ofc-past-loader" cx={cx2} cy={cy2} r={5.5} fill="none"
              stroke="var(--text-faint)" strokeWidth={1.6} strokeDasharray="24 10.5" strokeLinecap="round" />
            <text x={cx2} y={cy2 + 17} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
              loading{'\u2026'}
            </text>
          </g>
        );
      })()}

      <FeedStatus feedLoading={feedLoading} feedError={feedError} />
      <TickerChip tickerQuote={tickerQuote} symbol={symbol} />

      <LevelTags drawings={drawings} hiddenColors={hiddenColors} yScale={yScale}
        plotBottom={plotBottom} xMax={xMax} marginRight={marginRight} />

      <ProfileLabels profileData={profileData} xMax={xMax} />

      <DragPlane
        xScale={dragScale}
        width={(parentWidth - marginRight) > 0 ? (parentWidth - marginRight) : 0}
        height={chartHeight}
        handleDrag={handleDrag}
        handlePinch={handlePinch}
        handleDragY={handleDragY}
        onWheelPan={(dxPx) => handleDrag({
          shift: Math.abs(dxPx) / step,
          direction: dxPx > 0 ? 'left' : 'right',
        })}
        onContextMenu={(e) => {
          // pane bodies and profile bars sit under the drag plane so panning
          // still works there; route their right-clicks to the study editor
          const pt = localPoint(e);
          if (!pt) return;
          const paneHit = panes.find(p => pt.y >= p.top - 4 && pt.y <= p.bottom);
          if (paneHit) { openStudyEditor(e, paneHit.inst); return; }
          // anywhere in a sidebar strip opens that strip's profile;
          // elsewhere a click must land on one of a profile's painted bars
          const slotHit = sidebarSlots && pt.y <= plotBottom
            && [...sidebarSlots.entries()].find(([, s]) => pt.x >= s.x && pt.x < s.x + s.w);
          const profHit =
            (slotHit && profileData.find(p => p.inst.key === slotHit[0]))
            || profileData.find(p => p.bars.some(b =>
                pt.x >= b.x - 2 && pt.x <= b.x + b.w + 2
                && pt.y >= b.y && pt.y <= b.y + b.h));
          if (profHit) openStudyEditor(e, profHit.inst);
        }}
      />

      <rect
        x={parentWidth - marginRight}
        y={0}
        width={marginRight}
        height={yMax}
        fill="transparent"
        style={{ cursor: 'ns-resize' }}
        onMouseDown={axisDragStart}
        onMouseMove={(e) => {
          axisDragMove(e);
          // this rect owns all mouse events over the axis strip, so study-tag
          // hover is hit-tested here rather than on the (covered) tags
          const y = localPoint(e).y;
          const t = studyAxisTags.find(x => Math.abs(x.y - y) <= 7);
          setHoverStudyTag(t ? t.id : null);
        }}
        onMouseUp={axisDragEnd}
        onMouseLeave={() => { axisDragEnd(); setHoverStudyTag(null); }}
        onTouchStart={axisDragStart}
        onTouchMove={axisDragMove}
        onTouchEnd={axisDragEnd}
      />

      {/* sidebar strip resize grips: a slim hit zone on each strip's left
          edge, above the drag plane so it wins over panning */}
      {sidebarSlots && [...sidebarSlots.entries()].map(([key, s]) => (
        <rect
          key={`sbgrip-${key}`}
          x={s.x - 3}
          y={0}
          width={7}
          height={plotBottom}
          fill="transparent"
          style={{ cursor: 'ew-resize' }}
          onMouseDown={(e) => startStripResize(e, key)}
        />
      ))}

      {/* invisible wide hit lines over overlay custom-script plots — rendered
          above the drag plane so right-click opens the script input editor */}
      {studyLines.filter(({ def }) => def.renderAs === 'script').map(({ inst, def, points }) => (
        <g key={`hit-${inst.key}`} clipPath="url(#chart_area_clip)">
          <g transform={`translate(${-frac * step}, 0)`}>
            {(def.lines || []).map(l => (
              <polyline key={l.key} fill="none" stroke="transparent" strokeWidth={9}
                pointerEvents="stroke" style={{ cursor: 'context-menu' }}
                onContextMenu={(e) => openStudyEditor(e, inst)}
                points={points
                  .filter(pt => pt.line === l.key && pt.rank >= drawLo && pt.rank <= drawHi)
                  .map(pt => `${xScale(pt.date) + xScale.bandwidth() / 2},${yScale(pt.value)}`)
                  .join(' ')} />
            ))}
          </g>
        </g>
      ))}

      <AxisMarkers axisMarkers={axisMarkers} w0={w0} frac={frac} step={step}
        xMax={xMax} yMax={yMax} marginBottom={marginBottom} />

      <ScriptObjects scriptResults={scriptResults} yScale={yScale}
        drawLo={drawLo} drawHi={drawHi} frac={frac} step={step} w0={w0} />

      <ScriptShapes scriptResults={scriptResults} series={series} xScale={xScale}
        yScale={yScale} drawLo={drawLo} drawHi={drawHi} frac={frac} step={step} />

      {config.show_trade_markers && (
        <ScriptTrades scriptResults={scriptResults} series={series} xScale={xScale}
          yScale={yScale} drawLo={drawLo} drawHi={drawHi} frac={frac} step={step}
          showFullTrades={showFullTrades} />
      )}

      {/* live preview + capture overlay while a drawing tool is active */}
      {draft && (
        <g clipPath="url(#chart_area_clip)" pointerEvents="none" opacity={0.85}>
          {renderDraftPreview(renderDrawing)}
        </g>
      )}
      {drawTool !== 'none' && (
        <rect
          x={0}
          y={0}
          width={xMax}
          height={plotBottom}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={() => { if (draft && draft.dragging) endDraw(); }}
          onDoubleClick={finishPoly}
        />
      )}


      {/* user drawings — above the tool overlay so right-click menus work
          while a tool is active; draw gestures forward through */}
      {drawings.length > 0 && (
        <g
          clipPath="url(#chart_area_clip)"
          onMouseDown={drawTool !== 'none' ? startDraw : undefined}
          onMouseMove={drawTool !== 'none' ? moveDraw : undefined}
          onMouseUp={drawTool !== 'none' ? endDraw : undefined}
        >
          {drawings.map(renderDrawing)}
        </g>
      )}

      {/* draggable baseline for the baseline line type — above the drag plane
          so the strip and knob receive the mouse */}
      {lineType === 'baseline' && (
        <>
          <line
            x1={0}
            x2={xMax}
            y1={baselineY}
            y2={baselineY}
            stroke="var(--text-faint)"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
          <rect
            x={0}
            y={baselineY - 5}
            width={xMax}
            height={10}
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
            onMouseDown={startBaselineDrag}
          />
          <g
            className="ofc-baseline-knob"
            transform={`translate(${xMax + 3}, ${baselineY})`}
            onMouseDown={startBaselineDrag}
          >
            <rect x={0} y={-7} width={26} height={14} rx={7} fill="var(--button-background)" stroke="var(--border)" />
            <line x1={7} y1={-2.5} x2={19} y2={-2.5} strokeWidth={1} />
            <line x1={7} y1={0} x2={19} y2={0} strokeWidth={1} />
            <line x1={7} y1={2.5} x2={19} y2={2.5} strokeWidth={1} />
          </g>
          {baselineDragging && (
            <g pointerEvents="none">
              <rect
                x={xMax - 80}
                y={baselineY - 24}
                width={74}
                height={19}
                rx={4}
                fill="var(--button-background)"
                stroke="var(--border)"
              />
              <text
                x={xMax - 43}
                y={baselineY - 14.5}
                dy="0.32em"
                textAnchor="middle"
                fontSize={11}
                fill="var(--text)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatPrice(yScale.invert(baselineY))}
              </text>
            </g>
          )}
        </>
      )}

      {panes.map((p) => (
        <StudyPane
          key={p.inst.key}
          pane={p}
          axisLeft={parentWidth - marginRight}
          xMax={xMax}
          step={step}
          frac={frac}
          w0={w0}
          w1={w1}
          drawLo={drawLo}
          drawHi={drawHi}
          xScale={xScale}
          series={series}
          visible={visible}
          drawn={drawn}
          studyLines={studyLines}
          startPaneResize={startPaneResize}
          openStudyEditor={openStudyEditor}
          removeStudy={removeStudy}
        />
      ))}

      {/* invisible wide strokes above the drag plane so study lines take right-clicks */}
      <g clipPath="url(#chart_area_clip)">
        <g transform={`translate(${-frac * step}, 0)`}>
          {studyLines.filter(({ def }) => !def.renderAs).flatMap(({ inst, def, points }) =>
            (def.lines || [null]).map(l => (
              <polyline
                key={`${inst.key}-${l ? l.key : 'main'}`}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                pointerEvents="stroke"
                style={{ cursor: 'context-menu' }}
                onContextMenu={(e) => openStudyEditor(e, inst)}
                points={studyPointsAttr(l ? points.filter(p => p.line === l.key) : points,
                  { drawLo, drawHi, xScale, yScale, w0, step })}
              />
            ))
          )}
        </g>
        {studyLines.filter(({ def }) => def.renderAs === 'ribbon').map(({ inst }) => (
          <rect
            key={inst.key}
            x={0}
            y={plotBottom - 12}
            width={xMax}
            height={12}
            fill="transparent"
            style={{ cursor: 'context-menu' }}
            onContextMenu={(e) => openStudyEditor(e, inst)}
          />
        ))}
      </g>

      <CursorLayer
        svgRef={svgRef}
        xMax={xMax}
        yMax={yMax}
        plotBottom={plotBottom}
        marginRight={marginRight}
        series={series}
        w0={w0}
        frac={frac}
        step={step}
        maxIdx={maxIdx}
        yScale={yScale}
        fmtTime={fmtTime}
        showCrosshair={showCrosshair}
        showTooltip={showTooltip}
        showPriceDisplay={showPriceDisplay}
        stickToData={stickToData}
        hoveredBarRef={hoveredBarRef}
      />

      {showBrush && (
        <BrushStrip
          series={studySeries}
          w0={w0}
          w1={w1}
          maxIdx={maxIdx}
          setWindow={setWindow}
          setFrac={setFrac}
          xMax={xMax}
          top={chartHeight + brushGap}
        />
      )}

      {/* stacked 6px under the ticker chip, whose height tracks whether the
          daily-change line is shown (46px with it, 30px without). Rendered
          near the end of the svg so drawings and buy/sell markers paint
          underneath it, not over it */}
      <ScriptInfoPanel scriptResults={scriptResults}
        top={tickerQuote ? (tickerQuote.prevClose != null ? 62 : 46) : 10} />

      {/* hovered study tag re-rendered last so it sits above overlapping tags */}
      {(() => {
        const t = hoverStudyTag && studyAxisTags.find(x => x.id === hoverStudyTag);
        return t ? studyTagEl(t, xMax, marginRight) : null;
      })()}
    </svg>

    <DrawingMenu
      drawMenu={drawMenu}
      setDrawMenu={setDrawMenu}
      drawMenuRef={drawMenuRef}
      drawings={drawings}
      updateDrawing={updateDrawing}
      removeDrawing={removeDrawing}
      showFullTrades={showFullTrades}
      setShowFullTrades={setShowFullTrades}
    />
    <PositionEditDialog
      posEdit={posEdit}
      setPosEdit={setPosEdit}
      drawings={drawings}
      updateDrawing={updateDrawing}
    />
    <TextEditDialog
      textEdit={textEdit}
      setTextEdit={setTextEdit}
      drawings={drawings}
      updateDrawing={updateDrawing}
      removeDrawing={removeDrawing}
    />
    <TradeAmountDialog
      tradeEdit={tradeEdit}
      setTradeEdit={setTradeEdit}
      drawings={drawings}
      series={series}
      updateDrawing={updateDrawing}
      removeDrawing={removeDrawing}
    />
    <StudyEditorDialog
      editor={editor}
      setEditor={setEditor}
      editorRef={editorRef}
      scriptResults={scriptResults}
      customScripts={customScripts}
      saveScript={saveScript}
      setShowScriptEditor={setShowScriptEditor}
      setScriptEditorSelect={setScriptEditorSelect}
      updateStudy={updateStudy}
      removeStudy={removeStudy}
    />
    </>
  );
}

export default Chart;

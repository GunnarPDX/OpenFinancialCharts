// long/short position tools with target/stop drags and pnl pills
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) — see drawings/index.js
// (position keeps its own <g> shell: it adds select/dblclick handlers)

import startWindowDrag from '../startWindowDrag';
import { makeDel, anchors, TextChip } from './util';

export const position = (d, i, interactive, ctx) => {
  const { rankForTime, timeForRank, yScale, pxForRank, step, series, maxIdx, selDraw, setSelDraw, updateDrawing, setPosEdit } = ctx;
  const id = d.id;
  const del = makeDel(ctx, id);
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx] = anchors(d, ctx);
  // entry = first anchor; target/stop clamp to their own sides and drag
  // independently. Sizing comes from the double-click settings dialog.
  const isLong = d.type === 'long_pos';
  const dir = isLong ? 1 : -1;
  const x0 = Math.min(ax, bx), x1p = Math.max(ax, bx);
  const entryP = d.y1;
  const eps = Math.abs(entryP * 0.0005) || 0.01;
  // the placement click sets the SIZE — either drag direction works, the
  // profit zone always lands on the tool's correct side
  const targetP = entryP + dir * Math.max(eps, Math.abs(d.y2 - entryP));
  const stopRaw = d.stop != null ? d.stop : entryP - dir * Math.abs(d.y2 - entryP);
  const stopP = entryP - dir * Math.max(eps, -dir * (stopRaw - entryP));
  const tY = yScale(targetP), sY = yScale(stopP);
  const acct = d.acct != null ? d.acct : 1000;
  const lot = d.lot != null ? d.lot : 1;
  const riskV = d.risk != null ? d.risk : 5;
  const riskUnit = d.riskUnit || '%';
  const lev = d.lev != null ? d.lev : 1;
  const qp = d.qp != null ? d.qp : 'Default';
  const riskAmt = riskUnit === '%' ? (acct * riskV) / 100 : riskV;
  const perUnit = Math.abs(entryP - stopP) * lot || 1;
  let qtyV = riskAmt / perUnit;
  if (entryP > 0) qtyV = Math.min(qtyV, (acct * lev) / (entryP * lot));
  const qtyN = qp === 'Default' ? Math.round(qtyV * 100) / 100 : +qtyV.toFixed(+qp);
  const amtT = Math.abs(targetP - entryP) * qtyN * lot;
  const amtS = Math.abs(entryP - stopP) * qtyN * lot;
  const lastClose = series[maxIdx] ? series[maxIdx].close : entryP;
  const pnl = (lastClose - entryP) * dir * qtyN * lot;
  const rr = Math.abs(targetP - entryP) / (Math.abs(entryP - stopP) || 1);
  const ticksOf = (v) => Math.round(Math.abs(v - entryP) / 0.01).toLocaleString('en-US');
  const pctOf = (v) => `${Math.abs(((v - entryP) / (entryP || 1)) * 100).toFixed(3)}%`;
  const lastX = Math.max(x0, Math.min(x1p, pxForRank(maxIdx)));
  const selected = !interactive || selDraw === id;
  const cx2 = (x0 + x1p) / 2;
  const pill = (cy2, lines2, bg, key) => (
    <TextChip key={key} lines={lines2} x={cx2} y={cy2} bg={bg} border={false}
      textFill="#fff" pad={16} />
  );
  const dragPrice = (e, apply, basePx) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const startY = e.clientY;
    startWindowDrag((ev) => apply(yScale.invert(basePx + (ev.clientY - startY))));
  };
  const dragBody = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const sx2 = e.clientX, sy2 = e.clientY;
    const py1 = yScale(entryP), py2 = yScale(targetP), py3 = yScale(stopP);
    const r1 = rankForTime(d.x1), r2 = rankForTime(d.x2);
    startWindowDrag((ev) => {
      const dxp = ev.clientX - sx2, dyp = ev.clientY - sy2;
      updateDrawing(id, {
        x1: timeForRank(r1 + dxp / step),
        x2: timeForRank(r2 + dxp / step),
        y1: yScale.invert(py1 + dyp),
        y2: yScale.invert(py2 + dyp),
        stop: yScale.invert(py3 + dyp),
      });
    });
  };
  const dragTarget = (e) => dragPrice(e, (pr) => updateDrawing(id, { y2: entryP + dir * Math.max(eps, dir * (pr - entryP)) }), tY);
  const dragStop = (e) => dragPrice(e, (pr) => updateDrawing(id, { stop: entryP - dir * Math.max(eps, -dir * (pr - entryP)) }), sY);
  const dragEntry = (e) => dragPrice(e, (pr) => updateDrawing(id, { y1: pr }), ay);
  const handle = (hx, hy, onDown, key) => (
    <rect key={key} x={hx - 3} y={hy - 3} width={6} height={6} rx={1} fill="#3b82f6"
      stroke="none" style={{ cursor: 'ns-resize' }}
      pointerEvents={interactive ? 'all' : 'none'} onMouseDown={interactive ? onDown : undefined} />
  );
  const openPosEdit = (e) => {
    e.stopPropagation();
    setPosEdit({
      id,
      x: Math.min(e.clientX, window.innerWidth - 260),
      y: Math.max(10, Math.min(e.clientY, window.innerHeight - 560)),
      form: { acct, lot, risk: riskV, riskUnit, entry: entryP, lev, tp: targetP, sl: stopP, qp },
    });
  };
  return (
    <g key={i} onContextMenu={interactive ? del : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); setSelDraw(id); } : undefined}
      onDoubleClick={interactive ? openPosEdit : undefined} style={{ cursor: 'context-menu' }}>
      <rect x={x0} y={Math.min(ay, tY)} width={x1p - x0} height={Math.abs(tY - ay) || 1}
        fill="var(--green)" fillOpacity={0.14} stroke="none" />
      <rect x={x0} y={Math.min(ay, sY)} width={x1p - x0} height={Math.abs(sY - ay) || 1}
        fill="var(--red)" fillOpacity={0.14} stroke="none" />
      {pnl >= 0 ? (
        <rect x={x0} y={Math.min(ay, tY)} width={lastX - x0} height={Math.abs(tY - ay) || 1}
          fill="var(--green)" fillOpacity={0.12} stroke="none" />
      ) : (
        <rect x={x0} y={Math.min(ay, sY)} width={lastX - x0} height={Math.abs(sY - ay) || 1}
          fill="var(--red)" fillOpacity={0.12} stroke="none" />
      )}
      {selected && <line x1={x0} x2={x1p} y1={tY} y2={tY} stroke="var(--green)" strokeWidth={1} opacity={0.7} />}
      {selected && <line x1={x0} x2={x1p} y1={sY} y2={sY} stroke="var(--red)" strokeWidth={1} opacity={0.7} />}
      <line x1={x0} x2={x1p} y1={ay} y2={ay} stroke={stroke} strokeWidth={1.2} />
      <line x1={x0} y1={ay} x2={Math.max(x0, Math.min(x1p, pxForRank(maxIdx)))} y2={yScale(lastClose)}
        stroke={stroke} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
      {selected && pill(tY - dir * 12, [
        `Target: ${Math.abs(targetP - entryP).toFixed(2)} (${pctOf(targetP)}) ${ticksOf(targetP)}, Amount: ${amtT.toFixed(2)}`,
      ], 'var(--green)', 'pt')}
      {selected && pill(ay, [
        `Closed PnL: ${pnl < 0 ? '\u2212' : ''}${Math.abs(pnl).toFixed(2)}, Qty: ${qtyN}`,
        `Risk/reward ratio: ${rr.toFixed(2)}`,
      ], pnl >= 0 ? 'var(--green)' : 'var(--red)', 'pe')}
      {selected && pill(sY + dir * 12, [
        `Stop: ${Math.abs(entryP - stopP).toFixed(2)} (${pctOf(stopP)}) ${ticksOf(stopP)}, Amount: ${amtS.toFixed(2)}`,
      ], 'var(--red)', 'ps')}
      <rect x={x0} y={Math.min(tY, sY)} width={x1p - x0} height={Math.abs(sY - tY) || 1}
        fill="transparent" stroke="none" pointerEvents={interactive ? 'all' : 'none'}
        style={selected && interactive ? { cursor: 'move' } : undefined}
        onMouseDown={selected && interactive ? dragBody : undefined} />
      {selected && interactive && (
        <>
          <line x1={x0} x2={x1p} y1={tY} y2={tY} stroke="transparent" strokeWidth={9}
            style={{ cursor: 'ns-resize' }} pointerEvents="stroke" onMouseDown={dragTarget} />
          <line x1={x0} x2={x1p} y1={sY} y2={sY} stroke="transparent" strokeWidth={9}
            style={{ cursor: 'ns-resize' }} pointerEvents="stroke" onMouseDown={dragStop} />
          {handle(x0, tY, dragTarget, 'ht')}
          {handle(x0, ay, dragEntry, 'he1')}
          {handle(x1p, ay, dragEntry, 'he2')}
          {handle(x0, sY, dragStop, 'hs')}
        </>
      )}
    </g>
  );
};

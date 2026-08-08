// text-carrying drawings: labels, notes, pins, tables, callouts
// extracted verbatim from the ChartBodyWithZoom renderDrawing if-chain;
// each renderer receives (d, i, interactive, ctx) — see drawings/index.js
// (textFamily and callout keep their own <g> shell: extra handlers and
// per-branch cursors; priceNote returns bare children for the shared shell)

import startWindowDrag from '../startWindowDrag';
import { makeDel, anchors, hitStroke, TextChip, TradeChip, fmtQty } from './util';

export const textFamily = (d, i, interactive, ctx) => {
  const { pxForTime, rankForTime, timeForRank, yScale, step, series, maxIdx, selDraw, setSelDraw, updateDrawing, openTextEdit, openTradeEdit, showFullTrades, hoverTrade, setHoverTrade } = ctx;
  const id = d.id;
  const del = makeDel(ctx, id);
  const stroke = d.color || 'var(--dots-color)';
  const x = pxForTime(d.t), y = yScale(d.p);
  const lines2 = (d.text || '').split('\n');
  const maxLen = Math.max(1, ...lines2.map(t2 => t2.length));
  const sel = selDraw === id;
  const openEdit = (e) => { e.stopPropagation(); openTextEdit(id, e.clientX, e.clientY, d.text || '', false); };
  const select = (e) => { e.stopPropagation(); setSelDraw(id); };
  const bubble = (bx2, by2, txtLines, key) => (
    <TextChip key={key} lines={txtLines} x={bx2} y={by2} yAnchor="bottom" stroke={stroke}
      bg="var(--menu-background)" bgOpacity={0.95} textFill="var(--text)"
      mult={5.2} pad={16} hPad={8} rx={4} fontSize={9} borderWidth={1.2} borderOpacity={1} />
  );
  const dragAnchor = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const sx2 = e.clientX, sy2 = e.clientY;
    const r0d = rankForTime(d.t), py = yScale(d.p);
    startWindowDrag((ev) => updateDrawing(id, {
      t: timeForRank(r0d + (ev.clientX - sx2) / step),
      p: yScale.invert(py + (ev.clientY - sy2)),
    }));
  };
  const draggable = ['pin', 'price_label', 'flag', 'buy_marker', 'sell_marker'].includes(d.type);
  const common = {
    onContextMenu: interactive ? del : undefined,
    onDoubleClick: interactive && !['price_label', 'flag', 'price_note', 'buy_marker', 'sell_marker'].includes(d.type) ? openEdit : undefined,
    onClick: interactive ? select : undefined,
    onMouseDown: interactive && draggable ? dragAnchor : undefined,
  };
  if (d.type === 'txt') {
    return (
      <g key={i} {...common} style={{ cursor: 'text' }}>
        {lines2.map((t2, k2) => (
          <text key={k2} x={x} y={y + k2 * 13} fontSize={11} fill={stroke} stroke="none">{t2}</text>
        ))}
        <rect x={x - 3} y={y - 11} width={maxLen * 6.4 + 6} height={lines2.length * 13 + 6}
          fill="transparent" stroke={sel ? stroke : 'none'} strokeDasharray="3,3" strokeOpacity={0.5}
          pointerEvents={interactive ? 'all' : 'none'} />
      </g>
    );
  }
  if (d.type === 'note') {
    return (
      <g key={i} {...common} style={{ cursor: 'pointer' }}>
        {sel && bubble(x, y - 22, lines2, 'b')}
        <path d={`M${x - 7},${y - 16} h9 l5,5 v11 h-14 z`} fill="var(--menu-background)" stroke={stroke} strokeWidth={1.4} />
        <path d={`M${x + 2},${y - 16} v5 h5`} fill="none" stroke={stroke} strokeWidth={1.2} />
        <rect x={x - 9} y={y - 18} width={18} height={20} fill="transparent" stroke="none"
          pointerEvents={interactive ? 'all' : 'none'} />
      </g>
    );
  }
  if (d.type === 'pin') {
    return (
      <g key={i} {...common} style={{ cursor: 'move' }}>
        {sel && bubble(x, y - 26, lines2, 'b')}
        <path d={`M${x},${y} c-5,-6 -6,-8 -6,-12 a6,6 0 1,1 12,0 c0,4 -1,6 -6,12 z`}
          fill={stroke} fillOpacity={0.9} stroke={stroke} strokeWidth={1} />
        <circle cx={x} cy={y - 12} r={2.4} fill="var(--menu-background)" stroke="none" />
      </g>
    );
  }
  if (d.type === 'tableD') {
    const rows = lines2.map(r => r.split('|'));
    const nCols = Math.max(...rows.map(r => r.length));
    const colW = [];
    for (let c = 0; c < nCols; c++) {
      colW.push(Math.max(3, ...rows.map(r => (r[c] || '').length)) * 5.6 + 14);
    }
    const rowH = 17;
    const totW = colW.reduce((a2, b2) => a2 + b2, 0);
    const colX = colW.reduce((acc, w2) => [...acc, acc[acc.length - 1] + w2], [0]);
    return (
      <g key={i} {...common} style={{ cursor: 'pointer' }}>
        <rect x={x} y={y} width={totW} height={rows.length * rowH} rx={3}
          fill="var(--menu-background)" fillOpacity={0.95} stroke={stroke} strokeWidth={1.3} />
        {rows.slice(1).map((r, k2) => (
          <line key={`h${k2}`} x1={x} x2={x + totW} y1={y + (k2 + 1) * rowH} y2={y + (k2 + 1) * rowH}
            stroke={stroke} strokeWidth={0.8} opacity={0.6} />
        ))}
        {colX.slice(1, -1).map((cx3, k2) => (
          <line key={`v${k2}`} x1={x + cx3} x2={x + cx3} y1={y} y2={y + rows.length * rowH}
            stroke={stroke} strokeWidth={0.8} opacity={0.6} />
        ))}
        {rows.map((r, rI) => r.map((cell, cI) => (
          <text key={`c${rI}-${cI}`} x={x + colX[cI] + 7} y={y + rI * rowH + rowH / 2} dy="0.34em"
            fontSize={9} fill="var(--text)" stroke="none">{cell}</text>
        )))}
      </g>
    );
  }
  if (d.type === 'comment') {
    const w2 = maxLen * 5.2 + 16;
    const h2 = lines2.length * 12 + 8;
    return (
      <g key={i} {...common} style={{ cursor: 'pointer' }}>
        <polygon points={`${x},${y} ${x - 5},${y - 9} ${x + 5},${y - 9}`} fill={stroke} stroke="none" />
        <rect x={x - w2 / 2} y={y - 9 - h2} width={w2} height={h2} rx={4}
          fill="var(--menu-background)" fillOpacity={0.95} stroke={stroke} strokeWidth={1.3} />
        {lines2.map((t2, k2) => (
          <text key={k2} x={x} y={y - 9 - h2 + 10 + k2 * 12} dy="0.34em" textAnchor="middle"
            fontSize={9} fill="var(--text)" stroke="none">{t2}</text>
        ))}
      </g>
    );
  }
  if (d.type === 'buy_marker' || d.type === 'sell_marker') {
    const title = d.type === 'buy_marker' ? 'BUY' : 'SELL';
    const bar = series[Math.max(0, Math.min(maxIdx, Math.round(rankForTime(d.t))))];
    // priceSource anchors the marker to the bar's open/high/low/close;
    // 'custom' keeps the user-entered price in d.p
    const src = d.priceSource || 'close';
    const price = src === 'custom' ? d.p : (bar ? bar[src] : d.p);
    const yM = Number.isFinite(price) ? yScale(price) : y;
    const cash = d.qty * price;
    const collapsed = !showFullTrades && hoverTrade !== id;
    const rows = collapsed ? [] : [
      ['qty:', fmtQty(d.qty)],
      ['val:', Number.isFinite(cash) ? `$${fmtQty(cash)}` : '—'],
      [src === 'custom' ? 'price:' : `${src}:`, Number.isFinite(price) ? price.toFixed(2) : '—'],
    ];
    const openAmt = (e) => {
      e.stopPropagation();
      openTradeEdit(id, e.clientX, e.clientY, { mode: 'qty', value: d.qty ?? '' });
    };
    return (
      <g key={i} {...common} onDoubleClick={interactive ? openAmt : undefined}
        onMouseEnter={interactive && !showFullTrades ? () => setHoverTrade(id) : undefined}
        onMouseLeave={interactive && !showFullTrades ? () => setHoverTrade(null) : undefined}
        style={{ cursor: 'move' }}>
        <TradeChip x={x} y={yM} stroke={stroke} title={title} rows={rows} selected={sel} />
      </g>
    );
  }
  if (d.type === 'price_label') {
    const txt = d.p.toFixed(2);
    const w2 = txt.length * 5.6 + 14;
    return (
      <g key={i} {...common} style={{ cursor: 'move' }}>
        <polygon points={`${x},${y} ${x - 4},${y - 8} ${x + 4},${y - 8}`} fill={stroke} stroke="none" />
        <rect x={x - w2 / 2} y={y - 8 - 16} width={w2} height={16} rx={8}
          fill="var(--menu-background)" stroke={stroke} strokeWidth={1.3} />
        <text x={x} y={y - 16} dy="0.34em" textAnchor="middle" fontSize={9}
          fill={stroke} stroke="none">{txt}</text>
      </g>
    );
  }
  // flag
  return (
    <g key={i} {...common} style={{ cursor: 'move' }}>
      <line x1={x} y1={y} x2={x} y2={y - 18} stroke={stroke} strokeWidth={1.6} />
      <path d={`M${x},${y - 18} h11 l-3,3.5 3,3.5 h-11 z`} fill={stroke} fillOpacity={0.9} stroke="none" />
      <circle cx={x} cy={y} r={1.8} fill={stroke} />
      <rect x={x - 4} y={y - 20} width={17} height={22} fill="transparent" stroke="none"
        pointerEvents={interactive ? 'all' : 'none'} />
    </g>
  );
};

export const priceNote = (d, i, interactive, ctx) => {
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const txt = d.y1.toFixed(2);
  const w2 = txt.length * 5.6 + 14;
  return (
    <>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1} strokeDasharray="3,3" />
      <circle cx={ax} cy={ay} r={2.5} fill={stroke} />
      <rect x={bx - (bx >= ax ? 0 : w2)} y={by - 16} width={w2} height={16} rx={3}
        fill="var(--menu-background)" fillOpacity={0.95} stroke={stroke} strokeWidth={1.2}
        pointerEvents={interactive ? 'all' : 'none'} />
      <text x={bx + (bx >= ax ? w2 / 2 : -w2 / 2)} y={by - 8} dy="0.34em" textAnchor="middle"
        fontSize={9} fill={stroke} stroke="none">{txt}</text>
      {hitStroke({ x1: ax, y1: ay, x2: bx, y2: by }, interactive)}
    </>
  );
};

export const callout = (d, i, interactive, ctx) => {
  const { openTextEdit } = ctx;
  const id = d.id;
  const del = makeDel(ctx, id);
  const stroke = d.color || 'var(--dots-color)';
  const [ax, ay, bx, by] = anchors(d, ctx);
  const lines2 = (d.text || '').split('\n');
  const w2 = Math.max(1, ...lines2.map(t2 => t2.length)) * 5.2 + 18;
  const h2 = lines2.length * 12 + 10;
  const openEdit = (e) => { e.stopPropagation(); openTextEdit(id, e.clientX, e.clientY, d.text || '', false); };
  return (
    <g key={i} onContextMenu={interactive ? del : undefined}
      onDoubleClick={interactive ? openEdit : undefined} style={{ cursor: 'pointer' }}>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={stroke} strokeWidth={1.2} />
      <circle cx={ax} cy={ay} r={2.5} fill={stroke} />
      <rect x={bx - w2 / 2} y={by - h2 / 2} width={w2} height={h2} rx={4}
        fill="var(--menu-background)" fillOpacity={0.95} stroke={stroke} strokeWidth={1.4}
        pointerEvents={interactive ? 'all' : 'none'} />
      {lines2.map((t2, k2) => (
        <text key={k2} x={bx} y={by - h2 / 2 + 11 + k2 * 12} dy="0.34em" textAnchor="middle"
          fontSize={9} fill="var(--text)" stroke="none">{t2}</text>
      ))}
    </g>
  );
};

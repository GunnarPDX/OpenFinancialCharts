// shared right-click handler: opens the drawing context menu clamped on-screen
export const makeDel = (ctx, id) => (e) => {
  e.preventDefault();
  ctx.setDrawMenu({ id, x: Math.min(e.clientX, window.innerWidth - 260), y: Math.min(e.clientY, window.innerHeight - 150) });
};

// px-space anchors of a two-point drawing: [ax, ay, bx, by]
export const anchors = (d, ctx) => [
  ctx.pxForTime(d.x1), ctx.yScale(d.y1), ctx.pxForTime(d.x2), ctx.yScale(d.y2),
];

// invisible fat companion element that catches pointer events for thin marks;
// the tag is inferred from the geometry props (d → path, points → polyline,
// r → circle, width → rect, else line)
export const hitStroke = (props, interactive) => {
  const Tag = props.d != null ? 'path' : props.points != null ? 'polyline'
    : props.r != null ? 'circle' : props.width != null ? 'rect' : 'line';
  return (
    <Tag {...(Tag === 'line' ? null : { fill: 'none' })} {...props}
      stroke="transparent" strokeWidth={9} pointerEvents={interactive ? 'stroke' : 'none'} />
  );
};

// quantity display for buy/sell trade chips: whole-ish amounts get 2 decimals,
// sub-unit amounts keep 4 so small crypto/fractional quantities don't read as 0
export const fmtQty = (q) => {
  if (!Number.isFinite(q)) return '—';
  const a = Math.abs(q);
  return String(a >= 1000 ? Math.round(q).toLocaleString() : a >= 1 ? +q.toFixed(2) : +q.toFixed(4));
};

// the BUY/SELL trade chip: pointer triangle at (x, y), squared-corner box
// above with a bold title and label/value rows split by subtle separators.
// Shared by the buy/sell drawing tools and script plotbuy()/plotsell() marks;
// extra props (pointer-events, hover handlers) land on the chip's rect
export const TradeChip = ({ x, y, stroke, title, rows, selected = false, rectProps }) => {
  const w2 = Math.max(title.length * 5.6, ...rows.map(([l, v]) => (l.length + v.length) * 5.6 + 10)) + 14;
  const h2 = 16 + rows.length * 11;
  return (
    <>
      <polygon points={`${x},${y} ${x - 4},${y - 8} ${x + 4},${y - 8}`} fill={stroke} stroke="none" />
      <rect x={x - w2 / 2} y={y - 8 - h2} width={w2} height={h2} rx={2}
        fill="var(--menu-background)" stroke={stroke} strokeWidth={selected ? 2 : 1.3} {...rectProps} />
      <text x={x} y={y - 8 - h2 + 8} dy="0.34em" textAnchor="middle" fontSize={9} fontWeight={700}
        fill={stroke} stroke="none">{title}</text>
      {rows.map(([label, value], k2) => (
        <g key={k2} pointerEvents="none">
          <line x1={x - w2 / 2 + 3} x2={x + w2 / 2 - 3}
            y1={y - 8 - h2 + 13.5 + k2 * 11} y2={y - 8 - h2 + 13.5 + k2 * 11}
            stroke={stroke} strokeWidth={0.8} opacity={0.25} />
          <text x={x - w2 / 2 + 6} y={y - 8 - h2 + 19 + k2 * 11} dy="0.34em" textAnchor="start"
            fontSize={8.5} fill="var(--text)" stroke="none">{label}</text>
          <text x={x + w2 / 2 - 6} y={y - 8 - h2 + 19 + k2 * 11} dy="0.34em" textAnchor="end"
            fontSize={8.5} fill="var(--text)" stroke="none">{value}</text>
        </g>
      ))}
    </>
  );
};

// stats chip / pill: text lines centered on a rounded rect sized by the
// char-width heuristic (longest line * mult + pad) unless w/h are given;
// y is the rect's vertical center, or its bottom edge with yAnchor="bottom"
export const TextChip = ({
  lines, x, y, stroke, w, h, bg = 'var(--button-background)', bgOpacity,
  textFill, mult = 4.7, pad = 14, hPad = 4, rx = 3, fontSize = 8,
  border = true, borderWidth = 1, borderOpacity = 0.45, yAnchor = 'center',
}) => {
  const w2 = w != null ? w : Math.max(1, ...lines.map(t2 => t2.length)) * mult + pad;
  const h2 = h != null ? h : lines.length * 12 + hPad;
  const top = yAnchor === 'bottom' ? y - h2 : y - h2 / 2;
  const off = (h2 - (lines.length - 1) * 12) / 2;
  return (
    <g>
      <rect x={x - w2 / 2} y={top} width={w2} height={h2} rx={rx}
        fill={bg} fillOpacity={bgOpacity} stroke={border ? stroke : 'none'}
        strokeOpacity={border ? borderOpacity : undefined}
        strokeWidth={border ? borderWidth : undefined} />
      {lines.map((t2, k2) => (
        <text key={k2} x={x} y={top + off + k2 * 12} dy="0.34em" textAnchor="middle"
          fontSize={fontSize} fill={textFill || stroke} stroke="none">{t2}</text>
      ))}
    </g>
  );
};

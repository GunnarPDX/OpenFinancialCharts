// pure constant tables and geometry helpers for the chart drawing tools —
// module scope so they aren't recreated on every render of the chart body

export const FORK_TOOLS = ['pitchfork', 'schiff', 'mschiff', 'inside_fork'];
export const TRIPLE_TOOLS = [...FORK_TOOLS, 'rrect', 'arc', 'channel', 'flattb', 'disjoint', 'fibext', 'fib_channel', 'fibtime3', 'fib_wedge', 'pitchfan', 'sector', 'bars_copy'];
export const PATTERN_N = {
  xabcd: 5, cypher: 5, head_shoulders: 7, abcd: 4, triangle_pattern: 4, three_drives: 6,
  ell_impulse: 6, ell_correction: 4, ell_triangle: 6, ell_double: 4, ell_triple: 6,
};
export const PATTERN_LABELS = {
  xabcd: ['X', 'A', 'B', 'C', 'D'],
  cypher: ['X', 'A', 'B', 'C', 'D'],
  abcd: ['A', 'B', 'C', 'D'],
  triangle_pattern: ['A', 'B', 'C', 'D'],
  head_shoulders: ['', 'LS', '', 'H', '', 'RS', ''],
  three_drives: ['', '1', 'A', '2', 'B', '3'],
  ell_impulse: ['0', '1', '2', '3', '4', '5'],
  ell_correction: ['0', 'A', 'B', 'C'],
  ell_triangle: ['0', 'A', 'B', 'C', 'D', 'E'],
  ell_double: ['0', 'W', 'X', 'Y'],
  ell_triple: ['0', 'W', 'X', 'Y', 'X', 'Z'],
};
export const MULTI_CLICK = [...TRIPLE_TOOLS, 'poly', 'polygon', 'ghost', ...Object.keys(PATTERN_N)];
export const TEXT_PLACE = ['txt', 'note', 'pin', 'tableD', 'comment', 'price_label', 'flag'];
export const TEXT_DEFAULTS = {
  txt: 'Text', note: 'Note', pin: 'Pin',
  tableD: 'Cell|Cell\nCell|Cell', comment: 'Comment', callout: 'Point note',
};

// shared fib/gann level palette (own scheme: fuchsia→violet→blue→emerald→
// yellow→orange, grey bounds, red extensions)
export const FIB_COLORS = {
  0: '#8f8f98', 1: '#8f8f98',
  0.236: '#e879f9', 0.25: '#e879f9',
  0.382: '#a78bfa',
  0.5: '#60a5fa',
  0.618: '#34d399',
  0.75: '#facc15',
  0.786: '#fb923c',
  1.618: '#f87171', 2.618: '#ef4444',
};
export const fibColor = (l) => FIB_COLORS[l] || '#8f8f98';
export const FIB_CYCLE = ['#e879f9', '#a78bfa', '#60a5fa', '#34d399', '#facc15', '#fb923c', '#f87171'];

// pitchfork family geometry in px space: origin, median target, tine anchors.
// `reach` is how far past the anchors the tines extend (callers pass
// (xMax + plotBottom) * 2 so lines always overshoot the clip region)
export const forkGeometry = (type, p1, p2, p3, reach) => {
  const m = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
  let o = p1, t1 = p2, t2 = p3;
  if (type === 'schiff') o = { x: p1.x, y: (p1.y + p2.y) / 2 };
  else if (type === 'mschiff') o = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  else if (type === 'inside_fork') {
    t1 = { x: (p2.x + m.x) / 2, y: (p2.y + m.y) / 2 };
    t2 = { x: (p3.x + m.x) / 2, y: (p3.y + m.y) / 2 };
  }
  const dx = m.x - o.x, dy = m.y - o.y;
  const k = reach / (Math.hypot(dx, dy) || 1);
  return { o, m, t1, t2, dx, dy, k };
};

// quadratic curves through segment midpoints — freehand reads smooth
export const smoothPath = (pts) => {
  if (!pts.length) return '';
  if (pts.length < 3) return `M${pts.map(q => `${q.x},${q.y}`).join(' L')}`;
  let path = `M${pts[0].x},${pts[0].y}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const mx = (pts[k].x + pts[k + 1].x) / 2;
    const my = (pts[k].y + pts[k + 1].y) / 2;
    path += ` Q${pts[k].x},${pts[k].y} ${mx},${my}`;
  }
  const last = pts[pts.length - 1];
  path += ` L${last.x},${last.y}`;
  return path;
};

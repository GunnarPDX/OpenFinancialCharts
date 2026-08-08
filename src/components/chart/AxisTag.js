// axis price-tag pill: the rounded rect hugging the right axis with a small
// price/label text. Renders a fragment so callers keep their own wrapping
// <g> (keys, pointerEvents) and the DOM stays exactly as before.
const AxisTag = ({
  x, y, width, label,
  color, // rect stroke; omit for stroke-less tags (last-close marker)
  fill = 'var(--button-background)',
  textFill = 'var(--text)',
  height = 14,
  fontSize = 9,
  textDx = 5, // text inset from the rect's left edge
}) => (
  <>
    <rect
      x={x}
      y={y - height / 2}
      width={width}
      height={height}
      rx={3}
      fill={fill}
      stroke={color}
      strokeWidth={color ? 1 : undefined}
    />
    <text
      x={x + textDx}
      y={y}
      dy="0.32em"
      fontSize={fontSize}
      fill={textFill}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {label}
    </text>
  </>
);

export default AxisTag;

// Per-instance style overrides for a study's plotted line(s), set from the
// right-click study editor and persisted on the instance:
//   inst.lineColors — { [lineKey]: color }, keyed 'main' for single-line studies
//   inst.lineWidth  — one stroke width shared by every line of the instance
// Both fall back to the study definition's colors/widths when unset.
export const lineColorOf = (inst, l) =>
  (inst.lineColors && inst.lineColors[(l && l.key) || 'main'])
  || (l && l.color)
  || inst.color;

export const lineWidthOf = (inst, fallback = 2) => inst.lineWidth || fallback;

import React from 'react';
import startWindowDrag from '../startWindowDrag';
import { studies } from '../../../studies';

// Sidebar strips for profile studies flipped to sidebar mode (right-click →
// Sidebar Panel): each reserves its own vertical strip between the plot and
// the y axis — the vertical cousin of the oscillators' bottom panes, and
// like the panes they stack instead of overlapping. The first activated sits
// closest to the axis, later ones extend left. Strips get their persisted
// width (params.sidebarWidth, default SIDEBAR_WIDTH) until the pack would
// exceed half the plot, then all scale down proportionally.
const SIDEBAR_WIDTH = 140;
const SIDEBAR_MIN_WIDTH = 40;
const SIDEBAR_MAX_WIDTH = 400;

const isSidebarProfile = (inst) => !inst.hidden && inst.params?.sidebar
  && studies.find(d => d.id === inst.id)?.renderAs === 'profile';

const storedWidth = (inst) =>
  Math.max(SIDEBAR_MIN_WIDTH, inst.params.sidebarWidth ?? SIDEBAR_WIDTH);

const useSidebarSlots = ({ activeStudies, xMax, updateStudy }) => {
  // transient width override while a strip's left-edge grip is being dragged
  // (committing per mousemove would re-bucket every profile once per frame)
  const [stripResize, setStripResize] = React.useState(null); // { key, w }

  const sidebarSlots = React.useMemo(() => {
    const insts = activeStudies.filter(isSidebarProfile);
    if (!insts.length) return null;
    const widths = insts.map(inst =>
      (stripResize?.key === inst.key ? Math.max(SIDEBAR_MIN_WIDTH, stripResize.w) : storedWidth(inst)));
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = total > xMax * 0.5 ? (xMax * 0.5) / total : 1;
    const slots = new Map();
    let edge = xMax;
    insts.forEach((inst, i) => {
      const w = Math.floor(widths[i] * scale);
      edge -= w;
      slots.set(inst.key, { x: edge, w });
    });
    return slots;
  }, [activeStudies, xMax, stripResize]);

  const sidebarW = sidebarSlots
    ? [...sidebarSlots.values()].reduce((sum, s) => sum + s.w, 0)
    : 0;

  // drag the left edge of a strip to resize it — the strip's right edge
  // stays put, so pulling left widens it (the panes' height-resize gesture,
  // rotated). Committed once on release; the committed value is the WIDTH
  // ACTUALLY DISPLAYED (post-scale), so a drag capped by the half-plot limit
  // doesn't rubber-band on the next layout.
  const startStripResize = (e, key) => {
    e.stopPropagation();
    const slot = sidebarSlots?.get(key);
    if (!slot) return;
    const startX = e.clientX;
    const startW = slot.w;
    let lastW = startW;
    startWindowDrag((ev) => {
      lastW = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startW + (startX - ev.clientX)));
      setStripResize({ key, w: lastW });
    }, () => {
      const inst = activeStudies.find(s => s.key === key);
      if (inst) {
        const others = activeStudies
          .filter(s => s.key !== key && isSidebarProfile(s))
          .reduce((sum, s) => sum + storedWidth(s), 0);
        const scale = Math.min(1, (xMax * 0.5) / (others + lastW));
        const sidebarWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.floor(lastW * scale));
        updateStudy(key, { params: { ...inst.params, sidebarWidth } });
      }
      setStripResize(null);
    });
  };

  return { sidebarSlots, sidebarW, startStripResize };
};

export default useSidebarSlots;

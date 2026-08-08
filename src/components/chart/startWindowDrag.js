// window-level drag gesture: attach mousemove/mouseup listeners and remove
// both on mouseup. Centralizes the pattern hand-rolled at every drag site
// (level drag, avwap drag, pane resize, position drags, ...).
// The mouseup can be missed when the button is released outside the browser
// window, so a move reporting no pressed buttons counts as an up, and a
// window blur also ends the drag. Returns a cancel function so a caller can
// tear the listeners down early (e.g. on unmount).
const startWindowDrag = (onMove, onUp) => {
  const teardown = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    window.removeEventListener('blur', onBlur);
  };
  const move = (ev) => {
    if (ev.buttons === 0) { up(ev); return; }
    onMove(ev);
  };
  const up = (ev) => {
    teardown();
    if (onUp) onUp(ev);
  };
  const onBlur = (ev) => {
    teardown();
    if (onUp) onUp(ev);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  window.addEventListener('blur', onBlur);
  return teardown;
};

export default startWindowDrag;

import React from 'react';
import ColorPop, { PRESETS } from './ColorPop';
import useClickOutside from '../../utils/useClickOutside';

// swatch button opening a grid of suggested colors, with a "Custom…" escape
// hatch into the native color input
export { PRESETS };

const POP_W = 252;
const POP_H = 132;

const ColorPicker = ({ value, onChange, drop = 'right', swatchClassName = 'ofc-color-swatch', palette }) => {
  const [open, setOpen] = React.useState(false); // false | {left, top}
  const ref = React.useRef(null);

  const toggle = () => {
    if (open) return setOpen(false);
    const r = ref.current.getBoundingClientRect();
    // fixed positioning so parent menus with overflow scrolling can't clip it
    const left = drop === 'right' ? r.right + 6 : r.right - POP_W;
    const top = drop === 'right' ? r.top : r.bottom + 6;
    setOpen({
      left: Math.max(4, Math.min(left, window.innerWidth - POP_W - 4)),
      top: Math.max(4, Math.min(top, window.innerHeight - POP_H - 4)),
    });
  };

  useClickOutside(ref, () => setOpen(false), !!open);

  return (
    <span className="ofc-color-picker" ref={ref}>
      <button
        type="button"
        className={swatchClassName}
        style={{ background: value }}
        onClick={toggle}
      />
      {open && (
        <ColorPop
          value={value}
          onPick={onChange}
          onClose={() => setOpen(false)}
          left={open.left}
          top={open.top}
          palette={palette}
        />
      )}
    </span>
  );
};

export default ColorPicker;

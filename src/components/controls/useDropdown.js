import React from 'react';
import useClickOutside from '../../utils/useClickOutside';

// shared dropdown scaffold: open state + a root ref whose outside clicks
// close the menu. `onClose` (optional) runs alongside the outside-click
// close for menus with extra state tied to closing.
export default function useDropdown(onClose) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  useClickOutside(ref, () => {
    setOpen(false);
    if (onClose) onClose();
  }, open);

  return { open, setOpen, ref };
}

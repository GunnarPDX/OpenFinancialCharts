import React from 'react';
import IconButton from './IconButton';

// shared dropdown shell around useDropdown: an icon-button trigger toggling
// `open`, the menu while open, and any extra siblings (popups, hover cards)
// via `after`. `onToggle` (optional) runs alongside the trigger toggle.
const Dropdown = ({ open, setOpen, rootRef, trigger, onToggle, menuClassName, menuRef, after, children }) => (
  <div className="ofc-dropdown" ref={rootRef}>
    <IconButton onClick={() => { setOpen(o => !o); if (onToggle) onToggle(); }}>
      {trigger}
    </IconButton>
    {open && (
      <div className={`ofc-dropdown-menu${menuClassName ? ` ${menuClassName}` : ''}`} ref={menuRef}>
        {children}
      </div>
    )}
    {after}
  </div>
);

export default Dropdown;

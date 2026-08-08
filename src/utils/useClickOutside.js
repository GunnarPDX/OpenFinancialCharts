import React from 'react';

// shared outside-click dismissal: while `active`, a document-level mousedown
// anywhere outside ref.current calls onClose(event)
export default function useClickOutside(ref, onClose, active = true) {
  const cbRef = React.useRef(onClose);
  cbRef.current = onClose;
  React.useEffect(() => {
    if (!active) return undefined;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cbRef.current(e);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, active]);
}

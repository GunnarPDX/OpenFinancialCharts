import React from 'react';

// floating card shell for useHoverCard: positioned beside the menu and
// clamped to the viewport by the hook via cardRef
const HoverCard = ({ hover, cardRef, children }) => (
  <div className="ofc-study-editor ofc-study-hovercard" ref={cardRef} style={{ left: hover.x, top: hover.y }}>
    {children}
  </div>
);

export default HoverCard;

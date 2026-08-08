import React from 'react';

// hover cards for menu rows: positioned beside the menu (left when there is
// room, right otherwise) and clamped to the viewport once rendered
const CARD_W = 220;

export default function useHoverCard(menuRef) {
  const [hover, setHover] = React.useState(null); // { ...data, x, y }
  const cardRef = React.useRef(null);

  const showCard = (e, data) => {
    const menu = menuRef.current?.getBoundingClientRect();
    if (!menu) return;
    const x = menu.left - CARD_W - 10 > 0 ? menu.left - CARD_W - 10 : menu.right + 10;
    setHover({ ...data, x, y: e.currentTarget.getBoundingClientRect().top });
  };

  // clamp the card to the viewport using its real rendered height
  React.useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !hover) return;
    const r = el.getBoundingClientRect();
    const ny = Math.max(8, Math.min(hover.y, window.innerHeight - r.height - 10));
    if (ny !== hover.y) setHover(h => ({ ...h, y: ny }));
  }, [hover]);

  return { hover, setHover, showCard, cardRef };
}

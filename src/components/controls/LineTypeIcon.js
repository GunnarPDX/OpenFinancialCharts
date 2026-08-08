import React from 'react';

const I = ({ children }) => (
  <svg
    className="ofc-line-icon"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const LineTypeIcon = ({ type }) => {
  // plain/solid variants stay monochrome like the chart; the rest wear the
  // chart's own colors
  const plain = type.endsWith('_solid') || type.includes('_plain');
  const up = plain ? 'currentColor' : 'var(--green)';
  const down = plain ? 'currentColor' : 'var(--red)';
  const dotColor = plain ? 'var(--dots-color)' : null;

  if (type.startsWith('candles') || type === 'heikin_ashi') {
    const hollow = type.includes('hollow');
    return (
      <I>
        <line x1="7" y1="3" x2="7" y2="21" stroke={up} />
        <rect x="4.5" y="8" width="5" height="8" stroke={up} fill={hollow ? 'var(--menu-background)' : up} />
        <line x1="17" y1="2" x2="17" y2="18" stroke={down} />
        <rect x="14.5" y="5" width="5" height="7" stroke={down} fill={hollow ? 'var(--menu-background)' : down} />
      </I>
    );
  }
  if (type === 'bollinger_bars') return (
    <I>
      <rect x="4.5" y="3" width="5" height="4" fill="#3b82f6" stroke="none" />
      <rect x="4.5" y="7" width="5" height="9" fill={up} stroke="none" />
      <rect x="4.5" y="16" width="5" height="4" fill="#3b82f6" stroke="none" />
      <rect x="14.5" y="4" width="5" height="3" fill="#3b82f6" stroke="none" />
      <rect x="14.5" y="7" width="5" height="8" fill={down} stroke="none" />
      <rect x="14.5" y="15" width="5" height="5" fill="#3b82f6" stroke="none" />
    </I>
  );
  if (type === 'volume_candles') return (
    <I>
      <line x1="6.5" y1="4" x2="6.5" y2="21" stroke={up} />
      <rect x="5" y="9" width="3" height="7" stroke={up} fill={up} />
      <line x1="16" y1="2" x2="16" y2="19" stroke={down} />
      <rect x="12.5" y="6" width="7" height="7" stroke={down} fill={down} />
    </I>
  );
  if (type === 'snake') return (
    <I>
      <path d="M3 8c4-4 7 2 11-1s7-1 7-1" stroke={up} />
      <path d="M3 19c4-4 7 3 11 0s7-2 7-2" stroke={down} />
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="11" r="1.5" fill="currentColor" stroke="none" />
    </I>
  );
  if (type === 'hlc_bars') return (
    <I>
      <rect x="8" y="5" width="8" height="7" fill={up} stroke="none" opacity="0.35" />
      <rect x="8" y="12" width="8" height="7" fill={down} stroke="none" opacity="0.35" />
      <line x1="8" y1="5" x2="16" y2="5" stroke={up} />
      <line x1="8" y1="19" x2="16" y2="19" stroke={down} />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.2" />
    </I>
  );
  if (type === 'hlc') return (
    <I>
      <path d="M3 9l5-4 5 3 8-5" stroke={up} opacity="0.8" />
      <path d="M3 20l5-4 5 3 8-6" stroke={down} opacity="0.8" />
      <path d="M3 15l5-5 5 3 8-6" strokeWidth="2.2" />
    </I>
  );
  if (type === 'baseline') return (
    <I>
      <path d="M3 12h18" strokeDasharray="2.5,2" opacity="0.6" />
      <path d="M3 15l4-6 4 2" stroke={down} />
      <path d="M11 11l4-5 6 3" stroke={up} />
    </I>
  );
  if (type.startsWith('histogram')) {
    const c = plain ? 'var(--area-line-color)' : null;
    return (
      <I>
        <rect x="3" y="12" width="3.5" height="9" fill={c || up} stroke="none" opacity="0.9" />
        <rect x="8" y="7" width="3.5" height="14" fill={c || up} stroke="none" opacity="0.9" />
        <rect x="13" y="10" width="3.5" height="11" fill={c || down} stroke="none" opacity="0.9" />
        <rect x="18" y="4" width="3.5" height="17" fill={c || up} stroke="none" opacity="0.9" />
      </I>
    );
  }
  if (type.startsWith('bars')) return (
    <I>
      <path d="M7 4v14M7 8H3M7 14h4" stroke={up} />
      <path d="M17 6v14M17 10h-4M17 17h4" stroke={down} />
    </I>
  );
  if (type.startsWith('area')) return (
    <I>
      <path d="M3 16L9 9l5 4 7-7" stroke="var(--area-line-color)" />
      <path d="M3 16L9 9l5 4 7-7v14H3z" fill="var(--area-gradient-color-1)" opacity="0.3" stroke="none" />
    </I>
  );
  if (type.startsWith('volume_dots')) return (
    <I>
      <circle cx="6" cy="15" r="2" fill={dotColor || up} stroke="none" />
      <circle cx="12" cy="9" r="3.5" fill={dotColor || down} stroke="none" opacity="0.75" />
      <circle cx="19" cy="14" r="2.6" fill={dotColor || up} stroke="none" opacity="0.9" />
    </I>
  );
  if (type.startsWith('dots')) return (
    <I>
      <circle cx="5" cy="16" r="1.8" fill={dotColor || up} stroke="none" />
      <circle cx="11" cy="9" r="1.8" fill={dotColor || up} stroke="none" />
      <circle cx="17" cy="13" r="1.8" fill={dotColor || down} stroke="none" />
      <circle cx="21" cy="6" r="1.8" fill={dotColor || up} stroke="none" />
    </I>
  );
  if (type.startsWith('step_line')) return (
    <I>
      <path d="M3 17h5v-7h6" stroke={up} />
      <path d="M14 10v4h7v-8" stroke={down} />
    </I>
  );
  if (type.startsWith('jointed_line')) return (
    <I>
      <path d="M4 16l6-7" stroke={up} />
      <path d="M10 9l5 4" stroke={down} />
      <path d="M15 13l5-8" stroke={up} />
      <circle cx="4" cy="16" r="1.6" fill={dotColor || up} stroke="none" />
      <circle cx="10" cy="9" r="1.6" fill={dotColor || up} stroke="none" />
      <circle cx="15" cy="13" r="1.6" fill={dotColor || down} stroke="none" />
      <circle cx="20" cy="5" r="1.6" fill={dotColor || up} stroke="none" />
    </I>
  );
  if (type.startsWith('low_high')) return (
    <I>
      <path d="M6 6v12" stroke={up} />
      <path d="M12 3v11" stroke={down} />
      <path d="M18 9v12" stroke={up} />
    </I>
  );
  if (type === 'kagi') return (
    <I>
      <path d="M4 19V9h5v7" stroke={down} />
      <path d="M9 16h5V4h6" stroke={up} strokeWidth="2.4" />
    </I>
  );
  if (type === 'line_break') return (
    <I>
      <rect x="3" y="13" width="5" height="8" fill={up} stroke="none" opacity="0.9" />
      <rect x="9.5" y="8" width="5" height="8" fill={up} stroke="none" opacity="0.9" />
      <rect x="16" y="10" width="5" height="8" fill={down} stroke="none" opacity="0.9" />
    </I>
  );
  if (type === 'renko') return (
    <I>
      <rect x="3" y="15" width="5" height="5" fill={up} stroke="none" opacity="0.9" />
      <rect x="8" y="10" width="5" height="5" fill={up} stroke="none" opacity="0.9" />
      <rect x="13" y="5" width="5" height="5" fill={up} stroke="none" opacity="0.9" />
      <rect x="18" y="10" width="5" height="5" fill={down} stroke="none" opacity="0.9" />
    </I>
  );
  if (type === 'range_bars') return (
    <I>
      <rect x="3" y="12" width="4.5" height="7" fill={up} stroke="none" opacity="0.9" />
      <rect x="9.5" y="7" width="4.5" height="7" fill={up} stroke="none" opacity="0.9" />
      <rect x="16" y="10" width="4.5" height="7" fill={down} stroke="none" opacity="0.9" />
    </I>
  );
  if (type === 'point_figure') return (
    <I>
      <path d="M5 13l5 7M10 13l-5 7" stroke={up} />
      <circle cx="16" cy="8" r="3.2" stroke={down} />
    </I>
  );
  // line / line_solid and anything unmapped: red/green zigzag segments
  return (
    <I>
      <path d="M3 16L9 9" stroke={up} />
      <path d="M9 9l5 4" stroke={down} />
      <path d="M14 13l7-8" stroke={up} />
    </I>
  );
};

export default LineTypeIcon;

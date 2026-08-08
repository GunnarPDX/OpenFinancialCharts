import React from 'react';
import Dropdown from './Dropdown';
import HoverCard from './HoverCard';
import LineTypeIcon from './LineTypeIcon';
import DESCRIPTIONS from './lineTypeDescriptions';
import { lineTypes, aggregatedTypes } from '../ChartMainLine';
import { useChartProvider } from '../ChartContext';
import useDropdown from './useDropdown';
import useHoverCard from './useHoverCard';

const Component = () => {
  const { lineType, setLineType, config } = useChartProvider();
  const { open, setOpen, ref } = useDropdown();
  const shownLineTypes = lineTypes.filter(t => !config.line_types_hidden.includes(t));
  const shownAggregated = aggregatedTypes.filter(({ value }) => !config.line_types_hidden.includes(value));
  const menuRef = React.useRef(null);
  const { hover, setHover, showCard: showHoverCard, cardRef } = useHoverCard(menuRef);
  const showCard = (e, title, desc) => desc && showHoverCard(e, { title, desc });

  // stale hover cards shouldn't greet the next menu open
  React.useEffect(() => {
    if (!open) setHover(null);
  }, [open, setHover]);

  return (
    <Dropdown
      open={open} setOpen={setOpen} rootRef={ref}
      trigger={<LineTypeIcon type={lineType}/>}
      menuRef={menuRef}
      after={open && hover && (
        <HoverCard hover={hover} cardRef={cardRef}>
          <div className="ofc-study-editor-title" style={{ textTransform: 'capitalize' }}>{hover.title}</div>
          <div className="ofc-study-info">{hover.desc}</div>
        </HoverCard>
      )}
    >
      {shownLineTypes.length > 0 && <div className="ofc-dropdown-section-title">Standard Lines</div>}
      {shownLineTypes.map((item) => (
        <button
          key={item}
          className={`ofc-dropdown-item${item === lineType ? ' ofc-active' : ''}`}
          onClick={() => { setLineType(item); setOpen(false); }}
          onMouseEnter={(e) => showCard(e, item.replaceAll('_', ' '), DESCRIPTIONS[item])}
          onMouseLeave={() => setHover(null)}
        >
          <LineTypeIcon type={item} />
          {item.replaceAll('_', ' ')}
        </button>
      ))}
      {shownLineTypes.length > 0 && shownAggregated.length > 0 && <div className="ofc-dropdown-divider" />}
      {shownAggregated.length > 0 && <div className="ofc-dropdown-section-title">Aggregated</div>}
      {shownAggregated.map(({ value, label }) => (
        <button
          key={value}
          className={`ofc-dropdown-item${value === lineType ? ' ofc-active' : ''}`}
          onClick={() => { setLineType(value); setOpen(false); }}
          onMouseEnter={(e) => showCard(e, label, DESCRIPTIONS[value])}
          onMouseLeave={() => setHover(null)}
        >
          <LineTypeIcon type={value} />
          {label}
        </button>
      ))}
    </Dropdown>
  );
};

export default Component;

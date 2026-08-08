import React from 'react';
import Dropdown from './Dropdown';
import ToggleRow from './ToggleRow';
import { CrosshairIcon } from '../icons';
import { useChartProvider } from '../ChartContext';
import useDropdown from './useDropdown';

const Component = () => {
  const {
    showCrosshair, setShowCrosshair,
    showTooltip, setShowTooltip,
    showPriceDisplay, setShowPriceDisplay,
    stickToData, setStickToData,
  } = useChartProvider();
  const { open, setOpen, ref } = useDropdown();

  return (
    <Dropdown open={open} setOpen={setOpen} rootRef={ref} trigger={<CrosshairIcon/>}>
      <div className="ofc-dropdown-section-title">Crosshair</div>
      <ToggleRow label="Show" checked={showCrosshair} onChange={setShowCrosshair} />
      <ToggleRow label="Tooltip" checked={showTooltip} onChange={setShowTooltip} />
      <ToggleRow label="Price display" checked={showPriceDisplay} onChange={setShowPriceDisplay} />
      <ToggleRow label="Stick" checked={stickToData} onChange={setStickToData} />
    </Dropdown>
  );
};

export default Component;

import React from 'react';
import BasicLine from './lines/BasicLine';
import AreaLine from './lines/AreaLine';
import CandleSticks from './lines/CandleSticks';
import BollingerBars from './lines/BollingerBars';
import Bars from './lines/Bars';
import Dots from './lines/Dots';
import VolumeDots from './lines/VolumeDots';
import StepLine from './lines/StepLine';
import LoHi from './lines/LoHi';
import VolumeCandles from './lines/VolumeCandles';
import Histogram from './lines/Histogram';
import BaselineLine from './lines/BaselineLine';
import HLCArea from './lines/HLCArea';
import HLCBars from './lines/HLCBars';
import Snake from './lines/Snake';
import KagiLine from './lines/KagiLine';
import PointFigure from './lines/PointFigure';

const Component = (props) => {
  const {lineType} = props;

  switch(lineType) {
    case 'line':
    case 'line_solid':
      return (
        <BasicLine {...props}/>
      )
    case 'candles':
    case 'candles_hollow':
    case 'candles_hollow_plain':
    case 'candles_solid_plain':
      return (
        <CandleSticks {...props}/>
      )
    case 'bollinger_bars':
      return (
        <BollingerBars {...props}/>
      )
    case 'area':
      return (
        <AreaLine {...props}/>
      )
    case 'bars':
    case 'bars_solid':
      return (
        <Bars {...props}/>
      )
    case 'dots':
    case 'dots_solid':
      return (
        <Dots {...props}/>
      )
    case 'volume_dots':
    case 'volume_dots_solid':
      return (
        <VolumeDots {...props}/>
      )
    case 'volume_candles':
      return (
        <VolumeCandles {...props}/>
      )
    case 'histogram':
    case 'histogram_solid':
      return (
        <Histogram {...props}/>
      )
    case 'baseline':
      return (
        <BaselineLine {...props}/>
      )
    case 'hlc':
      return (
        <HLCArea {...props}/>
      )
    case 'hlc_bars':
      return (
        <HLCBars {...props}/>
      )
    case 'snake':
      return (
        <Snake {...props}/>
      )
    case 'step_line':
    case 'step_line_solid':
      return (
        <StepLine {...props}/>
      )
    case 'jointed_line':
    case 'jointed_line_solid':
      return (
        <>
          <BasicLine {...props}/>
          <Dots {...props}/>
        </>
      )
    case 'low_high':
    case 'low_high_solid':
      return (
        <LoHi {...props}/>
      )
    case 'heikin_ashi':
    case 'renko':
    case 'line_break':
    case 'range_bars':
      return (
        <CandleSticks {...props}/>
      )
    case 'kagi':
      return (
        <KagiLine {...props}/>
      )
    case 'point_figure':
      return (
        <PointFigure {...props}/>
      )
    default:
      return null;
    
  }
}

export const aggregatedTypes = [
  { value: 'heikin_ashi', label: 'Heikin Ashi' },
  { value: 'kagi', label: 'Kagi' },
  { value: 'line_break', label: 'Line Break' },
  { value: 'renko', label: 'Renko' },
  { value: 'range_bars', label: 'Range Bars' },
  { value: 'point_figure', label: 'Point & Figure' },
];

export const lineTypes = [
  'line',
  'line_solid',
  'candles',
  'candles_hollow',
  'candles_hollow_plain',
  'candles_solid_plain',
  'bollinger_bars',
  'area',
  'bars',
  'bars_solid',
  'dots',
  'dots_solid',
  'volume_dots',
  'volume_dots_solid',
  'volume_candles',
  'histogram',
  'histogram_solid',
  'baseline',
  'hlc',
  'hlc_bars',
  'snake',
  'step_line',
  'step_line_solid',
  'jointed_line',
  'jointed_line_solid'
]

// memo: the switch itself is cheap, but skipping it when props are unchanged
// also skips reconciling the selected renderer's element
export default React.memo(Component);
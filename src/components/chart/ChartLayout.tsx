
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import MainChart from './MainChart';
import RSIChart from './RSIChart';
import MACDChart from './MACDChart';

interface ChartLayoutProps {
  chartData: any[];
  chartState: {
    showMA: boolean;
    showBollinger: boolean;
    showVolume: boolean;
    showRSI: boolean;
    showMACD: boolean;
    showSupportResistance: boolean;
    showPriceLabels: boolean;
    showSignals: boolean;
  };
  yDomain: [number, number];
  supportResistanceLevels: {
    support: number[];
    resistance: number[];
  };
  currentPrice?: number | null;
}

const ChartLayout: React.FC<ChartLayoutProps> = ({
  chartData,
  chartState,
  yDomain,
  supportResistanceLevels,
  currentPrice
}) => {
  const {
    showMA,
    showBollinger,
    showVolume,
    showRSI,
    showMACD,
    showSupportResistance,
    showPriceLabels,
    showSignals
  } = chartState;

  // Calculate dynamic height for the main chart container based on which indicator charts are shown
  const getMainChartHeight = () => {
    if (showRSI && showMACD) return 'h-[60%]';
    if (showRSI || showMACD) return 'h-[70%]';
    return 'h-full';
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className={cn("w-full", getMainChartHeight())}>
        <MainChart 
          chartData={chartData}
          showMA={showMA}
          showBollinger={showBollinger}
          showVolume={showVolume}
          showSupportResistance={showSupportResistance}
          yDomain={yDomain}
          supportResistanceLevels={supportResistanceLevels}
          showPriceLabels={showPriceLabels}
          currentPrice={currentPrice}
        />
      </div>
      
      {showRSI && (
        <div className="w-full h-[150px]">
          <RSIChart chartData={chartData} />
        </div>
      )}
      
      {showMACD && (
        <div className="w-full h-[150px]">
          <MACDChart chartData={chartData} />
        </div>
      )}
    </div>
  );
};

// Use memo with custom comparison function to prevent unnecessary re-renders
export default memo(ChartLayout, (prevProps, nextProps) => {
  // Only re-render if something other than currentPrice has changed
  if (prevProps.currentPrice !== nextProps.currentPrice && 
      prevProps.chartData === nextProps.chartData &&
      prevProps.yDomain === nextProps.yDomain &&
      prevProps.supportResistanceLevels === nextProps.supportResistanceLevels &&
      JSON.stringify(prevProps.chartState) === JSON.stringify(nextProps.chartState)) {
    return true; // Skip re-render if only the price changed
  }
  
  return false; // Re-render for any other prop change
});


import React, { memo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technicalAnalysisService';
import { useChartData } from '@/hooks/useChartData';
import ChartControls from './chart/ChartControls';
import ChartLayout from './chart/ChartLayout';
import ChartLoadingState from './chart/ChartLoadingState';

interface PriceChartProps {
  data: KlineData[];
  isPending: boolean;
  symbol: string;
  signalData?: SignalSummary | null;
  currentPrice?: number | null;
}

const PriceChart = memo(({ 
  data, 
  isPending, 
  symbol, 
  signalData,
  currentPrice
}: PriceChartProps) => {
  // Only call useChartData hook if we have data to process
  const {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    chartData,
    yDomain,
    supportResistanceLevels,
    updateCurrentPrice
  } = useChartData(data, signalData);

  // Update the chart when currentPrice changes
  useEffect(() => {
    if (currentPrice !== undefined && currentPrice !== null) {
      updateCurrentPrice(currentPrice);
    }
  }, [currentPrice, updateCurrentPrice]);

  const hasData = data && data.length > 0;

  // Early return for loading or no data states
  if (isPending || !hasData) {
    return (
      <Card className="chart-container h-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Price Chart
          </CardTitle>
        </CardHeader>
        <ChartLoadingState isPending={isPending} hasData={hasData} />
      </Card>
    );
  }

  // Pass all chart state properties needed by ChartLayout
  const chartLayoutState = {
    showMA: chartState.showMA,
    showBollinger: chartState.showBollinger,
    showVolume: chartState.showVolume,
    showRSI: chartState.showRSI,
    showMACD: chartState.showMACD,
    showSupportResistance: chartState.showSupportResistance,
    showPriceLabels: chartState.showPriceLabels,
    showSignals: chartState.showSignals
  };

  return (
    <Card className="chart-container shadow-lg h-full border border-indigo-50">
      <CardHeader className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 rounded-t-xl border-b pb-2">
        <ChartControls
          symbol={symbol}
          chartState={chartState}
          toggleSetting={toggleSetting}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
        />
      </CardHeader>
      <CardContent className="bg-white p-0 flex-1 min-h-0 h-full overflow-hidden">
        <ChartLayout
          chartData={chartData}
          chartState={chartLayoutState}
          yDomain={yDomain}
          supportResistanceLevels={supportResistanceLevels}
          currentPrice={currentPrice}
        />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render when something important changes, not just when the price updates
  if (prevProps.isPending !== nextProps.isPending) return false;
  if (prevProps.symbol !== nextProps.symbol) return false;
  
  // Deep compare data array length (avoiding full comparison for performance)
  if (prevProps.data?.length !== nextProps.data?.length) return false;
  
  // Only check the last data point if arrays have the same length
  if (prevProps.data?.length && nextProps.data?.length) {
    const lastPrev = prevProps.data[prevProps.data.length - 1];
    const lastNext = nextProps.data[nextProps.data.length - 1];
    
    // If the last candle data has changed, re-render
    if (lastPrev.openTime !== lastNext.openTime || 
        lastPrev.close !== lastNext.close || 
        lastPrev.high !== lastNext.high || 
        lastPrev.low !== lastNext.low) {
      return false;
    }
  }
  
  // Skip re-renders for price updates alone - our useEffect will handle them
  return true;
});

// Add displayName to help with debugging
PriceChart.displayName = 'PriceChart';

export default PriceChart;

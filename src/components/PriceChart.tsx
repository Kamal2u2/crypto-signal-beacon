
import React, { memo } from 'react';
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
}

const PriceChart: React.FC<PriceChartProps> = memo(({ 
  data, 
  isPending, 
  symbol, 
  signalData 
}) => {
  const {
    chartState,
    toggleSetting,
    handleZoomIn,
    handleZoomOut,
    chartData,
    yDomain,
    supportResistanceLevels
  } = useChartData(data, signalData);

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
          chartState={chartState}
          yDomain={yDomain}
          supportResistanceLevels={supportResistanceLevels}
        />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // If loading state changed, we need to re-render
  if (prevProps.isPending !== nextProps.isPending) return false;
  
  // If symbol changed, we need to re-render
  if (prevProps.symbol !== nextProps.symbol) return false;
  
  // Deep compare signalData changes
  if (prevProps.signalData !== nextProps.signalData) {
    // If one is null and the other isn't, they're different
    if (!!prevProps.signalData !== !!nextProps.signalData) return false;
    
    // If both exist, compare their values
    if (prevProps.signalData && nextProps.signalData) {
      if (prevProps.signalData.overallSignal !== nextProps.signalData.overallSignal) return false;
      if (prevProps.signalData.confidence !== nextProps.signalData.confidence) return false;
    }
  }
  
  // If data length changed, we need to re-render
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  // Only check the last candle for changes since that's what updates
  if (prevProps.data.length > 0 && nextProps.data.length > 0) {
    const prevLastCandle = prevProps.data[prevProps.data.length - 1];
    const nextLastCandle = nextProps.data[nextProps.data.length - 1];
    
    // Only check essential properties
    if (prevLastCandle.close !== nextLastCandle.close) return false;
    if (prevLastCandle.high !== nextLastCandle.high) return false;
    if (prevLastCandle.low !== nextLastCandle.low) return false;
  }
  
  // If we made it here, props are effectively equal
  return true;
});

export default PriceChart;

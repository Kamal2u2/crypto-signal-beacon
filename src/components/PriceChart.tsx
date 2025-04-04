
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

const PriceChart: React.FC<PriceChartProps> = ({ 
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
      <Card className="chart-container">
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
    <Card className="chart-container shadow-xl h-full border border-indigo-100/50">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl border-b">
        <ChartControls
          symbol={symbol}
          chartState={chartState}
          toggleSetting={toggleSetting}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
        />
      </CardHeader>
      <CardContent className="bg-white p-4 flex-1 min-h-0 h-full">
        <ChartLayout
          chartData={chartData}
          chartState={chartState}
          yDomain={yDomain}
          supportResistanceLevels={supportResistanceLevels}
        />
      </CardContent>
    </Card>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(PriceChart);

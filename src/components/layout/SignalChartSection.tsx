
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SignalChart from '@/components/chart/SignalChart';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technical/types';

interface SignalChartSectionProps {
  klineData: KlineData[];
  isLoading: boolean;
  symbol: string;
  signalData: SignalSummary | null;
  currentPrice: number | null;
  signalHistory?: Array<{type: any, time: number, confidence: number}>;
}

// Improved comparison function to avoid unnecessary re-renders but be more responsive to signal changes
const arePropsEqual = (prevProps: SignalChartSectionProps, nextProps: SignalChartSectionProps) => {
  // Always re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  
  // Always re-render if symbol changes
  if (prevProps.symbol !== nextProps.symbol) {
    return false;
  }
  
  // For price changes, only update if significant (0.03% or more)
  if (prevProps.currentPrice && nextProps.currentPrice) {
    const priceDiffPercent = Math.abs((prevProps.currentPrice - nextProps.currentPrice) / prevProps.currentPrice) * 100;
    if (priceDiffPercent > 0.03) {
      return false;
    }
  } else if (prevProps.currentPrice !== nextProps.currentPrice) {
    return false;
  }
  
  // If signal data changes significantly, re-render
  if (prevProps.signalData?.overallSignal !== nextProps.signalData?.overallSignal) {
    return false;
  }
  
  // If signal history or data length changed, we need to update
  if (
    prevProps.signalHistory?.length !== nextProps.signalHistory?.length ||
    prevProps.klineData.length !== nextProps.klineData.length
  ) {
    return false;
  }
  
  // Only check last candle to determine if we need an update
  if (prevProps.klineData.length > 0 && nextProps.klineData.length > 0) {
    const lastCandle1 = prevProps.klineData[prevProps.klineData.length - 1];
    const lastCandle2 = nextProps.klineData[nextProps.klineData.length - 1];
    
    if (lastCandle1.openTime !== lastCandle2.openTime) {
      return false;
    }
    
    // Only update if price change is significant - reduced threshold
    const lastCloseDiff = Math.abs((lastCandle1.close - lastCandle2.close) / lastCandle1.close) * 100;
    if (lastCloseDiff > 0.03) {
      return false;
    }
  }
  
  return true;
};

// Use React.memo to prevent unnecessary re-renders
const SignalChartSection: React.FC<SignalChartSectionProps> = memo(({
  klineData,
  isLoading,
  symbol,
  signalData,
  currentPrice,
  signalHistory = []
}) => {
  return (
    <Card className="signal-chart-container">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Price Chart with Signals</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[350px] w-full" />
          </div>
        ) : klineData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <SignalChart 
            chartData={klineData} 
            currentPrice={currentPrice}
            signalHistory={signalHistory}
          />
        )}
      </CardContent>
    </Card>
  );
}, arePropsEqual);

// Add display name for React DevTools
SignalChartSection.displayName = 'SignalChartSection';

export default SignalChartSection;

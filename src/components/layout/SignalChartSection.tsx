
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
});

// Add display name for React DevTools
SignalChartSection.displayName = 'SignalChartSection';

export default SignalChartSection;

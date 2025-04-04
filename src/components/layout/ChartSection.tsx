
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technicalAnalysisService';

interface ChartSectionProps {
  klineData: KlineData[];
  isLoading: boolean;
  symbol: string;
  signalData: SignalSummary | null;
  fullscreenChart: boolean;
  toggleFullscreenChart: () => void;
}

// Custom comparison function for the chart section
const arePropsEqual = (prevProps: ChartSectionProps, nextProps: ChartSectionProps) => {
  // Always re-render if fullscreen state changes
  if (prevProps.fullscreenChart !== nextProps.fullscreenChart) return false;
  
  // Always re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  // Always re-render if symbol changes
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
  
  // Only re-render if data length changes or last candle changes
  if (prevProps.klineData.length !== nextProps.klineData.length) return false;
  
  // Check only the last candle for changes
  if (prevProps.klineData.length > 0 && nextProps.klineData.length > 0) {
    const prevLastCandle = prevProps.klineData[prevProps.klineData.length - 1];
    const nextLastCandle = nextProps.klineData[nextProps.klineData.length - 1];
    
    if (prevLastCandle.close !== nextLastCandle.close) return false;
  }
  
  return true;
};

const ChartSection: React.FC<ChartSectionProps> = ({
  klineData,
  isLoading,
  symbol,
  signalData,
  fullscreenChart,
  toggleFullscreenChart
}) => {
  return (
    <div className="relative min-h-[500px] glass-card rounded-xl shadow-lg mb-6 overflow-hidden">
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={toggleFullscreenChart}
      >
        {fullscreenChart ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
      
      <PriceChart
        data={klineData}
        isPending={isLoading}
        symbol={symbol}
        signalData={signalData}
      />
    </div>
  );
};

// Use memo with custom comparison function to prevent unnecessary re-renders
export default memo(ChartSection, arePropsEqual);

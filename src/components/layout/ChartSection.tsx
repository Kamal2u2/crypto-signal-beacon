
import React from 'react';
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

export default ChartSection;

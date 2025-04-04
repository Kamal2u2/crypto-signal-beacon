
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technicalAnalysisService';
import { formatPrice } from '@/utils/chartFormatters';

interface ChartSectionProps {
  klineData: KlineData[];
  isLoading: boolean;
  symbol: string;
  signalData: SignalSummary | null;
  fullscreenChart: boolean;
  toggleFullscreenChart: () => void;
  currentPrice?: number | null;
}

const ChartSection = memo(({
  klineData,
  isLoading,
  symbol,
  signalData,
  fullscreenChart,
  toggleFullscreenChart,
  currentPrice
}: ChartSectionProps) => {
  // Format the current price for display if available
  const formattedPrice = currentPrice ? formatPrice(currentPrice) : null;
  
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
      
      {formattedPrice && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-sm font-medium">
          Current: ${formattedPrice}
        </div>
      )}
      
      <PriceChart
        data={klineData}
        isPending={isLoading}
        symbol={symbol}
        signalData={signalData}
        currentPrice={currentPrice}
        key={`chart-${currentPrice}`} 
      />
    </div>
  );
});

// Set displayName to help with debugging
ChartSection.displayName = 'ChartSection';

export default ChartSection;

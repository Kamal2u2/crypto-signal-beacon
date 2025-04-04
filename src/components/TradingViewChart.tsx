
import React, { useEffect, useRef } from 'react';
import { KlineData } from '@/services/binanceService';

export const DOMESTIC_TV_CHART_ID = 'tv_chart_container';

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  klineData: KlineData[];
  onChartLoaded?: () => void;
  onSignalTrigger?: (signalType: string, symbol: string, confidence: number) => void;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval,
  klineData,
  onChartLoaded,
  onSignalTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate chart loaded
    if (onChartLoaded) {
      setTimeout(() => {
        onChartLoaded();
      }, 1000);
    }
  }, []);

  return (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg border border-gray-200" ref={containerRef} id={DOMESTIC_TV_CHART_ID}>
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">
          Trading chart for {symbol} ({interval})
        </p>
      </div>
    </div>
  );
};

export default TradingViewChart;

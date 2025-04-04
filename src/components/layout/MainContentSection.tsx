
import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import SignalDisplay from '@/components/SignalDisplay';
import NewsPanel from '@/components/NewsPanel';
import ChartSection from '@/components/layout/ChartSection';
import { KlineData } from '@/services/binanceService';
import { SignalSummary } from '@/services/technicalAnalysisService';

interface MainContentSectionProps {
  klineData: KlineData[];
  isLoading: boolean;
  symbol: string;
  signalData: SignalSummary | null;
  currentPrice: number | null;
  confidenceThreshold: number;
  fullscreenChart: boolean;
  toggleFullscreenChart: () => void;
}

const MainContentSection: React.FC<MainContentSectionProps> = ({
  klineData,
  isLoading,
  symbol,
  signalData,
  currentPrice,
  confidenceThreshold,
  fullscreenChart,
  toggleFullscreenChart
}) => {
  return (
    <div className="xl:col-span-3 order-2 xl:order-1">
      <ChartSection 
        klineData={klineData}
        isLoading={isLoading}
        symbol={symbol}
        signalData={signalData}
        fullscreenChart={fullscreenChart}
        toggleFullscreenChart={toggleFullscreenChart}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="order-2 lg:order-1">
          <SignalDisplay
            signalData={signalData}
            symbol={symbol}
            lastPrice={currentPrice}
            confidenceThreshold={confidenceThreshold}
          />
        </div>
        
        <div className="order-1 lg:order-2">
          <div className="glass-card rounded-xl shadow-lg">
            <div className="p-4 border-b bg-secondary/10 rounded-t-xl flex items-center">
              <LayoutDashboard className="h-5 w-5 mr-2 text-muted-foreground" />
              <h3 className="text-lg font-semibold">News & Updates</h3>
            </div>
            <div className="p-0">
              <NewsPanel coinSymbol={symbol.split("/")[0]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContentSection;

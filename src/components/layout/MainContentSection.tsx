
import React from 'react';
import SignalDisplay from '@/components/SignalDisplay';
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
}) => {
  return (
    <div className="xl:col-span-3 order-2 xl:order-1">
      <div className="grid grid-cols-1 gap-6">
        <SignalDisplay
          signalData={signalData}
          symbol={symbol}
          lastPrice={currentPrice}
          confidenceThreshold={confidenceThreshold}
        />
      </div>
    </div>
  );
};

export default MainContentSection;

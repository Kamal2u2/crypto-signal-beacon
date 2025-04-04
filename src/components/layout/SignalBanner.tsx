
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { SignalSummary } from '@/services/technicalAnalysisService';

interface SignalBannerProps {
  signalData: SignalSummary | null;
  symbol: string;
  currentPrice: number | null;
  confidenceThreshold: number;
}

const SignalBanner: React.FC<SignalBannerProps> = ({
  signalData,
  symbol,
  currentPrice,
  confidenceThreshold
}) => {
  if (!signalData) return null;

  return (
    <div className={cn(
      "glass-card p-4 flex flex-wrap items-center gap-4 rounded-lg shadow-md border flex-grow",
      {
        'border-crypto-buy border-2': signalData.overallSignal === 'BUY',
        'border-crypto-sell border-2': signalData.overallSignal === 'SELL',
        'border-crypto-hold border-2': signalData.overallSignal === 'HOLD',
        'border-border': signalData.overallSignal === 'NEUTRAL',
        'opacity-70': signalData.confidence < confidenceThreshold
      }
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-3 rounded-full",
          {
            'bg-crypto-buy text-white': signalData.overallSignal === 'BUY',
            'bg-crypto-sell text-white': signalData.overallSignal === 'SELL',
            'bg-crypto-hold text-white': signalData.overallSignal === 'HOLD',
            'bg-gray-400 dark:bg-gray-600 text-white': signalData.overallSignal === 'NEUTRAL'
          }
        )}>
          {signalData.overallSignal === 'BUY' && <ArrowUp className="h-6 w-6" />}
          {signalData.overallSignal === 'SELL' && <ArrowDown className="h-6 w-6" />}
          {(signalData.overallSignal === 'HOLD' || signalData.overallSignal === 'NEUTRAL') && <Minus className="h-6 w-6" />}
        </div>
        
        <div>
          <h2 className={cn(
            "text-xl font-bold",
            {
              'text-crypto-buy': signalData.overallSignal === 'BUY',
              'text-crypto-sell': signalData.overallSignal === 'SELL',
              'text-crypto-hold': signalData.overallSignal === 'HOLD',
              'text-muted-foreground': signalData.overallSignal === 'NEUTRAL'
            }
          )}>
            {signalData.overallSignal} {symbol}
          </h2>
          <p className="text-sm text-muted-foreground">
            {signalData.confidence.toFixed(0)}% confidence 
            {signalData.confidence < confidenceThreshold && (
              <span className="text-crypto-sell ml-2">(Below threshold)</span>
            )}
          </p>
        </div>
      </div>
      
      {signalData.priceTargets && (signalData.overallSignal === 'BUY' || signalData.overallSignal === 'SELL') && (
        <div className="flex flex-wrap gap-4 mt-2 md:mt-0 ml-0 md:ml-auto">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Entry</span>
            <span className="font-medium">${signalData.priceTargets.entryPrice.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-crypto-sell">Stop Loss</span>
            <span className="font-medium">${signalData.priceTargets.stopLoss.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-crypto-buy">Target 1</span>
            <span className="font-medium">${signalData.priceTargets.target1.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-crypto-buy">Target 2</span>
            <span className="font-medium">${signalData.priceTargets.target2.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-crypto-buy">Target 3</span>
            <span className="font-medium">${signalData.priceTargets.target3.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalBanner;

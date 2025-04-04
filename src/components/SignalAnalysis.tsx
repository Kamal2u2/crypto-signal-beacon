
import React, { useEffect, useState } from 'react';
import { KlineData } from '@/services/binanceService';

interface SignalAnalysisProps {
  klineData: KlineData[];
  onSignalAnalysis: (data: { signal: string; confidence: number }) => void;
  setAnalysisRunning: (running: boolean) => void;
}

const SignalAnalysis: React.FC<SignalAnalysisProps> = ({
  klineData,
  onSignalAnalysis,
  setAnalysisRunning,
}) => {
  const [analyzing, setAnalyzing] = useState(false);

  // Simple analysis function
  const performAnalysis = () => {
    setAnalysisRunning(true);
    setAnalyzing(true);

    // Simple example signal detection logic
    setTimeout(() => {
      if (klineData.length > 0) {
        // Get the last few candles
        const lastCandles = klineData.slice(-5);
        
        // Simple trend detection based on close prices
        const closePrices = lastCandles.map(candle => candle.close);
        const upTrend = closePrices.every((price, i) => i === 0 || price >= closePrices[i - 1]);
        const downTrend = closePrices.every((price, i) => i === 0 || price <= closePrices[i - 1]);
        
        let signal: "BUY" | "SELL" | "HOLD" | "NEUTRAL" = "NEUTRAL";
        let confidence = 50;
        
        if (upTrend) {
          signal = "BUY";
          confidence = 70;
        } else if (downTrend) {
          signal = "SELL";
          confidence = 70;
        } else {
          // Mixed signals
          signal = "HOLD";
          confidence = 60;
        }
        
        onSignalAnalysis({ signal, confidence });
      } else {
        onSignalAnalysis({ signal: "NEUTRAL", confidence: 0 });
      }
      
      setAnalyzing(false);
      setAnalysisRunning(false);
    }, 1000);
  };

  // Run analysis when data changes
  useEffect(() => {
    if (klineData.length > 0) {
      performAnalysis();
    }
  }, [klineData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Signal Analysis</h3>
        {analyzing ? (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-gray-500">Analyzing...</span>
          </div>
        ) : (
          <button 
            onClick={performAnalysis}
            className="text-sm text-primary hover:underline"
          >
            Refresh Analysis
          </button>
        )}
      </div>
    </div>
  );
};

export default SignalAnalysis;

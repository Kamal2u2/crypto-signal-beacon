
import React from 'react';
import { SignalSummary, TradingSignal } from '@/services/technicalAnalysisService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus, AlertTriangle } from 'lucide-react';

interface SignalDisplayProps {
  signalData: SignalSummary | null;
  symbol: string;
  lastPrice: number | null;
}

const SignalDisplay: React.FC<SignalDisplayProps> = ({ signalData, symbol, lastPrice }) => {
  if (!signalData) {
    return (
      <Card className="signal-card w-full h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Signal Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <AlertTriangle className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-gray-600">No signals available</p>
            <p className="text-sm text-gray-500 mt-1">Select a coin pair to view signals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overallSignal, confidence, signals } = signalData;

  const signalColor = {
    BUY: 'signal-buy',
    SELL: 'signal-sell',
    HOLD: 'signal-hold',
    NEUTRAL: 'signal-neutral'
  };

  const signalBorderColor = {
    BUY: 'border-crypto-buy',
    SELL: 'border-crypto-sell',
    HOLD: 'border-crypto-hold',
    NEUTRAL: 'border-gray-300'
  };

  const signalIcon = {
    BUY: <ArrowUp className="h-5 w-5" />,
    SELL: <ArrowDown className="h-5 w-5" />,
    HOLD: <Minus className="h-5 w-5" />,
    NEUTRAL: <Minus className="h-5 w-5" />
  };

  return (
    <Card className={cn(
      "signal-card w-full h-full", 
      signalBorderColor[overallSignal as keyof typeof signalBorderColor],
      "border-2"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Signal Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{symbol}</span>
            {lastPrice && (
              <span className="font-semibold text-gray-800">${lastPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Overall Signal</h3>
            <Badge 
              className={cn(
                "px-3 py-1", 
                signalColor[overallSignal as keyof typeof signalColor]
              )}
            >
              <span className="flex items-center">
                {signalIcon[overallSignal as keyof typeof signalIcon]}
                <span className="ml-1">{overallSignal}</span>
              </span>
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <div 
              className={cn(
                "h-2.5 rounded-full", 
                {
                  'bg-crypto-buy': overallSignal === 'BUY',
                  'bg-crypto-sell': overallSignal === 'SELL',
                  'bg-crypto-hold': overallSignal === 'HOLD',
                  'bg-gray-400': overallSignal === 'NEUTRAL'
                }
              )}
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <p className="text-xs text-right text-gray-500">{confidence.toFixed(0)}% confidence</p>
        </div>
        
        <h3 className="text-sm font-medium text-gray-600 mb-2">Signal Details</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {signals.map((signal: TradingSignal, index: number) => (
            <div 
              key={index}
              className="p-3 rounded-md bg-crypto-accent border border-crypto-border"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{signal.indicator}</span>
                <Badge 
                  className={cn(
                    "px-2 py-0.5 text-xs", 
                    signalColor[signal.type as keyof typeof signalColor]
                  )}
                >
                  {signal.type}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{signal.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;


import React from 'react';
import { SignalSummary, TradingSignal } from '@/services/technicalAnalysisService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface SignalDisplayProps {
  signalData: SignalSummary | null;
  symbol: string;
  lastPrice: number | null;
}

const SignalDisplay: React.FC<SignalDisplayProps> = ({ signalData, symbol, lastPrice }) => {
  if (!signalData) {
    return (
      <Card className="w-full h-full bg-crypto-secondary border-crypto-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Signal Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-muted-foreground">No signals available</p>
            <p className="text-sm text-muted-foreground mt-1">Select a coin pair to view signals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overallSignal, confidence, signals } = signalData;

  const signalColor = {
    BUY: 'bg-signal-buy text-green-950',
    SELL: 'bg-signal-sell text-red-950',
    HOLD: 'bg-signal-hold text-yellow-950',
    NEUTRAL: 'bg-signal-neutral text-gray-950'
  };

  const signalBorderColor = {
    BUY: 'border-signal-buy',
    SELL: 'border-signal-sell',
    HOLD: 'border-signal-hold',
    NEUTRAL: 'border-signal-neutral'
  };

  const signalIcon = {
    BUY: <ArrowUp className="h-5 w-5" />,
    SELL: <ArrowDown className="h-5 w-5" />,
    HOLD: <Minus className="h-5 w-5" />,
    NEUTRAL: <Minus className="h-5 w-5" />
  };

  return (
    <Card className={cn(
      "w-full h-full bg-crypto-secondary", 
      signalBorderColor[overallSignal as keyof typeof signalBorderColor],
      "border-2"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Signal Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">{symbol}</span>
            {lastPrice && (
              <span className="font-semibold">${lastPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Overall Signal</h3>
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
          
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
            <div 
              className={cn(
                "h-2.5 rounded-full", 
                {
                  'bg-signal-buy': overallSignal === 'BUY',
                  'bg-signal-sell': overallSignal === 'SELL',
                  'bg-signal-hold': overallSignal === 'HOLD',
                  'bg-signal-neutral': overallSignal === 'NEUTRAL'
                }
              )}
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <p className="text-xs text-right text-muted-foreground">{confidence.toFixed(0)}% confidence</p>
        </div>
        
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Signal Details</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {signals.map((signal: TradingSignal, index: number) => (
            <div 
              key={index}
              className="p-2 rounded-md bg-gray-800 border border-gray-700"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{signal.indicator}</span>
                <Badge 
                  className={cn(
                    "px-2 py-0.5 text-xs", 
                    signalColor[signal.type as keyof typeof signalColor]
                  )}
                >
                  {signal.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{signal.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;


import React from 'react';
import { SignalSummary, TradingSignal, PatternDetection } from '@/services/technicalAnalysisService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus, AlertTriangle, Target, ShieldAlert, TrendingUp } from 'lucide-react';

interface SignalDisplayProps {
  signalData: SignalSummary | null;
  symbol: string;
  lastPrice: number | null;
  confidenceThreshold?: number;
}

const SignalDisplay: React.FC<SignalDisplayProps> = ({ 
  signalData, 
  symbol, 
  lastPrice,
  confidenceThreshold = 0
}) => {
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

  const { overallSignal, confidence, signals, priceTargets, patterns } = signalData;
  const isBelowThreshold = confidence < confidenceThreshold;

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

  const signalBackgroundColor = {
    BUY: 'bg-crypto-buy bg-opacity-10',
    SELL: 'bg-crypto-sell bg-opacity-10',
    HOLD: 'bg-crypto-hold bg-opacity-10',
    NEUTRAL: 'bg-gray-100'
  };

  const signalIcon = {
    BUY: <ArrowUp className="h-5 w-5" />,
    SELL: <ArrowDown className="h-5 w-5" />,
    HOLD: <Minus className="h-5 w-5" />,
    NEUTRAL: <Minus className="h-5 w-5" />
  };

  // Sort signals to prioritize combined strategy and patterns
  const sortedSignals = [...signals].sort((a, b) => {
    if (a.indicator === 'Combined Strategy') return -1;
    if (b.indicator === 'Combined Strategy') return 1;
    if (a.indicator === 'Chart Pattern') return -1;
    if (b.indicator === 'Chart Pattern') return 1;
    return b.strength - a.strength;
  });

  return (
    <Card className={cn(
      "signal-card w-full h-full", 
      signalBorderColor[overallSignal as keyof typeof signalBorderColor],
      "border-2",
      isBelowThreshold && "opacity-70"
    )}>
      <CardHeader className={cn(
        "pb-2 rounded-t-xl",
        signalBackgroundColor[overallSignal as keyof typeof signalBackgroundColor]
      )}>
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
      <CardContent className="pt-4">
        {/* Prominent signal display at the top */}
        <div className={cn(
          "mb-4 px-4 py-3 rounded-lg flex flex-col items-center",
          signalBackgroundColor[overallSignal as keyof typeof signalBackgroundColor],
          "border",
          signalBorderColor[overallSignal as keyof typeof signalBorderColor],
        )}>
          <div className="flex items-center justify-center mb-2 gap-2">
            <div className={cn(
              "p-2 rounded-full",
              {
                'bg-crypto-buy text-white': overallSignal === 'BUY',
                'bg-crypto-sell text-white': overallSignal === 'SELL',
                'bg-crypto-hold text-white': overallSignal === 'HOLD',
                'bg-gray-400 text-white': overallSignal === 'NEUTRAL'
              }
            )}>
              {signalIcon[overallSignal as keyof typeof signalIcon]}
            </div>
            <span className={cn(
              "text-xl font-bold",
              {
                'text-crypto-buy': overallSignal === 'BUY',
                'text-crypto-sell': overallSignal === 'SELL',
                'text-crypto-hold': overallSignal === 'HOLD',
                'text-gray-600': overallSignal === 'NEUTRAL'
              }
            )}>
              {overallSignal}
            </span>
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
          <div className="flex justify-between w-full">
            <p className="text-xs text-gray-500">{confidence.toFixed(0)}% confidence</p>
            {isBelowThreshold && (
              <p className="text-xs text-crypto-sell">Below threshold ({confidenceThreshold}%)</p>
            )}
          </div>
        </div>
        
        {/* Patterns section */}
        {patterns && patterns.length > 0 && (
          <div className="mb-4 border border-crypto-border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>Pattern Recognition</span>
              </h3>
              <Badge className={cn(
                patterns[0].type === 'bullish' ? 'bg-crypto-buy' : 'bg-crypto-sell',
                'text-white'
              )}>
                {patterns[0].type.toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {patterns.map((pattern, index) => (
                <div key={index} className="text-xs p-2 rounded-md bg-gray-50">
                  <div className="flex justify-between">
                    <span className="font-medium">{pattern.name}</span>
                    <span>{pattern.confidence.toFixed(0)}% confidence</span>
                  </div>
                  <p className="mt-1 text-gray-600">{pattern.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Price targets section */}
        {priceTargets && (overallSignal === 'BUY' || overallSignal === 'SELL') && (
          <div className="mb-4 border border-crypto-border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>Price Targets</span>
              </h3>
              <Badge className={cn(signalColor[overallSignal as keyof typeof signalColor])}>
                R:R {priceTargets.riskRewardRatio}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Entry:</span>
                <span className="font-medium">${priceTargets.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center text-crypto-sell">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Stop Loss:
                </span>
                <span className="font-medium">${priceTargets.stopLoss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target 1:</span>
                <span className="font-medium">${priceTargets.target1.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target 2:</span>
                <span className="font-medium">${priceTargets.target2.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target 3:</span>
                <span className="font-medium">${priceTargets.target3.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Risk:</span>
                <span className="font-medium">
                  {overallSignal === 'BUY' 
                    ? `${((priceTargets.entryPrice - priceTargets.stopLoss) / priceTargets.entryPrice * 100).toFixed(2)}%`
                    : `${((priceTargets.stopLoss - priceTargets.entryPrice) / priceTargets.entryPrice * 100).toFixed(2)}%`
                  }
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Signal details section */}
        <h3 className="text-sm font-medium text-gray-600 mb-2">Signal Details</h3>
        <div className="space-y-2 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
          {sortedSignals.map((signal: TradingSignal, index: number) => (
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

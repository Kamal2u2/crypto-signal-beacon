import React from 'react';
import { SignalSummary, TradingSignal, PatternDetection } from '@/services/technicalAnalysisService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Minus, AlertTriangle, Target, ShieldAlert, TrendingUp, BarChart3, Layers } from 'lucide-react';

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
    BUY: 'bg-crypto-buy/20 text-crypto-buy border-crypto-buy',
    SELL: 'bg-crypto-sell/20 text-crypto-sell border-crypto-sell',
    HOLD: 'bg-crypto-hold/20 text-crypto-hold border-crypto-hold',
    NEUTRAL: 'bg-gray-200 text-gray-700 border-gray-300'
  };

  const signalBorderColor = {
    BUY: 'border-crypto-buy',
    SELL: 'border-crypto-sell',
    HOLD: 'border-crypto-hold',
    NEUTRAL: 'border-gray-300'
  };

  const signalBackgroundColor = {
    BUY: 'bg-crypto-buy/10',
    SELL: 'bg-crypto-sell/10',
    HOLD: 'bg-crypto-hold/10',
    NEUTRAL: 'bg-gray-100'
  };

  const signalIcon = {
    BUY: <ArrowUp className="h-5 w-5" />,
    SELL: <ArrowDown className="h-5 w-5" />,
    HOLD: <Minus className="h-5 w-5" />,
    NEUTRAL: <Minus className="h-5 w-5" />
  };

  const sortedSignals = [...signals].sort((a, b) => {
    if (a.indicator === 'Combined Strategy') return -1;
    if (b.indicator === 'Combined Strategy') return 1;
    if (a.indicator === 'Chart Pattern') return -1;
    if (b.indicator === 'Chart Pattern') return 1;
    return b.strength - a.strength;
  });

  return (
    <Card className={cn(
      "signal-card w-full h-full shadow-lg", 
      signalBorderColor[overallSignal as keyof typeof signalBorderColor],
      "border-2",
      isBelowThreshold && "opacity-90"
    )}>
      <CardHeader className={cn(
        "pb-2 rounded-t-xl",
        signalBackgroundColor[overallSignal as keyof typeof signalBackgroundColor]
      )}>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="text-lg font-semibold">Signal Analysis</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">{symbol}</span>
            {lastPrice && (
              <span className="font-bold text-gray-800 text-base">${lastPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-4">
        <div className={cn(
          "mb-5 p-3 rounded-lg flex flex-col",
          signalBackgroundColor[overallSignal as keyof typeof signalBackgroundColor],
          "border",
          signalBorderColor[overallSignal as keyof typeof signalBorderColor],
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-full",
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
                "font-bold",
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
            <Badge className={cn(
              "font-medium",
              {
                'bg-crypto-buy text-white': overallSignal === 'BUY',
                'bg-crypto-sell text-white': overallSignal === 'SELL',
                'bg-crypto-hold text-white': overallSignal === 'HOLD',
                'bg-gray-400 text-white': overallSignal === 'NEUTRAL'
              }
            )}>
              {confidence.toFixed(0)}% Confidence
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
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
          
          {isBelowThreshold && (
            <p className="text-xs font-medium text-crypto-sell mt-1.5">
              Below threshold ({confidenceThreshold}%)
            </p>
          )}
        </div>
        
        {priceTargets && (overallSignal === 'BUY' || overallSignal === 'SELL') && (
          <div className="mb-5 border border-indigo-200 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 overflow-hidden">
            <div className="flex justify-between items-center bg-indigo-100/80 dark:bg-indigo-900/20 px-3 py-2 border-b border-indigo-200">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300">
                <Target className="h-4 w-4" />
                <span>Trade Setup</span>
              </h3>
              <Badge className={cn(
                "font-medium text-xs py-0.5",
                overallSignal === 'BUY' ? 'bg-crypto-buy text-white' : 'bg-crypto-sell text-white'
              )}>
                R:R {priceTargets.riskRewardRatio.toFixed(1)}
              </Badge>
            </div>
            
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col p-2 bg-white dark:bg-gray-800/60 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entry Price</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">${priceTargets.entryPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col p-2 bg-white dark:bg-gray-800/60 rounded-md border border-crypto-sell/40">
                  <span className="text-xs text-crypto-sell flex items-center mb-1">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Stop Loss
                  </span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">${priceTargets.stopLoss.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col p-2 bg-white dark:bg-gray-800/60 rounded-md border border-crypto-buy/40">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-crypto-buy">Target 1</span>
                    <span className="text-xs text-crypto-buy">+{((Math.abs(priceTargets.target1 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">${priceTargets.target1.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col p-2 bg-white dark:bg-gray-800/60 rounded-md border border-crypto-buy/40">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-crypto-buy">Target 2</span>
                    <span className="text-xs text-crypto-buy">+{((Math.abs(priceTargets.target2 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">${priceTargets.target2.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col p-2 bg-white dark:bg-gray-800/60 rounded-md border border-crypto-buy/40">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-crypto-buy">Target 3</span>
                    <span className="text-xs text-crypto-buy">+{((Math.abs(priceTargets.target3 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">${priceTargets.target3.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {patterns && patterns.length > 0 && (
          <div className="mb-4 border border-gray-200 rounded-lg bg-white dark:bg-gray-800/40 overflow-hidden">
            <div className="flex justify-between items-center px-3 py-2 border-b bg-gray-50 dark:bg-gray-800/60">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Pattern Recognition</span>
              </h3>
              <Badge className={cn(
                patterns[0].type === 'bullish' ? 'bg-crypto-buy' : 'bg-crypto-sell',
                'text-white font-medium text-xs py-0.5'
              )}>
                {patterns[0].type.toUpperCase()}
              </Badge>
            </div>
            
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              {patterns.map((pattern, index) => (
                <div key={index} className="text-xs p-2 rounded-md bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{pattern.name}</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{pattern.confidence.toFixed(0)}%</span>
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">{pattern.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-2 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Signal Details</h3>
        </div>
        <div className="space-y-2 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
          {sortedSignals.map((signal: TradingSignal, index: number) => (
            <div 
              key={index}
              className="p-2.5 rounded-md bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{signal.indicator}</span>
                <Badge 
                  className={cn(
                    "text-xs font-medium py-px", 
                    {
                      'bg-crypto-buy text-white': signal.type === 'BUY',
                      'bg-crypto-sell text-white': signal.type === 'SELL',
                      'bg-crypto-hold text-white': signal.type === 'HOLD',
                      'bg-gray-400 text-white': signal.type === 'NEUTRAL'
                    }
                  )}
                >
                  {signal.type}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{signal.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;

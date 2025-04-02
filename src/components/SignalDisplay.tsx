
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
          <CardTitle className="text-lg font-semibold text-gray-800">Signal Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">{symbol}</span>
            {lastPrice && (
              <span className="font-bold text-gray-800 text-base">${lastPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Prominent signal display at the top */}
        <div className={cn(
          "mb-6 px-4 py-4 rounded-lg flex flex-col items-center",
          signalBackgroundColor[overallSignal as keyof typeof signalBackgroundColor],
          "border",
          signalBorderColor[overallSignal as keyof typeof signalBorderColor],
          "shadow-sm"
        )}>
          <div className="flex items-center justify-center mb-3 gap-2">
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
              "text-2xl font-bold",
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
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
            <div 
              className={cn(
                "h-3 rounded-full", 
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
            <p className="text-sm font-medium text-gray-600">{confidence.toFixed(0)}% confidence</p>
            {isBelowThreshold && (
              <p className="text-sm font-medium text-crypto-sell">Below threshold ({confidenceThreshold}%)</p>
            )}
          </div>
        </div>
        
        {/* Enhanced Price Targets Section - Highlighted prominently at the top */}
        {priceTargets && (overallSignal === 'BUY' || overallSignal === 'SELL') && (
          <div className="mb-5 border-2 border-indigo-200 rounded-lg p-4 shadow-md bg-indigo-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-indigo-800">
                <Target className="h-5 w-5 text-indigo-700" />
                <span>Trade Setup</span>
              </h3>
              <Badge className={cn(
                "font-medium px-2.5 py-1 text-sm",
                overallSignal === 'BUY' ? 'bg-crypto-buy text-white' : 'bg-crypto-sell text-white'
              )}>
                R:R {priceTargets.riskRewardRatio.toFixed(1)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Entry and Stop Loss - Always prominent */}
              <div className="md:col-span-3 grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col p-3 bg-white rounded-md border border-indigo-200 shadow-sm">
                  <span className="text-xs text-gray-500 mb-1">Entry Price</span>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">${priceTargets.entryPrice.toFixed(2)}</span>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                      {lastPrice && lastPrice > priceTargets.entryPrice 
                        ? `${((lastPrice - priceTargets.entryPrice) / priceTargets.entryPrice * 100).toFixed(1)}% above` 
                        : lastPrice && lastPrice < priceTargets.entryPrice
                          ? `${((priceTargets.entryPrice - lastPrice) / priceTargets.entryPrice * 100).toFixed(1)}% below`
                          : 'Current'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex flex-col p-3 bg-white rounded-md border border-crypto-sell shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-crypto-sell font-medium flex items-center">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Stop Loss
                    </span>
                    <span className="text-xs bg-crypto-sell/10 text-crypto-sell px-1.5 py-0.5 rounded">
                      Risk: {((Math.abs(priceTargets.entryPrice - priceTargets.stopLoss) / priceTargets.entryPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">${priceTargets.stopLoss.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Targets */}
              <div className="flex flex-col p-3 bg-white rounded-md border border-crypto-buy shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-crypto-buy">Target 1</span>
                  <span className="text-xs bg-crypto-buy/10 text-crypto-buy px-1.5 py-0.5 rounded">
                    +{((Math.abs(priceTargets.target1 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-base font-bold text-gray-800">${priceTargets.target1.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col p-3 bg-white rounded-md border border-crypto-buy shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-crypto-buy">Target 2</span>
                  <span className="text-xs bg-crypto-buy/10 text-crypto-buy px-1.5 py-0.5 rounded">
                    +{((Math.abs(priceTargets.target2 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-base font-bold text-gray-800">${priceTargets.target2.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col p-3 bg-white rounded-md border border-crypto-buy shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-crypto-buy">Target 3</span>
                  <span className="text-xs bg-crypto-buy/10 text-crypto-buy px-1.5 py-0.5 rounded">
                    +{((Math.abs(priceTargets.target3 - priceTargets.entryPrice) / priceTargets.entryPrice) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-base font-bold text-gray-800">${priceTargets.target3.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Patterns section */}
        {patterns && patterns.length > 0 && (
          <div className="mb-5 border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-800">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Pattern Recognition</span>
              </h3>
              <Badge className={cn(
                patterns[0].type === 'bullish' ? 'bg-crypto-buy' : 'bg-crypto-sell',
                'text-white font-medium px-2.5 py-1'
              )}>
                {patterns[0].type.toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {patterns.map((pattern, index) => (
                <div key={index} className="text-xs p-3 rounded-md bg-gray-50 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800">{pattern.name}</span>
                    <span className="font-medium">{pattern.confidence.toFixed(0)}% confidence</span>
                  </div>
                  <p className="mt-1.5 text-gray-600 leading-relaxed">{pattern.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Signal details section */}
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">Signal Details</h3>
        </div>
        <div className="space-y-3 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
          {sortedSignals.map((signal: TradingSignal, index: number) => (
            <div 
              key={index}
              className="p-3 rounded-md bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800">{signal.indicator}</span>
                <Badge 
                  className={cn(
                    "px-2.5 py-0.5 text-xs font-medium", 
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
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">{signal.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalDisplay;


import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CoinPair, TimeInterval } from '@/services/binanceService';
import { BacktestResults } from './PriceChart';
import { Loader2, Clock, PlayCircle, TrendingUp, RefreshCw, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { addDays, format, isSameDay } from 'date-fns';

interface DateRange {
  from: Date;
  to?: Date;
}

interface BacktestPanelProps {
  selectedPair: CoinPair;
  selectedInterval: TimeInterval;
  onRunBacktest: (settings: BacktestSettings) => Promise<void>;
  isRunning: boolean;
  results: BacktestResults | null;
}

export interface BacktestSettings {
  pair: CoinPair;
  interval: TimeInterval;
  dateRange: DateRange;
  initialCapital: number;
  useStopLoss: boolean;
  useTakeProfit: boolean;
  positionSize: number; // percentage of capital per trade
  strategy: 'default' | 'macd' | 'rsi' | 'combined';
}

const BacktestPanel: React.FC<BacktestPanelProps> = ({ 
  selectedPair, 
  selectedInterval, 
  onRunBacktest,
  isRunning,
  results
}) => {
  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = addDays(today, -30);
  
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: thirtyDaysAgo,
    to: today 
  });
  
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [positionSize, setPositionSize] = useState<number>(10); // 10% of capital per trade
  const [useStopLoss, setUseStopLoss] = useState<boolean>(true);
  const [useTakeProfit, setUseTakeProfit] = useState<boolean>(true);
  const [strategy, setStrategy] = useState<'default' | 'macd' | 'rsi' | 'combined'>('default');

  const handleRunBacktest = async () => {
    const settings: BacktestSettings = {
      pair: selectedPair,
      interval: selectedInterval,
      dateRange,
      initialCapital,
      useStopLoss,
      useTakeProfit,
      positionSize,
      strategy,
    };
    
    await onRunBacktest(settings);
  };

  const formatDateDisplay = (date: Date) => {
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <Card className="shadow-md border border-gray-200">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Backtest Settings
          </CardTitle>
          {results && (
            <Badge className="bg-indigo-100 text-indigo-800 px-2.5 py-1">
              {results.performance.totalTrades} Trades
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-md">
            <span>{formatDateDisplay(dateRange.from)}</span>
            <span className="text-gray-500">to</span>
            <span>{dateRange.to ? formatDateDisplay(dateRange.to) : 'Present'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {dateRange.from && dateRange.to ? 
              `${Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days selected` : 
              'Select a date range'}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Initial Capital ($)</Label>
            <span className="text-sm font-medium">${initialCapital}</span>
          </div>
          <Slider 
            value={[initialCapital]} 
            min={100}
            max={10000}
            step={100}
            onValueChange={(val) => setInitialCapital(val[0])}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Position Size (%)</Label>
            <span className="text-sm font-medium">{positionSize}%</span>
          </div>
          <Slider 
            value={[positionSize]} 
            min={1}
            max={100}
            step={1}
            onValueChange={(val) => setPositionSize(val[0])}
          />
          <div className="text-xs text-gray-500">
            ${(initialCapital * positionSize / 100).toFixed(2)} per trade
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between space-x-2">
            <Label className="text-sm font-medium" htmlFor="use-sl">Use Stop Loss</Label>
            <Switch 
              id="use-sl" 
              checked={useStopLoss} 
              onCheckedChange={setUseStopLoss} 
            />
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <Label className="text-sm font-medium" htmlFor="use-tp">Use Take Profit</Label>
            <Switch 
              id="use-tp" 
              checked={useTakeProfit} 
              onCheckedChange={setUseTakeProfit} 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trading Strategy</Label>
          <Select 
            value={strategy} 
            onValueChange={(value) => setStrategy(value as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Combined Indicators)</SelectItem>
              <SelectItem value="macd">MACD Crossover</SelectItem>
              <SelectItem value="rsi">RSI Overbought/Oversold</SelectItem>
              <SelectItem value="combined">Combined with S/R Levels</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          className={cn(
            "w-full mt-2",
            results ? "bg-indigo-600 hover:bg-indigo-700" : ""
          )}
          onClick={handleRunBacktest}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Backtest...
            </>
          ) : results ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Again
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Backtest
            </>
          )}
        </Button>
        
        {results && (
          <div className="flex items-center justify-between p-3 rounded-md bg-indigo-50 border border-indigo-100">
            <div>
              <span className="text-xs text-gray-600">Performance:</span>
              <div className={cn(
                "text-sm font-bold",
                results.performance.netProfit >= 0 ? "text-crypto-buy" : "text-crypto-sell"
              )}>
                {results.performance.netProfit >= 0 ? "+" : ""}{results.performance.netProfit.toFixed(2)}%
              </div>
            </div>
            <Badge className={cn(
              results.performance.winRate > 50 ? "bg-crypto-buy/10 text-crypto-buy" : "bg-crypto-sell/10 text-crypto-sell"
            )}>
              Win Rate: {results.performance.winRate.toFixed(1)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BacktestPanel;

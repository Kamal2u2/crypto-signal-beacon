
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CoinPair, TimeInterval, COIN_PAIRS } from '@/services/binanceService';
import { BarChart3, Clock, LineChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IndicatorsPanelProps {
  selectedPair: CoinPair;
  selectedInterval: TimeInterval;
}

const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({ 
  selectedPair, 
  selectedInterval
}) => {
  // State for coin pair selection
  const [indicatorPair, setIndicatorPair] = useState<CoinPair>(selectedPair);
  const [allCoinPairs, setAllCoinPairs] = useState<CoinPair[]>(COIN_PAIRS);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCoinSearch, setOpenCoinSearch] = useState(false);
  
  // State for time interval selection
  const [indicatorInterval, setIndicatorInterval] = useState<TimeInterval>(selectedInterval);
  const timeIntervals: { value: TimeInterval; label: string }[] = [
    { value: '1m', label: '1 Minute' },
    { value: '3m', label: '3 Minutes' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '2h', label: '2 Hours' },
    { value: '4h', label: '4 Hours' },
    { value: '6h', label: '6 Hours' },
    { value: '8h', label: '8 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '3d', label: '3 Days' },
    { value: '1w', label: '1 Week' },
    { value: '1M', label: '1 Month' },
  ];
  
  // Active indicators state
  const [activeTab, setActiveTab] = useState('momentum');
  
  // Filtered coin pairs based on search term
  const filteredPairs = searchTerm 
    ? allCoinPairs.filter(pair => 
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCoinPairs.slice(0, 50); // Limit initial display to prevent lag

  return (
    <Card className="shadow-lg border border-gray-200 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl border-b pb-4 pt-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Technical Indicators
          </CardTitle>
          <Badge className="bg-indigo-100 text-indigo-800 px-2.5 py-1 font-medium">
            {indicatorPair.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-4 px-5 space-y-5">
        {/* Coin Pair Selection */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-gray-700">Coin Pair</Label>
          <Popover open={openCoinSearch} onOpenChange={setOpenCoinSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors font-normal"
              >
                {indicatorPair.label}
                <TrendingUp className="ml-2 h-4 w-4 shrink-0 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white shadow-xl border-gray-200" align="start">
              <Command className="bg-transparent">
                <CommandInput 
                  placeholder="Search coin pair..." 
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-10 border-0 focus-visible:ring-0 text-gray-800"
                />
                <CommandList className="max-h-[300px] overflow-auto">
                  <CommandEmpty>No coin pairs found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[300px]">
                      {filteredPairs.map((pair) => (
                        <CommandItem
                          key={pair.symbol}
                          value={pair.symbol}
                          onSelect={() => {
                            setIndicatorPair(pair);
                            setOpenCoinSearch(false);
                            setSearchTerm('');
                          }}
                          className="cursor-pointer hover:bg-gray-50 flex items-center py-2.5"
                        >
                          {pair.label}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Time Interval Selection */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            Time Frame
          </Label>
          <Select 
            value={indicatorInterval} 
            onValueChange={(value) => setIndicatorInterval(value as TimeInterval)}
          >
            <SelectTrigger className="w-full bg-white border-gray-300 hover:border-gray-400 transition-colors">
              <SelectValue placeholder="Select time frame" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-lg">
              {timeIntervals.map((interval) => (
                <SelectItem key={interval.value} value={interval.value} className="hover:bg-gray-50">
                  {interval.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 italic pl-1">
            Select the candle time frame for indicator analysis
          </p>
        </div>
        
        {/* Indicator Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 mb-4 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="momentum" 
              className={cn(
                "rounded-md transition-all", 
                activeTab === "momentum" ? "bg-white shadow-sm text-indigo-700" : "text-gray-600 hover:text-gray-800"
              )}
            >
              Momentum
            </TabsTrigger>
            <TabsTrigger 
              value="trend" 
              className={cn(
                "rounded-md transition-all", 
                activeTab === "trend" ? "bg-white shadow-sm text-indigo-700" : "text-gray-600 hover:text-gray-800"
              )}
            >
              Trend
            </TabsTrigger>
            <TabsTrigger 
              value="volatility" 
              className={cn(
                "rounded-md transition-all", 
                activeTab === "volatility" ? "bg-white shadow-sm text-indigo-700" : "text-gray-600 hover:text-gray-800"
              )}
            >
              Volatility
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="momentum" className="space-y-3 mt-0">
            <IndicatorCard 
              name="RSI (14)" 
              value="58.32" 
              status="neutral" 
              description="Relative Strength Index measures the speed and change of price movements."
            />
            <IndicatorCard 
              name="MACD" 
              value="0.0012" 
              status="bullish" 
              description="Moving Average Convergence Divergence is a trend-following momentum indicator."
            />
            <IndicatorCard 
              name="Stochastic" 
              value="75.45" 
              status="overbought" 
              description="The Stochastic Oscillator is a momentum indicator comparing a particular closing price to a range of prices over time."
            />
          </TabsContent>
          
          <TabsContent value="trend" className="space-y-3 mt-0">
            <IndicatorCard 
              name="MA 50/200" 
              value="Bullish Cross" 
              status="bullish" 
              description="The 50 and 200 day moving average crossover is a strong signal of market direction."
            />
            <IndicatorCard 
              name="ADX" 
              value="22.5" 
              status="moderate" 
              description="Average Directional Index measures the strength of a trend, regardless of its direction."
            />
            <IndicatorCard 
              name="Ichimoku" 
              value="Above Cloud" 
              status="bullish" 
              description="Ichimoku Cloud provides support/resistance, momentum, and trend direction signals."
            />
          </TabsContent>
          
          <TabsContent value="volatility" className="space-y-3 mt-0">
            <IndicatorCard 
              name="Bollinger Bands" 
              value="Upper Contact" 
              status="overbought" 
              description="Bollinger Bands measure volatility and provide relative high and low boundaries."
            />
            <IndicatorCard 
              name="ATR" 
              value="0.0245" 
              status="high" 
              description="Average True Range measures market volatility."
            />
            <IndicatorCard 
              name="Keltner Channels" 
              value="Middle Band" 
              status="neutral" 
              description="Keltner Channels are volatility-based bands with moving average in the middle."
            />
          </TabsContent>
        </Tabs>
        
        <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm">
          <LineChart className="mr-2 h-4 w-4" />
          Apply Indicators to Chart
        </Button>
      </CardContent>
    </Card>
  );
};

// Helper component for individual indicators
const IndicatorCard = ({ name, value, status, description }: { 
  name: string, 
  value: string, 
  status: 'bullish' | 'bearish' | 'neutral' | 'overbought' | 'oversold' | 'high' | 'low' | 'moderate',
  description: string 
}) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'bullish': return 'text-crypto-buy bg-crypto-buy/10 border-crypto-buy/30';
      case 'bearish': return 'text-crypto-sell bg-crypto-sell/10 border-crypto-sell/30';
      case 'overbought': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'oversold': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'high': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn("p-3 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200", getStatusColor(status))}>
      <div className="flex justify-between items-center mb-1.5">
        <h3 className="font-medium text-gray-800">{name}</h3>
        <Badge className={cn(
          "capitalize rounded-full text-xs font-semibold px-2.5 shadow-sm",
          status === 'bullish' && "bg-crypto-buy text-white",
          status === 'bearish' && "bg-crypto-sell text-white",
          status === 'neutral' && "bg-gray-500 text-white",
          status === 'overbought' && "bg-amber-500 text-white",
          status === 'oversold' && "bg-blue-500 text-white",
          status === 'high' && "bg-purple-500 text-white",
          status === 'low' && "bg-green-500 text-white",
          status === 'moderate' && "bg-gray-500 text-white"
        )}>
          {status}
        </Badge>
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <p className="text-xs mt-1.5 text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

export default IndicatorsPanel;

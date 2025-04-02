
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  CoinPair, 
  COIN_PAIRS, 
  TimeInterval
} from '@/services/binanceService';
import { RefreshCw, Play, Pause } from 'lucide-react';

interface ControlPanelProps {
  selectedPair: CoinPair;
  setSelectedPair: (pair: CoinPair) => void;
  selectedInterval: TimeInterval;
  setSelectedInterval: (interval: TimeInterval) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  isAutoRefreshEnabled: boolean;
  setIsAutoRefreshEnabled: (enabled: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedPair,
  setSelectedPair,
  selectedInterval,
  setSelectedInterval,
  refreshInterval,
  setRefreshInterval,
  isAutoRefreshEnabled,
  setIsAutoRefreshEnabled,
  onRefresh,
  isLoading
}) => {
  // Available time intervals
  const intervals: { value: TimeInterval; label: string }[] = [
    { value: '1m', label: '1 Minute' },
    { value: '3m', label: '3 Minutes' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' }
  ];

  // Available refresh intervals in milliseconds
  const refreshIntervals = [
    { value: 10000, label: '10 seconds' },
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' }
  ];

  const handlePairChange = (value: string) => {
    const pair = COIN_PAIRS.find(p => p.symbol === value) || COIN_PAIRS[0];
    setSelectedPair(pair);
  };

  const handleIntervalChange = (value: string) => {
    setSelectedInterval(value as TimeInterval);
  };

  const handleRefreshIntervalChange = (value: string) => {
    setRefreshInterval(parseInt(value));
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center w-full p-4 bg-crypto-secondary rounded-lg shadow-md">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Coin Pair</label>
        <Select
          value={selectedPair.symbol}
          onValueChange={handlePairChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select coin pair" />
          </SelectTrigger>
          <SelectContent className="bg-crypto-primary border-gray-700">
            {COIN_PAIRS.map((pair) => (
              <SelectItem key={pair.symbol} value={pair.symbol}>
                {pair.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Time Frame</label>
        <Select
          value={selectedInterval}
          onValueChange={handleIntervalChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select time frame" />
          </SelectTrigger>
          <SelectContent className="bg-crypto-primary border-gray-700">
            {intervals.map((interval) => (
              <SelectItem key={interval.value} value={interval.value}>
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-muted-foreground">Refresh Every</label>
        <Select
          value={refreshInterval.toString()}
          onValueChange={handleRefreshIntervalChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select refresh interval" />
          </SelectTrigger>
          <SelectContent className="bg-crypto-primary border-gray-700">
            {refreshIntervals.map((interval) => (
              <SelectItem key={interval.value} value={interval.value.toString()}>
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 mt-4 md:mt-5">
        <Button 
          onClick={onRefresh} 
          variant="outline" 
          disabled={isLoading}
          className="bg-crypto-primary border-gray-700 hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Button 
          onClick={toggleAutoRefresh} 
          variant={isAutoRefreshEnabled ? "default" : "outline"}
          className={
            isAutoRefreshEnabled 
              ? "bg-primary hover:bg-primary/90" 
              : "bg-crypto-primary border-gray-700 hover:bg-gray-700"
          }
        >
          {isAutoRefreshEnabled ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Auto
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Auto
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;

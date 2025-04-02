import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COIN_PAIRS, CoinPair, TimeInterval } from '@/services/binanceService';

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
  // Function to format refresh interval as HH:MM:SS
  const formatInterval = (interval: number): string => {
    const seconds = Math.floor(interval / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  return (
    <Card className="control-panel-card">
      <CardHeader>
        <CardTitle>Trading Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Coin Pair Selection */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="coin-pair">Coin Pair</Label>
          <Select value={selectedPair.symbol} onValueChange={(value) => {
            const pair = COIN_PAIRS.find(p => p.symbol === value);
            if (pair) {
              setSelectedPair(pair);
            }
          }}>
            <SelectTrigger id="coin-pair" className="w-[180px]">
              <SelectValue placeholder="Select Pair" />
            </SelectTrigger>
            <SelectContent>
              {COIN_PAIRS.map((pair) => (
                <SelectItem key={pair.symbol} value={pair.symbol}>
                  {pair.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Interval Selection */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="time-interval">Time Interval</Label>
          <Select value={selectedInterval} onValueChange={setSelectedInterval}>
            <SelectTrigger id="time-interval" className="w-[180px]">
              <SelectValue placeholder="Select Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="30m">30 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Auto-Refresh Configuration */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-refresh">Auto-Refresh</Label>
            <p className="text-sm text-muted-foreground">
              Update data automatically
            </p>
          </div>
          <Switch
            id="auto-refresh"
            checked={isAutoRefreshEnabled}
            onCheckedChange={setIsAutoRefreshEnabled}
          />
        </div>

        {/* Refresh Interval Selection */}
        {isAutoRefreshEnabled && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="refresh-interval">Refresh Interval</Label>
            <Select
              value={String(refreshInterval)}
              onValueChange={(value) => setRefreshInterval(Number(value))}
            >
              <SelectTrigger id="refresh-interval" className="w-[180px]">
                <SelectValue placeholder="Select Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15000">15 Seconds</SelectItem>
                <SelectItem value="30000">30 Seconds</SelectItem>
                <SelectItem value="60000">1 Minute</SelectItem>
                <SelectItem value="120000">2 Minutes</SelectItem>
                <SelectItem value="300000">5 Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        {/* Display Refresh Interval */}
        {isAutoRefreshEnabled && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Data refreshes every {formatInterval(refreshInterval)}
            </span>
          </div>
        )}

        {/* Manual Refresh Button */}
        <Button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;

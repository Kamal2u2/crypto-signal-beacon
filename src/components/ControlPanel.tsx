
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { RefreshCw, Clock, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COIN_PAIRS, CoinPair, TimeInterval, fetchAllCoinPairs } from '@/services/binanceService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

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
  // State for all available coin pairs
  const [allCoinPairs, setAllCoinPairs] = useState<CoinPair[]>(COIN_PAIRS);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCoinSearch, setOpenCoinSearch] = useState(false);

  // Fetch all coin pairs on component mount
  useEffect(() => {
    const loadAllPairs = async () => {
      setIsLoadingPairs(true);
      try {
        const pairs = await fetchAllCoinPairs();
        setAllCoinPairs(pairs);
      } catch (error) {
        console.error('Failed to load all pairs:', error);
      } finally {
        setIsLoadingPairs(false);
      }
    };

    loadAllPairs();
  }, []);

  // Filtered coin pairs based on search term
  const filteredPairs = searchTerm 
    ? allCoinPairs.filter(pair => 
        pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pair.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCoinPairs.slice(0, 50); // Limit initial display to prevent lag

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
    <Card className="control-panel-card bg-white">
      <CardHeader>
        <CardTitle>Trading Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Coin Pair Selection with Search */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="coin-pair">Coin Pair</Label>
          <Popover open={openCoinSearch} onOpenChange={setOpenCoinSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-white border-gray-300"
              >
                {selectedPair.label}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white" align="start">
              <Command className="bg-white">
                <CommandInput 
                  placeholder="Search coin pair..." 
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-9 bg-white"
                />
                <CommandList className="command-list bg-white">
                  <CommandEmpty>No coin pairs found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[300px]">
                      {isLoadingPairs ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading available pairs...
                        </div>
                      ) : (
                        filteredPairs.map((pair) => (
                          <CommandItem
                            key={pair.symbol}
                            value={pair.symbol}
                            onSelect={() => {
                              setSelectedPair(pair);
                              setOpenCoinSearch(false);
                              setSearchTerm('');
                            }}
                            className="cursor-pointer bg-white hover:bg-gray-100"
                          >
                            {pair.label}
                          </CommandItem>
                        ))
                      )}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Interval Selection */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="time-interval">Time Interval</Label>
          <Select value={selectedInterval} onValueChange={setSelectedInterval}>
            <SelectTrigger id="time-interval" className="w-[180px] bg-white">
              <SelectValue placeholder="Select Interval" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md">
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="3m">3 Minutes</SelectItem>
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
              <SelectTrigger id="refresh-interval" className="w-[180px] bg-white">
                <SelectValue placeholder="Select Interval" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-md">
                <SelectItem value="5000">5 Seconds</SelectItem>
                <SelectItem value="10000">10 Seconds</SelectItem>
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
        <Button onClick={onRefresh} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
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

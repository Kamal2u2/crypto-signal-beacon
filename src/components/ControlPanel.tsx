
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COIN_PAIRS, CoinPair, TimeInterval, fetchAllCoinPairs } from '@/services/binanceService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import ThemeToggle from './ThemeToggle';

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

  return (
    <Card className="control-panel-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trading Configuration</CardTitle>
        <ThemeToggle />
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
                className="w-full justify-between bg-background border-input"
              >
                {selectedPair.label}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-popover" align="start">
              <Command className="bg-transparent">
                <CommandInput 
                  placeholder="Search coin pair..." 
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-9"
                />
                <CommandList className="command-list">
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
                            className="cursor-pointer hover:bg-muted"
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
            <SelectTrigger id="time-interval" className="w-[180px] bg-background">
              <SelectValue placeholder="Select Interval" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-md">
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

        {/* Manual Refresh Button */}
        <Button onClick={onRefresh} disabled={isLoading} className="bg-primary hover:bg-primary/90">
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

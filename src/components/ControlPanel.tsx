
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CRYPTO_PAIRS, 
  STOCK_PAIRS,
  AssetPair, 
  AssetType,
  TimeInterval, 
  fetchAllAssetPairs,
  fetchAllBinancePairs
} from '@/services/binanceService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import AssetTypeSelector from './AssetTypeSelector';
import { toast } from "sonner";

interface ControlPanelProps {
  selectedPair: AssetPair;
  setSelectedPair: (pair: AssetPair) => void;
  selectedInterval: TimeInterval;
  setSelectedInterval: (interval: TimeInterval) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  isAutoRefreshEnabled: boolean;
  setIsAutoRefreshEnabled: (enabled: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
  selectedAssetType: AssetType;
  setSelectedAssetType: (type: AssetType) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedPair,
  setSelectedPair,
  selectedInterval,
  setSelectedInterval,
  onRefresh,
  isLoading,
  selectedAssetType,
  setSelectedAssetType
}) => {
  // State for all available asset pairs
  const [allAssetPairs, setAllAssetPairs] = useState<AssetPair[]>(
    selectedAssetType === AssetType.CRYPTO ? CRYPTO_PAIRS : STOCK_PAIRS
  );
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openAssetSearch, setOpenAssetSearch] = useState(false);

  // Fetch all pairs on component mount and when asset type changes
  useEffect(() => {
    const loadAllPairs = async () => {
      setIsLoadingPairs(true);
      try {
        if (selectedAssetType === AssetType.CRYPTO) {
          // For crypto, fetch all Binance pairs
          const pairs = await fetchAllBinancePairs();
          setAllAssetPairs(pairs);
          toast.success(`Loaded ${pairs.length} cryptocurrency pairs`, {
            duration: 3000,
          });
        } else {
          // For stocks, use predefined list
          setAllAssetPairs(STOCK_PAIRS);
        }
      } catch (error) {
        console.error('Failed to load pairs:', error);
        toast.error('Failed to load all trading pairs. Using default list.', {
          duration: 5000,
        });
        // Fallback to predefined lists
        setAllAssetPairs(selectedAssetType === AssetType.CRYPTO ? CRYPTO_PAIRS : STOCK_PAIRS);
      } finally {
        setIsLoadingPairs(false);
      }
    };

    loadAllPairs();
  }, [selectedAssetType]);
  
  // Effect to filter pairs when asset type changes
  useEffect(() => {
    // When asset type changes, update the pairs list
    const filteredPairs = allAssetPairs.filter(pair => pair.assetType === selectedAssetType);
    
    // If the current selected pair doesn't match the selected asset type, switch to first pair of the new type
    if (selectedPair.assetType !== selectedAssetType && filteredPairs.length > 0) {
      setSelectedPair(filteredPairs[0]);
    }
  }, [selectedAssetType, allAssetPairs]);

  // Filtered pairs based on search term and selected asset type
  const filteredPairs = searchTerm 
    ? allAssetPairs.filter(pair => 
        pair.assetType === selectedAssetType &&
        (pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
         pair.label.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allAssetPairs.filter(pair => pair.assetType === selectedAssetType).slice(0, 100); // Show more initial pairs

  return (
    <Card className="control-panel-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trading Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Asset Type Selector */}
        <AssetTypeSelector 
          selectedAssetType={selectedAssetType}
          setSelectedAssetType={setSelectedAssetType}
        />
        
        {/* Asset Pair Selection with Search */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="asset-pair">
            {selectedAssetType === AssetType.CRYPTO ? 'Coin Pair' : 'Stock Symbol'}
          </Label>
          <Popover open={openAssetSearch} onOpenChange={setOpenAssetSearch}>
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
                  placeholder={`Search ${selectedAssetType === AssetType.CRYPTO ? 'coin pair' : 'stock'}...`}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-9"
                />
                <CommandList className="command-list max-h-[300px]">
                  <CommandEmpty>No {selectedAssetType === AssetType.CRYPTO ? 'coin pairs' : 'stocks'} found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[300px]">
                      {isLoadingPairs ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading available {selectedAssetType === AssetType.CRYPTO ? 'pairs' : 'stocks'}...
                        </div>
                      ) : (
                        filteredPairs.map((pair) => (
                          <CommandItem
                            key={pair.symbol}
                            value={pair.symbol}
                            onSelect={() => {
                              setSelectedPair(pair);
                              setOpenAssetSearch(false);
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

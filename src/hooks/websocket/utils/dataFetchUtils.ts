
import { fetchKlineData, refreshData } from '@/services/binanceService';
import { KlineData, TimeInterval } from '@/services/market/types';
import { toast } from '@/components/ui/use-toast';
import { generateSignals } from '@/services/technical/signals/generateSignals';

// Add a fallback function to generate simulated data when API fails
const generateSimulatedStockData = (symbol: string, lastKnownData: KlineData[] | null): KlineData[] => {
  console.log(`Generating simulated data for ${symbol} as API is unavailable`);
  
  const now = Date.now();
  const timeStep = 60000; // 1 minute in milliseconds
  const result: KlineData[] = [];
  
  // If we have existing data, use it as a base
  if (lastKnownData && lastKnownData.length > 0) {
    // Create a copy of last known data and update timestamps
    return lastKnownData.map((candle, index) => {
      const timeOffset = (lastKnownData.length - index) * timeStep;
      return {
        ...candle,
        openTime: now - timeOffset,
        closeTime: now - timeOffset + timeStep - 1,
      };
    });
  } else {
    // Generate random data if no previous data exists
    const basePrice = symbol.includes('AAPL') ? 170 : 
                      symbol.includes('MSFT') ? 380 : 
                      symbol.includes('GOOGL') ? 150 : 
                      symbol.includes('AMZN') ? 180 : 100;
    
    // Generate 100 candles
    for (let i = 0; i < 100; i++) {
      const timeOffset = (100 - i) * timeStep;
      const volatility = 0.01; // 1% price movement
      const change = basePrice * volatility * (Math.random() * 2 - 1);
      
      const open = basePrice + change;
      const high = open * (1 + Math.random() * 0.005);
      const low = open * (1 - Math.random() * 0.005);
      const close = (open + high + low) / 3 + (Math.random() * 0.01 - 0.005) * open;
      const volume = Math.random() * 10000 + 1000;
      
      result.push({
        openTime: now - timeOffset,
        open,
        high,
        low,
        close,
        volume,
        closeTime: now - timeOffset + timeStep - 1,
        quoteAssetVolume: volume * close,
        trades: Math.floor(Math.random() * 100),
        takerBuyBaseAssetVolume: volume * 0.4,
        takerBuyQuoteAssetVolume: volume * 0.4 * close
      });
    }
    
    return result;
  }
};

export const fetchData = async (
  symbol: string,
  interval: TimeInterval,
  klineDataRef: React.MutableRefObject<KlineData[]>,
  setKlineData: (data: KlineData[]) => void,
  processNewSignal: (signals: any) => void,
  lastFetchTimeRef: React.MutableRefObject<number>,
  fetchInProgressRef: React.MutableRefObject<boolean>,
  setIsLoading: (isLoading: boolean) => void,
  debugCounterRef: React.MutableRefObject<number>
) => {
  const now = Date.now();
  
  // Throttle API calls
  if (now - lastFetchTimeRef.current < 2000) {
    console.log('Too many requests, throttling API calls');
    return;
  }
  
  // Prevent concurrent fetches
  if (fetchInProgressRef.current) {
    console.log('Fetch already in progress, skipping duplicate fetch request');
    return;
  }
  
  fetchInProgressRef.current = true;
  lastFetchTimeRef.current = now;
  setIsLoading(true);
  debugCounterRef.current += 1;
  const cycleNumber = debugCounterRef.current;
  
  try {
    console.log(`[Cycle ${cycleNumber}] Fetching data for ${symbol} at ${interval} interval`);
    
    // Try to refresh existing data first
    await refreshData(symbol, interval);
    
    // Then get full data
    let data = await fetchKlineData(symbol, interval, 100);
    
    // If the API call returned no data but we have existing data,
    // use simulated data based on the existing data
    if (data.length === 0 && klineDataRef.current.length > 0) {
      console.log(`API returned no data for ${symbol}, using simulation based on existing data`);
      data = generateSimulatedStockData(symbol, klineDataRef.current);
    }
    // If we have no data at all, generate simulated data
    else if (data.length === 0) {
      console.log(`API returned no data for ${symbol}, generating simulated data`);
      data = generateSimulatedStockData(symbol, null);
      
      // Show a toast for the simulation mode
      const isStockSymbol = symbol.includes('.') || /^[A-Z]{1,5}$/.test(symbol);
      if (isStockSymbol) {
        toast({
          title: "Using simulated data",
          description: `Live data for ${symbol} is unavailable, using simulation mode`,
          variant: "warning"
        });
      }
    }
    
    if (data.length > 0) {
      klineDataRef.current = data;
      setKlineData(data);
      
      const signals = generateSignals(data);
      processNewSignal(signals);
      
      console.log(`[Cycle ${cycleNumber}] Signal processing complete`);
    } else {
      // Show toast only for complete data failures
      const isStockSymbol = symbol.includes('.') || /^[A-Z]{1,5}$/.test(symbol);
      
      if (isStockSymbol) {
        toast({
          title: "Unable to load stock data",
          description: `Please check if ${symbol} is a valid stock symbol with available data`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "No data available",
          description: `Could not retrieve data for ${symbol}`,
          variant: "destructive"
        });
      }
    }
  } catch (error) {
    console.error(`[Cycle ${cycleNumber}] Error fetching data:`, error);
    
    // Try to use simulated data if API call fails
    if (klineDataRef.current.length > 0) {
      console.log(`Using simulation based on existing data due to API error`);
      const simulatedData = generateSimulatedStockData(symbol, klineDataRef.current);
      klineDataRef.current = simulatedData;
      setKlineData(simulatedData);
      
      const signals = generateSignals(simulatedData);
      processNewSignal(signals);
      
      toast({
        title: "Using cached data",
        description: "Connection issues detected, using locally cached data",
        variant: "warning"
      });
    } else {
      console.log(`Generating new simulated data due to API error`);
      const simulatedData = generateSimulatedStockData(symbol, null);
      klineDataRef.current = simulatedData;
      setKlineData(simulatedData);
      
      const signals = generateSignals(simulatedData);
      processNewSignal(signals);
      
      toast({
        title: "Using simulation mode",
        description: "Unable to connect to data provider, showing simulated data",
        variant: "warning"
      });
    }
  } finally {
    setIsLoading(false);
    fetchInProgressRef.current = false;
  }
};

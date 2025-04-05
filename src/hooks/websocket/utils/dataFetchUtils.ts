
import { fetchKlineData, refreshData } from '@/services/binanceService';
import { KlineData, TimeInterval } from '@/services/market/types';
import { toast } from '@/components/ui/use-toast';
import { generateSignals } from '@/services/technical/signals/generateSignals';

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
    
    // Try to refresh existing data first (for stocks)
    await refreshData(symbol, interval);
    
    // Then get full data
    const data = await fetchKlineData(symbol, interval, 100);
    
    if (data.length > 0) {
      klineDataRef.current = data;
      setKlineData(data);
      
      const signals = generateSignals(data);
      processNewSignal(signals);
      
      console.log(`[Cycle ${cycleNumber}] Signal processing complete`);
    } else {
      // Show toast only for complete data failures, not for API endpoint errors
      // This prevents showing error toasts for normal API errors that the system can recover from
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
    toast({
      title: "Error",
      description: "Failed to fetch market data",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
    fetchInProgressRef.current = false;
  }
};

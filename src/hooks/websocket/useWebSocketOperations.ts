import { useCallback, useRef } from 'react';
import { 
  fetchKlineData, 
  initializeWebSocket,
  closeWebSocket,
  updateKlineData
} from '@/services/binanceService';
import { KlineData, AssetPair as CoinPair, TimeInterval } from '@/services/market/types';
import { generateSignals } from '@/services/technical/signals/generateSignals';
import { toast } from '@/components/ui/use-toast';

interface WebSocketOperationsProps {
  selectedPair: CoinPair;
  selectedInterval: TimeInterval;
  processNewSignal: (signals: any) => void;
  klineDataRef: React.MutableRefObject<KlineData[]>;
  setKlineData: (data: KlineData[]) => void;
  webSocketInitializedRef: React.MutableRefObject<boolean>;
  reconnectAttemptsRef: React.MutableRefObject<number>;
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  previousPairRef: React.MutableRefObject<string>;
  previousIntervalRef: React.MutableRefObject<string>;
  fetchInProgressRef: React.MutableRefObject<boolean>;
  lastFetchTimeRef: React.MutableRefObject<number>;
  setIsLoading: (isLoading: boolean) => void;
  debugCounterRef: React.MutableRefObject<number>;
}

export const useWebSocketOperations = ({
  selectedPair,
  selectedInterval,
  processNewSignal,
  klineDataRef,
  setKlineData,
  webSocketInitializedRef,
  reconnectAttemptsRef,
  reconnectTimeoutRef,
  previousPairRef,
  previousIntervalRef,
  fetchInProgressRef,
  lastFetchTimeRef,
  setIsLoading,
  debugCounterRef
}: WebSocketOperationsProps) => {

  const handleKlineUpdate = useCallback((newKline: KlineData) => {
    updateKlineData(newKline);
    
    const updatedData = [...klineDataRef.current];
    const existingIndex = updatedData.findIndex(k => k.openTime === newKline.openTime);
    
    if (existingIndex !== -1) {
      updatedData[existingIndex] = newKline;
    } else {
      updatedData.push(newKline);
      if (updatedData.length > 1000) {
        updatedData.shift();
      }
    }
    
    klineDataRef.current = updatedData;
    setKlineData(updatedData);
    
    const newSignals = generateSignals(updatedData);
    processNewSignal(newSignals);
  }, [klineDataRef, setKlineData, processNewSignal]);

  const setupWebSocket = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping WebSocket setup');
      return;
    }
    
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      console.log('Too many requests, throttling API calls');
      return;
    }
    
    fetchInProgressRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      if (webSocketInitializedRef.current && 
          previousPairRef.current === selectedPair.symbol && 
          previousIntervalRef.current === selectedInterval) {
        fetchInProgressRef.current = false;
        return;
      }
      
      console.log(`Setting up WebSocket for ${selectedPair.symbol} at ${selectedInterval} interval`);
      
      previousPairRef.current = selectedPair.symbol;
      previousIntervalRef.current = selectedInterval;
      
      closeWebSocket();
      webSocketInitializedRef.current = false;
      
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval);
      if (data && data.length > 0) {
        klineDataRef.current = data;
        setKlineData(data);
        
        const signals = generateSignals(data);
        processNewSignal(signals);
      }
      
      initializeWebSocket(
        selectedPair.symbol,
        selectedInterval,
        handleKlineUpdate
      );
      
      webSocketInitializedRef.current = true;
      reconnectAttemptsRef.current = 0;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      
      if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current > 5) {
        toast({
          title: "Connection Issue",
          description: "Attempting to reconnect chart data...",
          variant: "destructive"
        });
      }
      
      reconnectAttemptsRef.current++;
      
      const backoffTime = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (reconnectAttemptsRef.current < 10) {
          closeWebSocket();
          webSocketInitializedRef.current = false;
          setupWebSocket();
        }
      }, backoffTime);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [
    selectedPair.symbol,
    selectedInterval,
    handleKlineUpdate,
    klineDataRef,
    setKlineData,
    processNewSignal,
    webSocketInitializedRef,
    reconnectAttemptsRef,
    reconnectTimeoutRef,
    previousPairRef,
    previousIntervalRef,
    fetchInProgressRef,
    lastFetchTimeRef
  ]);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      console.log('Too many requests, throttling API calls');
      return;
    }
    
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
      console.log(`[Cycle ${cycleNumber}] Fetching data for ${selectedPair.symbol} at ${selectedInterval} interval`);
      
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval, 100);
      
      if (data.length > 0) {
        klineDataRef.current = data;
        setKlineData(data);
        
        const signals = generateSignals(data);
        processNewSignal(signals);
        
        console.log(`[Cycle ${cycleNumber}] Signal processing complete`);
      } else {
        toast({
          title: "No data available",
          description: `Could not retrieve data for ${selectedPair.label}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`[Cycle ${cycleNumber}] Error fetching data:`, error);
      toast({
        title: "Error",
        description: "Failed to fetch data from Binance API",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [
    selectedPair,
    selectedInterval,
    klineDataRef,
    setKlineData,
    processNewSignal,
    fetchInProgressRef,
    lastFetchTimeRef,
    setIsLoading,
    debugCounterRef
  ]);

  const handleRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      console.log('Too many refreshes, throttling API calls');
      toast({
        title: "Please wait",
        description: "Refreshing too quickly, please wait a moment",
      });
      return;
    }
    
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping refresh request');
      return;
    }
    
    closeWebSocket();
    webSocketInitializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsLoading(true);
    
    setTimeout(() => {
      setupWebSocket().finally(() => {
        setIsLoading(false);
      });
    }, 500);
  }, [
    setupWebSocket,
    webSocketInitializedRef,
    reconnectAttemptsRef,
    fetchInProgressRef,
    lastFetchTimeRef,
    setIsLoading
  ]);

  const cleanupResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    closeWebSocket();
    webSocketInitializedRef.current = false;
  }, [reconnectTimeoutRef, webSocketInitializedRef]);

  return {
    handleKlineUpdate,
    setupWebSocket,
    fetchData,
    handleRefresh,
    cleanupResources
  };
};

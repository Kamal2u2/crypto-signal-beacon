import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { 
  CoinPair, 
  TimeInterval, 
  fetchKlineData,
  initializeWebSocket,
  closeWebSocket,
  updateKlineData,
  KlineData
} from '@/services/binanceService';
import { generateSignals } from '@/services/technicalAnalysisService';

interface WebSocketManagerProps {
  selectedPair: CoinPair;
  selectedInterval: TimeInterval;
  processNewSignal: (signals: any) => void;
}

export const useWebSocketManager = ({
  selectedPair,
  selectedInterval,
  processNewSignal
}: WebSocketManagerProps) => {
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const webSocketInitializedRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debugCounterRef = useRef<number>(0);
  const previousPairRef = useRef<string>(selectedPair.symbol);
  const previousIntervalRef = useRef<string>(selectedInterval);
  const fetchInProgressRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const klineDataRef = useRef<KlineData[]>([]);
  
  useEffect(() => {
    klineDataRef.current = klineData;
  }, [klineData]);

  const processNewSignalRef = useRef(processNewSignal);
  useEffect(() => {
    processNewSignalRef.current = processNewSignal;
  }, [processNewSignal]);

  const handleKlineUpdate = useCallback((newKline: KlineData) => {
    const updatedData = updateKlineData(newKline, klineDataRef.current);
    klineDataRef.current = updatedData;
    
    setKlineData(updatedData);
    
    const newSignals = generateSignals(updatedData);
    processNewSignalRef.current(newSignals);
  }, []);

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
        processNewSignalRef.current(signals);
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
  }, [selectedPair.symbol, selectedInterval, handleKlineUpdate]);

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
        processNewSignalRef.current(signals);
        
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
    selectedInterval
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
  }, [setupWebSocket]);

  const cleanupResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    closeWebSocket();
    webSocketInitializedRef.current = false;
  }, []);

  return {
    klineData,
    isLoading,
    setIsLoading,
    setupWebSocket,
    fetchData,
    handleRefresh,
    cleanupResources,
    webSocketInitializedRef,
    reconnectTimeoutRef
  };
};

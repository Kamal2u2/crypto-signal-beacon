
import { useCallback } from 'react';
import { 
  initializeWebSocket,
  closeWebSocket,
} from '@/services/binanceService';
import { AssetPair, TimeInterval, KlineData } from '@/services/market/types';
import { toast } from '@/components/ui/use-toast';
import { handleKlineUpdate } from './utils/klineUpdateUtils';
import { handleReconnection } from './utils/reconnectionUtils';
import { fetchData as fetchKlineData } from './utils/dataFetchUtils';

interface WebSocketOperationsProps {
  selectedPair: AssetPair;
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

  // Handle kline updates by delegating to the utility function
  const handleKlineUpdateCallback = useCallback((newKline: KlineData) => {
    handleKlineUpdate(
      newKline, 
      klineDataRef, 
      setKlineData, 
      processNewSignal
    );
  }, [klineDataRef, setKlineData, processNewSignal]);

  // Setup WebSocket connection
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
      
      // Delegate to the fetchData utility function
      await fetchKlineData(
        selectedPair.symbol,
        selectedInterval,
        klineDataRef,
        setKlineData,
        processNewSignal,
        lastFetchTimeRef,
        fetchInProgressRef,
        setIsLoading,
        debugCounterRef
      );
      
      // Initialize WebSocket after data is fetched
      initializeWebSocket(
        selectedPair.symbol,
        selectedInterval,
        handleKlineUpdateCallback
      );
      
      webSocketInitializedRef.current = true;
      reconnectAttemptsRef.current = 0;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      
      // Delegate to reconnection utility
      handleReconnection(
        reconnectAttemptsRef,
        reconnectTimeoutRef,
        setupWebSocket,
        closeWebSocket,
        webSocketInitializedRef
      );
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [
    selectedPair.symbol,
    selectedInterval,
    handleKlineUpdateCallback,
    klineDataRef,
    setKlineData,
    processNewSignal,
    webSocketInitializedRef,
    reconnectAttemptsRef,
    reconnectTimeoutRef,
    previousPairRef,
    previousIntervalRef,
    fetchInProgressRef,
    lastFetchTimeRef,
    setIsLoading,
    debugCounterRef
  ]);

  // Fetch data directly using the utility function
  const fetchData = useCallback(async () => {
    await fetchKlineData(
      selectedPair.symbol,
      selectedInterval,
      klineDataRef,
      setKlineData,
      processNewSignal,
      lastFetchTimeRef,
      fetchInProgressRef,
      setIsLoading,
      debugCounterRef
    );
  }, [
    selectedPair.symbol,
    selectedInterval,
    klineDataRef,
    setKlineData,
    processNewSignal,
    fetchInProgressRef,
    lastFetchTimeRef,
    setIsLoading,
    debugCounterRef
  ]);

  // Handle manual refresh
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

  // Clean up resources
  const cleanupResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    closeWebSocket();
    webSocketInitializedRef.current = false;
  }, [reconnectTimeoutRef, webSocketInitializedRef]);

  return {
    handleKlineUpdate: handleKlineUpdateCallback,
    setupWebSocket,
    fetchData,
    handleRefresh,
    cleanupResources
  };
};

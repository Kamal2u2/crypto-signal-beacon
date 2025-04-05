
import { useCallback } from 'react';
import { closeWebSocket } from '@/services/binanceService';
import { AssetPair, TimeInterval, KlineData } from '@/services/market/types';
import { handleKlineUpdate } from './utils/klineUpdateUtils';
import { handleReconnection } from './utils/reconnectionUtils';
import { fetchData } from './utils/dataFetchUtils';
import { setupWebSocket as setupWebSocketUtil } from './utils/setupUtils';
import { handleRefresh as handleRefreshUtil, cleanupResources as cleanupResourcesUtil } from './utils/refreshUtils';

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

  // Setup WebSocket connection using the utility
  const setupWebSocket = useCallback(async () => {
    try {
      await setupWebSocketUtil({
        selectedPair,
        selectedInterval,
        processNewSignal,
        klineDataRef,
        setKlineData,
        webSocketInitializedRef,
        reconnectAttemptsRef,
        previousPairRef,
        previousIntervalRef,
        fetchInProgressRef,
        lastFetchTimeRef,
        setIsLoading,
        debugCounterRef,
        handleKlineUpdate: handleKlineUpdateCallback
      });
    } catch (error) {
      // Handle reconnection using the utility
      handleReconnection(
        reconnectAttemptsRef,
        reconnectTimeoutRef,
        setupWebSocket,
        closeWebSocket,
        webSocketInitializedRef
      );
    }
  }, [
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
    debugCounterRef,
    handleKlineUpdateCallback
  ]);

  // Fetch data directly using the utility function
  const fetchDataCallback = useCallback(async () => {
    await fetchData(
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

  // Handle manual refresh using the utility
  const handleRefresh = useCallback(() => {
    handleRefreshUtil({
      lastFetchTimeRef,
      fetchInProgressRef,
      closeWebSocket,
      webSocketInitializedRef,
      reconnectAttemptsRef,
      setIsLoading,
      setupWebSocket
    });
  }, [
    setupWebSocket,
    webSocketInitializedRef,
    reconnectAttemptsRef,
    fetchInProgressRef,
    lastFetchTimeRef,
    setIsLoading
  ]);

  // Clean up resources using the utility
  const cleanupResources = useCallback(() => {
    cleanupResourcesUtil({
      reconnectTimeoutRef,
      closeWebSocket,
      webSocketInitializedRef
    });
  }, [reconnectTimeoutRef, webSocketInitializedRef]);

  return {
    handleKlineUpdate: handleKlineUpdateCallback,
    setupWebSocket,
    fetchData: fetchDataCallback,
    handleRefresh,
    cleanupResources
  };
};

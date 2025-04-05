import { useCallback, useRef, useEffect } from 'react';
import { 
  AssetPair as CoinPair, 
  TimeInterval, 
  KlineData
} from '@/services/market/types';
import { useWebSocketState } from './useWebSocketState';
import { useWebSocketOperations } from './useWebSocketOperations';
import { useWebSocketHeartbeat } from './useWebSocketHeartbeat';

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
  // Get all state from the state hook
  const {
    klineData,
    setKlineData,
    isLoading,
    setIsLoading,
    webSocketInitializedRef,
    reconnectAttemptsRef,
    reconnectTimeoutRef,
    debugCounterRef,
    previousPairRef,
    previousIntervalRef,
    fetchInProgressRef,
    lastFetchTimeRef,
    klineDataRef,
    heartbeatIntervalRef
  } = useWebSocketState();
  
  // Keep reference to latest klineData
  useEffect(() => {
    klineDataRef.current = klineData;
  }, [klineData, klineDataRef]);

  // Keep a stable reference to the processNewSignal callback
  const processNewSignalRef = useRef(processNewSignal);
  useEffect(() => {
    processNewSignalRef.current = processNewSignal;
  }, [processNewSignal]);
  
  // Setup WebSocket operations
  const {
    setupWebSocket,
    fetchData,
    handleRefresh,
    cleanupResources
  } = useWebSocketOperations({
    selectedPair,
    selectedInterval,
    processNewSignal: (signals: any) => processNewSignalRef.current(signals),
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
  });
  
  // Setup heartbeat
  useWebSocketHeartbeat({
    heartbeatIntervalRef
  });

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

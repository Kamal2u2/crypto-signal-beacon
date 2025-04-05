
import { 
  initializeWebSocket,
  closeWebSocket,
} from '@/services/binanceService';
import { AssetPair, TimeInterval, KlineData } from '@/services/market/types';
import { fetchData } from './dataFetchUtils';

interface SetupWebSocketProps {
  selectedPair: AssetPair;
  selectedInterval: TimeInterval;
  processNewSignal: (signals: any) => void;
  klineDataRef: React.MutableRefObject<KlineData[]>;
  setKlineData: (data: KlineData[]) => void;
  webSocketInitializedRef: React.MutableRefObject<boolean>;
  reconnectAttemptsRef: React.MutableRefObject<number>;
  previousPairRef: React.MutableRefObject<string>;
  previousIntervalRef: React.MutableRefObject<string>;
  fetchInProgressRef: React.MutableRefObject<boolean>;
  lastFetchTimeRef: React.MutableRefObject<number>;
  setIsLoading: (isLoading: boolean) => void;
  debugCounterRef: React.MutableRefObject<number>;
  handleKlineUpdate: (kline: KlineData) => void;
}

export const setupWebSocket = async ({
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
  handleKlineUpdate
}: SetupWebSocketProps) => {
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
    
    // Fetch initial data
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
    
    // Initialize WebSocket after data is fetched
    initializeWebSocket(
      selectedPair.symbol,
      selectedInterval,
      handleKlineUpdate
    );
    
    webSocketInitializedRef.current = true;
    reconnectAttemptsRef.current = 0;
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
    throw error; // Rethrow to let the caller handle reconnection
  } finally {
    fetchInProgressRef.current = false;
  }
};

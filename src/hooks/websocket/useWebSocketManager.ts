
import { useState, useCallback, useRef } from 'react';
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
  const isInitialMount = useRef<boolean>(true);
  const fetchInProgressRef = useRef<boolean>(false);

  const handleKlineUpdate = useCallback((newKline: KlineData) => {
    setKlineData(prevData => {
      const updatedData = updateKlineData(newKline);
      
      // Generate new signals with the updated data
      const newSignals = generateSignals(updatedData);
      processNewSignal(newSignals);
      
      return updatedData;
    });
  }, [processNewSignal]);

  const setupWebSocket = useCallback(async () => {
    // Skip setup if there's already a fetch in progress to avoid simultaneous requests
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping WebSocket setup');
      return;
    }
    
    // Set the flag to true to prevent concurrent setups
    fetchInProgressRef.current = true;
    
    try {
      // Prevent duplicate setups for the same pair and interval
      if (webSocketInitializedRef.current && 
          previousPairRef.current === selectedPair.symbol && 
          previousIntervalRef.current === selectedInterval) {
        fetchInProgressRef.current = false;
        return;
      }
      
      console.log(`Setting up WebSocket for ${selectedPair.symbol} at ${selectedInterval} interval`);
      
      previousPairRef.current = selectedPair.symbol;
      previousIntervalRef.current = selectedInterval;
      
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval);
      if (data && data.length > 0) {
        setKlineData(data);
        
        const signals = generateSignals(data);
        processNewSignal(signals);
      }
      
      // Close any existing WebSocket before initializing a new one
      closeWebSocket();
      
      // Initialize WebSocket after getting initial data
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
      
      // Use exponential backoff for reconnections
      const backoffTime = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (reconnectAttemptsRef.current < 10) {
          closeWebSocket();
          setupWebSocket();
        }
      }, backoffTime);
    } finally {
      // Always reset the fetch in progress flag
      fetchInProgressRef.current = false;
    }
  }, [selectedPair.symbol, selectedInterval, handleKlineUpdate, processNewSignal]);

  const fetchData = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping duplicate fetch request');
      return;
    }
    
    fetchInProgressRef.current = true;
    setIsLoading(true);
    debugCounterRef.current += 1;
    const cycleNumber = debugCounterRef.current;
    
    try {
      console.log(`[Cycle ${cycleNumber}] Fetching data for ${selectedPair.symbol} at ${selectedInterval} interval`);
      
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval, 100);
      
      if (data.length > 0) {
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
    processNewSignal
  ]);

  const handleRefresh = useCallback(() => {
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping refresh request');
      return;
    }
    
    closeWebSocket();
    webSocketInitializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsLoading(true);
    
    // Add a small delay to prevent rapid consecutive refreshes
    setTimeout(() => {
      setupWebSocket().finally(() => {
        setIsLoading(false);
      });
    }, 300);
  }, [setupWebSocket]);

  // Clean up function for resources
  const cleanupResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    closeWebSocket();
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
    reconnectTimeoutRef,
    isInitialMount
  };
};

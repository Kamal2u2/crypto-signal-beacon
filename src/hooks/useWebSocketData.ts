
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { SignalSummary, generateSignals, SignalType } from '@/services/technicalAnalysisService';

interface UseWebSocketDataProps {
  selectedPair: CoinPair;
  selectedInterval: TimeInterval;
  confidenceThreshold: number;
  isAudioInitialized: boolean;
  alertsEnabled: boolean;
  alertVolume: number;
  notificationsEnabled: boolean;
  lastSignalType: SignalType | null;
  setLastSignalType: (type: string | null) => void;
  playSignalSound: (type: 'BUY' | 'SELL', volume: number) => void;
  sendSignalNotification: (type: string, symbol: string, confidence: number) => void;
}

export const useWebSocketData = ({
  selectedPair,
  selectedInterval,
  confidenceThreshold,
  isAudioInitialized,
  alertsEnabled,
  alertVolume,
  notificationsEnabled,
  lastSignalType,
  setLastSignalType,
  playSignalSound,
  sendSignalNotification
}: UseWebSocketDataProps) => {
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const webSocketInitializedRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debugCounterRef = useRef<number>(0);

  // Memoize the signal processing to prevent unnecessary rerenders
  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    setSignalData(newSignals);
    
    // Check for new valid signals
    const isSignalValid = newSignals.overallSignal !== 'NEUTRAL' && 
                         newSignals.overallSignal !== 'HOLD' && 
                         newSignals.confidence >= confidenceThreshold;
    
    if (isAudioInitialized && alertsEnabled && isSignalValid && newSignals.overallSignal !== lastSignalType) {
      if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
        playSignalSound(newSignals.overallSignal, alertVolume);
        
        if (notificationsEnabled) {
          sendSignalNotification(
            newSignals.overallSignal, 
            selectedPair.label, 
            newSignals.confidence
          );
        }
        
        toast({
          title: `${newSignals.overallSignal} Signal Detected`,
          description: `${selectedPair.label} - Confidence: ${newSignals.confidence.toFixed(0)}%`,
          variant: newSignals.overallSignal === 'BUY' ? 'default' : 'destructive',
        });
        
        setLastSignalType(newSignals.overallSignal);
      }
    }
  }, [
    selectedPair.label,
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType,
    setLastSignalType,
    playSignalSound,
    sendSignalNotification
  ]);

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
    try {
      const data = await fetchKlineData(selectedPair.symbol, selectedInterval);
      if (data && data.length > 0) {
        setKlineData(data);
        
        const signals = generateSignals(data);
        processNewSignal(signals);
      }
      
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
    }
  }, [selectedPair.symbol, selectedInterval, handleKlineUpdate, processNewSignal]);

  const fetchData = useCallback(async () => {
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
        
        console.log(`[Cycle ${cycleNumber}] Signal: ${signals.overallSignal}, Confidence: ${signals.confidence.toFixed(0)}%, Threshold: ${confidenceThreshold}%`);
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
    }
  }, [
    selectedPair,
    selectedInterval,
    confidenceThreshold,
    processNewSignal
  ]);

  // Reset WebSocket connection when pair or interval changes
  useEffect(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (webSocketInitializedRef.current) {
      closeWebSocket();
    }
    
    webSocketInitializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    // Add a small delay to avoid rapid reconnections when multiple properties change at once
    setIsLoading(true);
    const initTimeout = setTimeout(() => {
      setupWebSocket().finally(() => setIsLoading(false));
    }, 300);
    
    return () => {
      clearTimeout(initTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      closeWebSocket();
    };
  }, [selectedPair.symbol, selectedInterval, setupWebSocket]);

  const handleRefresh = useCallback(() => {
    closeWebSocket();
    webSocketInitializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsLoading(true);
    
    setTimeout(() => {
      setupWebSocket().finally(() => setIsLoading(false));
    }, 300);
  }, [setupWebSocket]);

  return {
    klineData,
    signalData,
    isLoading,
    fetchData,
    handleRefresh
  };
};

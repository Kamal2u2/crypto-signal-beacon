
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
  
  const debugCounterRef = useRef<number>(0);

  const handleKlineUpdate = useCallback((newKline: KlineData) => {
    setKlineData(prevData => {
      const updatedData = updateKlineData(newKline);
      
      // Generate new signals with the updated data
      const newSignals = generateSignals(updatedData);
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
      
      return updatedData;
    });
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
        setSignalData(signals);
        
        const isSignalValid = signals.overallSignal !== 'NEUTRAL' && 
                             signals.overallSignal !== 'HOLD' && 
                             signals.confidence >= confidenceThreshold;
        
        if (isAudioInitialized && alertsEnabled && isSignalValid && signals.overallSignal !== lastSignalType) {
          if (signals.overallSignal === 'BUY' || signals.overallSignal === 'SELL') {
            playSignalSound(signals.overallSignal, alertVolume);
            
            if (notificationsEnabled) {
              sendSignalNotification(
                signals.overallSignal, 
                selectedPair.label, 
                signals.confidence
              );
            }
            
            toast({
              title: `${signals.overallSignal} Signal Detected`,
              description: `${selectedPair.label} - Confidence: ${signals.confidence.toFixed(0)}%`,
              variant: signals.overallSignal === 'BUY' ? 'default' : 'destructive',
            });
          }
          setLastSignalType(signals.overallSignal);
        }
        
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
    isAudioInitialized,
    lastSignalType,
    alertsEnabled,
    alertVolume,
    confidenceThreshold,
    notificationsEnabled,
    playSignalSound,
    sendSignalNotification,
    setLastSignalType
  ]);

  useEffect(() => {
    const setupKlineWebSocket = async () => {
      try {
        const data = await fetchKlineData(selectedPair.symbol, selectedInterval);
        setKlineData(data);
        
        const signals = generateSignals(data);
        setSignalData(signals);
        
        // Initialize WebSocket after getting initial data
        initializeWebSocket(
          selectedPair.symbol,
          selectedInterval,
          handleKlineUpdate
        );
      } catch (error) {
        console.error('Error initializing kline data:', error);
        toast({
          title: "Connection Error",
          description: "Failed to load chart data. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    setupKlineWebSocket();
    
    // Cleanup WebSocket on unmount or when pair/interval changes
    return () => {
      closeWebSocket();
    };
  }, [selectedPair.symbol, selectedInterval, handleKlineUpdate]);

  const handleRefresh = () => {
    closeWebSocket();
    initializeWebSocket(selectedPair.symbol, selectedInterval, handleKlineUpdate);
  };

  return {
    klineData,
    signalData,
    isLoading,
    fetchData,
    handleRefresh
  };
};

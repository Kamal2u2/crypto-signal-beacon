
import { useState, useEffect, useRef } from 'react';
import { 
  AssetPair as CoinPair, 
  TimeInterval,
  closeWebSocket 
} from '@/services/binanceService';
import { SignalSummary, SignalType } from '@/services/technicalAnalysisService';
import { useSignalProcessor } from './websocket/useSignalProcessor';
import { useWebSocketManager } from './websocket/useWebSocketManager';

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
  // Track previous values to prevent unnecessary resets
  const prevPairRef = useRef<string>(selectedPair.symbol);
  const prevIntervalRef = useRef<string>(selectedInterval);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);
  
  // Use the signal processor hook
  const {
    signalData,
    processNewSignal
  } = useSignalProcessor({
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType,
    setLastSignalType,
    playSignalSound,
    sendSignalNotification,
    selectedPairLabel: selectedPair.label
  });

  // Use the WebSocket manager hook with stable reference to processNewSignal
  const processSignalRef = useRef(processNewSignal);
  
  // Update the ref when processNewSignal changes
  useEffect(() => {
    processSignalRef.current = processNewSignal;
  }, [processNewSignal]);

  // Use the WebSocket manager hook with the stable reference
  const {
    klineData,
    isLoading,
    setIsLoading,
    setupWebSocket,
    fetchData,
    handleRefresh,
    cleanupResources,
    webSocketInitializedRef,
    reconnectTimeoutRef
  } = useWebSocketManager({
    selectedPair,
    selectedInterval,
    processNewSignal: (signals: any) => processSignalRef.current(signals)
  });

  // Handle WebSocket connection and reconnection
  useEffect(() => {
    // Skip the first mount effect to avoid double initialization
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      
      // Initial setup
      if (!webSocketInitializedRef.current && !isProcessingRef.current) {
        isProcessingRef.current = true;
        
        if (setIsLoading) {
          setIsLoading(true);
        }
        
        setupWebSocket()
          .catch(err => console.error("WebSocket setup failed:", err))
          .finally(() => {
            if (setIsLoading) {
              setIsLoading(false);
            }
            isProcessingRef.current = false;
          });
      }
      return;
    }
    
    // Only trigger WebSocket reset if the pair or interval has actually changed
    const pairChanged = prevPairRef.current !== selectedPair.symbol;
    const intervalChanged = prevIntervalRef.current !== selectedInterval;
    
    if (pairChanged || intervalChanged) {
      console.log(`Config changed: Pair ${pairChanged ? 'changed' : 'unchanged'}, Interval ${intervalChanged ? 'changed' : 'unchanged'}`);
      
      // Update refs with new values
      prevPairRef.current = selectedPair.symbol;
      prevIntervalRef.current = selectedInterval;
      
      // Clear any scheduled reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close existing connection if active
      if (webSocketInitializedRef.current) {
        closeWebSocket();
        webSocketInitializedRef.current = false;
      }
      
      // Clear any previous setup timeout
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      
      // Prevent multiple processing simultaneously
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        
        // Set loading state
        if (setIsLoading) {
          setIsLoading(true);
        }
        
        // Delay reconnection to prevent rapid switching
        setupTimeoutRef.current = setTimeout(() => {
          setupWebSocket()
            .catch(err => console.error("WebSocket setup failed after config change:", err))
            .finally(() => {
              if (setIsLoading) {
                setIsLoading(false);
              }
              isProcessingRef.current = false;
              setupTimeoutRef.current = null;
            });
        }, 500); // Increased delay to reduce flickering
      }
    }
    
  }, [selectedPair.symbol, selectedInterval, setupWebSocket, setIsLoading]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      
      // Clean up WebSocket resources
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    klineData,
    signalData,
    isLoading,
    fetchData,
    handleRefresh
  };
};

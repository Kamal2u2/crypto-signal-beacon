
import { useState, useEffect, useRef } from 'react';
import { 
  CoinPair, 
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

  // Use the WebSocket manager hook
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
    processNewSignal
  });

  // Reset WebSocket connection only when pair or interval actually changes
  useEffect(() => {
    // Only trigger WebSocket reset if the pair or interval has actually changed
    if (prevPairRef.current !== selectedPair.symbol || prevIntervalRef.current !== selectedInterval) {
      // Update refs with new values
      prevPairRef.current = selectedPair.symbol;
      prevIntervalRef.current = selectedInterval;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (webSocketInitializedRef.current) {
        closeWebSocket();
        webSocketInitializedRef.current = false;
      }
      
      // Add a small delay to avoid rapid reconnections when multiple properties change at once
      setIsLoading(true);
      const initTimeout = setTimeout(() => {
        setupWebSocket().finally(() => {
          if (setIsLoading) {
            setIsLoading(false);
          }
        });
      }, 300);
      
      return () => {
        clearTimeout(initTimeout);
      };
    }
    
    // Initial setup if not yet initialized
    if (!webSocketInitializedRef.current) {
      setIsLoading(true);
      setupWebSocket().finally(() => {
        if (setIsLoading) {
          setIsLoading(false);
        }
      });
    }
    
    return () => {
      // No need to clean up on every render
    };
  }, [selectedPair.symbol, selectedInterval, setupWebSocket, setIsLoading]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
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

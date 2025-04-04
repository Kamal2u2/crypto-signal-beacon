
import { useState, useEffect } from 'react';
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
    setIsLoading, // Added this to fix the undefined setIsLoading error
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

  // Reset WebSocket connection when pair or interval changes
  useEffect(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (webSocketInitializedRef.current) {
      closeWebSocket();
    }
    
    webSocketInitializedRef.current = false;
    
    // Add a small delay to avoid rapid reconnections when multiple properties change at once
    setIsLoading(true); // Using the setIsLoading from useWebSocketManager
    const initTimeout = setTimeout(() => {
      setupWebSocket().finally(() => setIsLoading(false));
    }, 300);
    
    return () => {
      clearTimeout(initTimeout);
      cleanupResources();
    };
  }, [selectedPair.symbol, selectedInterval, setupWebSocket, cleanupResources, setIsLoading]);

  return {
    klineData,
    signalData,
    isLoading,
    fetchData,
    handleRefresh
  };
};

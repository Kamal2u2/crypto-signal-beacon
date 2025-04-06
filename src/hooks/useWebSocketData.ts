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
  const prevPairRef = useRef<string>(selectedPair.symbol);
  const prevIntervalRef = useRef<string>(selectedInterval);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false);
  
  const {
    signalData,
    processNewSignal,
    signalHistory
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

  const processSignalRef = useRef(processNewSignal);
  
  useEffect(() => {
    processSignalRef.current = processNewSignal;
  }, [processNewSignal]);

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

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      
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
    
    const pairChanged = prevPairRef.current !== selectedPair.symbol;
    const intervalChanged = prevIntervalRef.current !== selectedInterval;
    
    if (pairChanged || intervalChanged) {
      console.log(`Config changed: Pair ${pairChanged ? 'changed' : 'unchanged'}, Interval ${intervalChanged ? 'changed' : 'unchanged'}`);
      
      prevPairRef.current = selectedPair.symbol;
      prevIntervalRef.current = selectedInterval;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (webSocketInitializedRef.current) {
        closeWebSocket();
        webSocketInitializedRef.current = false;
      }
      
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        
        if (setIsLoading) {
          setIsLoading(true);
        }
        
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
        }, 500);
      }
    }
  }, [selectedPair.symbol, selectedInterval, setupWebSocket, setIsLoading]);

  useEffect(() => {
    return () => {
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    klineData,
    signalData,
    signalHistory,
    isLoading,
    fetchData,
    handleRefresh
  };
};


import { useState, useRef } from 'react';
import { KlineData } from '@/services/market/types';

export const useWebSocketState = () => {
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // References for internal state tracking
  const webSocketInitializedRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debugCounterRef = useRef<number>(0);
  const previousPairRef = useRef<string>('');
  const previousIntervalRef = useRef<string>('');
  const fetchInProgressRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const klineDataRef = useRef<KlineData[]>([]);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  return {
    // State
    klineData,
    setKlineData,
    isLoading,
    setIsLoading,
    
    // Refs
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
  };
};

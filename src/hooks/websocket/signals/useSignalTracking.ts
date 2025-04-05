import { useRef, useCallback } from 'react';
import { SignalType } from '@/services/technical/types';

interface SignalTrackingProps {
  lastSignalType: SignalType | null;
  setLastSignalType: (type: SignalType | null) => void;
  confidenceThreshold: number;
}

export const useSignalTracking = ({
  lastSignalType,
  setLastSignalType,
  confidenceThreshold
}: SignalTrackingProps) => {
  const lastProcessedSignalRef = useRef<string | null>(null);
  
  // Keep track of props to avoid closure issues
  const propsRef = useRef({
    lastSignalType,
    confidenceThreshold
  });

  // Update props ref when they change
  useCallback(() => {
    propsRef.current = {
      lastSignalType,
      confidenceThreshold
    };
  }, [lastSignalType, confidenceThreshold]);
  
  const shouldProcessSignal = useCallback((
    signalType: SignalType,
    confidence: number,
    signalFingerprint: string
  ): boolean => {
    // Skip if signal has already been processed
    if (lastProcessedSignalRef.current === signalFingerprint) {
      return false;
    }
    
    // Skip if signal doesn't meet confidence threshold
    if (confidence < propsRef.current.confidenceThreshold) {
      return false;
    }
    
    // Skip if this isn't a valid actionable signal
    if (signalType !== 'BUY' && signalType !== 'SELL') {
      return false;
    }
    
    // Skip if this signal is the same as the last one
    if (signalType === propsRef.current.lastSignalType) {
      return false;
    }
    
    return true;
  }, []);
  
  const trackSignal = useCallback((signalType: SignalType, signalFingerprint: string) => {
    lastProcessedSignalRef.current = signalFingerprint;
    setLastSignalType(signalType);
  }, [setLastSignalType]);
  
  return {
    shouldProcessSignal,
    trackSignal,
    lastProcessedSignalRef
  };
};

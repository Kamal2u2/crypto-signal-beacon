
import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { SignalSummary, SignalType } from '@/services/technicalAnalysisService';

interface SignalProcessorProps {
  confidenceThreshold: number;
  isAudioInitialized: boolean;
  alertsEnabled: boolean;
  alertVolume: number;
  notificationsEnabled: boolean;
  lastSignalType: SignalType | null;
  setLastSignalType: (type: string | null) => void;
  playSignalSound: (type: 'BUY' | 'SELL', volume: number) => void;
  sendSignalNotification: (type: string, symbol: string, confidence: number) => void;
  selectedPairLabel: string;
}

export const useSignalProcessor = ({
  confidenceThreshold,
  isAudioInitialized,
  alertsEnabled,
  alertVolume,
  notificationsEnabled,
  lastSignalType,
  setLastSignalType,
  playSignalSound,
  sendSignalNotification,
  selectedPairLabel
}: SignalProcessorProps) => {
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const lastProcessedSignalRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef<number>(0);
  const MIN_TOAST_INTERVAL = 5000; // Minimum 5 seconds between toasts
  
  // Memoize the signal processing to prevent unnecessary rerenders
  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    // Create a stringified version of the signal to compare with previous
    const signalFingerprint = `${newSignals.overallSignal}-${newSignals.confidence}`;
    
    // Only update state if signal has changed
    if (lastProcessedSignalRef.current !== signalFingerprint) {
      lastProcessedSignalRef.current = signalFingerprint;
      
      // Use functional update to prevent closure issues
      setSignalData(prevSignalData => {
        // Skip update if the data is identical
        if (prevSignalData && 
            prevSignalData.overallSignal === newSignals.overallSignal && 
            prevSignalData.confidence === newSignals.confidence) {
          return prevSignalData;
        }
        return newSignals;
      });
      
      // Check for new valid signals
      const isSignalValid = newSignals.overallSignal !== 'NEUTRAL' && 
                          newSignals.overallSignal !== 'HOLD' && 
                          newSignals.confidence >= confidenceThreshold;
      
      const shouldPlaySound = isAudioInitialized && 
                             alertsEnabled && 
                             isSignalValid && 
                             newSignals.overallSignal !== lastSignalType;
      
      if (shouldPlaySound) {
        if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
          playSignalSound(newSignals.overallSignal, alertVolume);
          
          if (notificationsEnabled) {
            sendSignalNotification(
              newSignals.overallSignal, 
              selectedPairLabel, 
              newSignals.confidence
            );
          }
          
          // Limit toast frequency
          const now = Date.now();
          if (now - lastToastTimeRef.current > MIN_TOAST_INTERVAL) {
            toast({
              title: `${newSignals.overallSignal} Signal Detected`,
              description: `${selectedPairLabel} - Confidence: ${newSignals.confidence.toFixed(0)}%`,
              variant: newSignals.overallSignal === 'BUY' ? 'default' : 'destructive',
            });
            lastToastTimeRef.current = now;
          }
          
          setLastSignalType(newSignals.overallSignal);
        }
      }
    }
  }, [
    selectedPairLabel,
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

  return {
    signalData,
    setSignalData,
    processNewSignal
  };
};

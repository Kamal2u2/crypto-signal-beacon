import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Keep track of props to avoid closure issues
  const propsRef = useRef({
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType,
    selectedPairLabel
  });

  // Update props ref when they change
  useEffect(() => {
    propsRef.current = {
      confidenceThreshold,
      isAudioInitialized,
      alertsEnabled,
      alertVolume,
      notificationsEnabled,
      lastSignalType,
      selectedPairLabel
    };
  }, [
    confidenceThreshold,
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    lastSignalType,
    selectedPairLabel
  ]);
  
  // Memoize the signal processing to prevent unnecessary rerenders
  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    // Don't process if signal is empty or invalid
    if (!newSignals || !newSignals.overallSignal) return;
    
    // Create a stringified version of the signal to compare with previous
    const signalFingerprint = `${newSignals.overallSignal}-${newSignals.confidence}`;
    
    // Skip processing if signal hasn't changed
    if (lastProcessedSignalRef.current === signalFingerprint) return;
    
    // Update the last processed signal
    lastProcessedSignalRef.current = signalFingerprint;
    
    // Update the signal data state
    setSignalData(prevSignalData => {
      // Skip update if the data is identical
      if (prevSignalData && 
          prevSignalData.overallSignal === newSignals.overallSignal && 
          prevSignalData.confidence === newSignals.confidence) {
        return prevSignalData;
      }
      return newSignals;
    });
    
    // Get current props from ref to avoid closure issues
    const {
      confidenceThreshold,
      isAudioInitialized,
      alertsEnabled,
      notificationsEnabled,
      lastSignalType,
      alertVolume,
      selectedPairLabel
    } = propsRef.current;
    
    // Check if this is a valid actionable signal
    const isSignalValid = newSignals.overallSignal !== 'NEUTRAL' && 
                          newSignals.overallSignal !== 'HOLD' && 
                          newSignals.confidence >= confidenceThreshold;
    
    // Check if we should play a sound
    const shouldPlaySound = isAudioInitialized && 
                           alertsEnabled && 
                           isSignalValid && 
                           newSignals.overallSignal !== lastSignalType;
    
    if (shouldPlaySound) {
      if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
        // Play the signal sound
        playSignalSound(newSignals.overallSignal, alertVolume);
        
        // Show notifications if enabled
        if (notificationsEnabled) {
          sendSignalNotification(
            newSignals.overallSignal, 
            selectedPairLabel, 
            newSignals.confidence
          );
        }
        
        // Show toast notification (with rate limiting)
        const now = Date.now();
        if (now - lastToastTimeRef.current > MIN_TOAST_INTERVAL) {
          toast({
            title: `${newSignals.overallSignal} Signal Detected`,
            description: `${selectedPairLabel} - Confidence: ${newSignals.confidence.toFixed(0)}%`,
            variant: newSignals.overallSignal === 'BUY' ? 'default' : 'destructive',
          });
          lastToastTimeRef.current = now;
        }
        
        // Update the last signal type
        setLastSignalType(newSignals.overallSignal);
      }
    }
  }, [
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

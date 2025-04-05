
import { useState, useCallback } from 'react';
import { SignalSummary, SignalType } from '@/services/technical/types';
import { useSignalNotifications } from './notifications/useSignalNotifications';
import { useSignalTracking } from './signals/useSignalTracking';

interface SignalProcessorProps {
  confidenceThreshold: number;
  isAudioInitialized: boolean;
  alertsEnabled: boolean;
  alertVolume: number;
  notificationsEnabled: boolean;
  lastSignalType: SignalType | null;
  setLastSignalType: (type: SignalType | null) => void;
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
  
  // Initialize signal tracking
  const {
    shouldProcessSignal,
    trackSignal,
    lastProcessedSignalRef
  } = useSignalTracking({
    lastSignalType,
    setLastSignalType,
    confidenceThreshold
  });
  
  // Initialize notifications
  const { showNotifications } = useSignalNotifications({
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    playSignalSound,
    sendSignalNotification,
    selectedPairLabel,
    confidenceThreshold // Pass the threshold to the notifications hook
  });
  
  // Memoize the signal processing to prevent unnecessary rerenders
  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    // Don't process if signal is empty or invalid
    if (!newSignals || !newSignals.overallSignal) return;
    
    // Create a stringified version of the signal to compare with previous
    const signalFingerprint = `${newSignals.overallSignal}-${newSignals.confidence}`;
    
    // Update the signal data state regardless of other conditions
    setSignalData(prevSignalData => {
      // Skip update if the data is identical
      if (prevSignalData && 
          prevSignalData.overallSignal === newSignals.overallSignal && 
          prevSignalData.confidence === newSignals.confidence) {
        return prevSignalData;
      }
      return newSignals;
    });
    
    // Only process actionable signals above threshold
    if (newSignals.confidence >= confidenceThreshold) {
      // Check if this is a valid actionable signal
      const isSignalValid = shouldProcessSignal(
        newSignals.overallSignal,
        newSignals.confidence,
        signalFingerprint
      );
      
      if (isSignalValid) {
        // Show notifications only for signals above threshold
        showNotifications(newSignals.overallSignal, newSignals.confidence);
        
        // Track this signal
        trackSignal(newSignals.overallSignal, signalFingerprint);
      }
    } else {
      console.log(`Signal ${newSignals.overallSignal} skipped: below threshold (${newSignals.confidence.toFixed(0)}% < ${confidenceThreshold}%)`);
    }
  }, [confidenceThreshold, shouldProcessSignal, showNotifications, trackSignal]);

  return {
    signalData,
    setSignalData,
    processNewSignal
  };
};

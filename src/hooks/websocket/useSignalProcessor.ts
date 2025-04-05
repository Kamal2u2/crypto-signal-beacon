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
  const [recentSignals, setRecentSignals] = useState<{[key: string]: number}>({});
  const [signalHistory, setSignalHistory] = useState<Array<{type: SignalType, time: number, confidence: number}>>([]);
  
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
    confidenceThreshold
  });

  // Check for signal consistency over time
  const isSignalConsistent = (signalType: SignalType, confidence: number): boolean => {
    if (signalHistory.length < 3) return true; // Not enough history to determine consistency
    
    // Check last 3 signals within 60 seconds
    const recentHistory = signalHistory
      .filter(entry => Date.now() - entry.time < 60000)
      .slice(-3);
      
    // If we don't have enough recent history, consider consistent
    if (recentHistory.length < 3) return true;
    
    // For weak signals (lower confidence), require more consistency
    if (confidence < 75) {
      // Must have at least 2 signals of same type in recent history
      const sameTypeCount = recentHistory.filter(s => s.type === signalType).length;
      return sameTypeCount >= 2;
    }
    
    // For stronger signals, be a bit more permissive
    return true;
  };
  
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
    
    // Add signal to history for consistency checking
    setSignalHistory(prev => {
      const updatedHistory = [
        ...prev,
        {
          type: newSignals.overallSignal,
          time: Date.now(),
          confidence: newSignals.confidence
        }
      ];
      
      // Keep only last 10 signals
      return updatedHistory.slice(-10);
    });
    
    // Only process actionable signals above threshold
    if (newSignals.confidence >= confidenceThreshold) {
      // Track the frequency of this signal type
      setRecentSignals(prev => {
        const now = Date.now();
        const timeWindow = 300000; // 5 minutes
        
        // Clean up old signals
        const updatedSignals = {...prev};
        Object.keys(updatedSignals).forEach(key => {
          if (now - updatedSignals[key] > timeWindow) {
            delete updatedSignals[key];
          }
        });
        
        // Add new signal
        if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
          updatedSignals[newSignals.overallSignal] = now;
        }
        
        return updatedSignals;
      });
      
      // Check if signal is consistent over time
      const isConsistent = isSignalConsistent(newSignals.overallSignal, newSignals.confidence);
      
      // Check if this is a valid actionable signal
      const isSignalValid = shouldProcessSignal(
        newSignals.overallSignal,
        newSignals.confidence,
        signalFingerprint
      );
      
      // Only process if signal is valid, consistent, and not conflicting with recent signals
      if (isSignalValid && isConsistent) {
        // Don't send conflicting signals in short timeframe
        const oppositeSignalRecently = 
          (newSignals.overallSignal === 'BUY' && recentSignals['SELL'] && 
           Date.now() - recentSignals['SELL'] < 600000) || // 10 minutes
          (newSignals.overallSignal === 'SELL' && recentSignals['BUY'] && 
           Date.now() - recentSignals['BUY'] < 600000);
           
        if (!oppositeSignalRecently) {
          // Show notifications only for signals above threshold
          showNotifications(newSignals.overallSignal, newSignals.confidence);
          
          // Track this signal
          trackSignal(newSignals.overallSignal, signalFingerprint);
        } else {
          console.log(`Signal ${newSignals.overallSignal} skipped: conflicting with recent opposite signal`);
        }
      } else if (!isConsistent) {
        console.log(`Signal ${newSignals.overallSignal} skipped: inconsistent with recent signal history`);
      }
    } else {
      console.log(`Signal ${newSignals.overallSignal} skipped: below threshold (${newSignals.confidence.toFixed(0)}% < ${confidenceThreshold}%)`);
    }
  }, [
    confidenceThreshold, 
    shouldProcessSignal, 
    showNotifications, 
    trackSignal, 
    recentSignals
  ]);

  return {
    signalData,
    setSignalData,
    processNewSignal,
    signalHistory
  };
};

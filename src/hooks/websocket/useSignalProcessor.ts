
import { useState, useCallback, useRef } from 'react';
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
  
  const signalStateRef = useRef<{
    lastActionableSignal: SignalType | null;
    lastActionableTime: number;
    holdCount: number;
    signalLockPeriod: number;
    confidenceHistory: number[];
  }>({
    lastActionableSignal: null,
    lastActionableTime: 0,
    holdCount: 0,
    // Further reduce lock period to 30 seconds
    signalLockPeriod: 30000,
    confidenceHistory: []
  });
  
  const {
    shouldProcessSignal,
    trackSignal,
    lastProcessedSignalRef
  } = useSignalTracking({
    lastSignalType,
    setLastSignalType,
    confidenceThreshold
  });
  
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

  // Made even less strict - only require one consistent signal
  const isSignalConsistent = (signalType: SignalType, confidence: number): boolean => {
    // For high confidence signals, don't require consistency checking
    if (confidence >= 60) return true;
    
    if (signalHistory.length < 2) return false;
    
    if (signalType === 'BUY' || signalType === 'SELL') {
      const recentHistory = signalHistory
        .filter(entry => Date.now() - entry.time < 60000)  // 1 minute
        .slice(-3);
      
      // Only require 1 same type signal instead of 2
      const sameTypeCount = recentHistory.filter(s => s.type === signalType).length;
      // Allow 1 opposite signal
      const oppositeSignals = recentHistory.filter(s => 
        (signalType === 'BUY' && s.type === 'SELL') || 
        (signalType === 'SELL' && s.type === 'BUY')
      ).length;
      
      return sameTypeCount >= 1 && oppositeSignals <= 1;
    }
    
    return true;
  };

  // Much less strict override function to allow almost all BUY/SELL signals
  const shouldOverrideToHold = (newSignal: SignalType, confidence: number): boolean => {
    const now = Date.now();
    const state = signalStateRef.current;
    
    // Skip override completely for higher confidence signals (45% or higher)
    if ((newSignal === 'BUY' || newSignal === 'SELL') && confidence >= 45) {
      return false;
    }
    
    // Only maintain a very minimal lock period of 20 seconds for opposite signals
    if (state.lastActionableSignal && 
       ((state.lastActionableSignal === 'BUY' && newSignal === 'SELL') || 
        (state.lastActionableSignal === 'SELL' && newSignal === 'BUY')) && 
        now - state.lastActionableTime < 20000) {
      return true;
    }
    
    // Still override very low confidence signals
    if ((newSignal === 'BUY' || newSignal === 'SELL') && confidence < 35) {
      return true;
    }
    
    return false;
  };

  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    if (!newSignals || !newSignals.overallSignal) return;
    
    const signalFingerprint = `${newSignals.overallSignal}-${newSignals.confidence}`;
    
    const originalSignal = newSignals.overallSignal;
    const originalConfidence = newSignals.confidence;
    
    signalStateRef.current.confidenceHistory.push(originalConfidence);
    if (signalStateRef.current.confidenceHistory.length > 10) {
      signalStateRef.current.confidenceHistory.shift();
    }
    
    let modifiedSignals = {...newSignals};
    
    if (originalSignal === 'BUY' || originalSignal === 'SELL') {
      // For signals with medium-high confidence, skip consistency check
      const highConfidence = originalConfidence >= 45;
      const isConsistent = highConfidence || isSignalConsistent(originalSignal, originalConfidence);
      
      if (!isConsistent || shouldOverrideToHold(originalSignal, originalConfidence)) {
        signalStateRef.current.holdCount++;
        
        modifiedSignals = {
          ...newSignals,
          overallSignal: 'HOLD',
          confidence: Math.min(70, originalConfidence)
        };
        
        console.log(`Signal ${originalSignal} overridden to HOLD due to consistency requirements`);
      } else {
        signalStateRef.current.holdCount = 0;
        signalStateRef.current.lastActionableSignal = originalSignal;
        signalStateRef.current.lastActionableTime = Date.now();
      }
    } else if (originalSignal === 'NEUTRAL') {
      modifiedSignals = {
        ...newSignals,
        overallSignal: 'HOLD',
        confidence: originalConfidence
      };
    } else if (originalSignal === 'HOLD') {
      signalStateRef.current.holdCount++;
    }
    
    setSignalData(prevSignalData => {
      if (prevSignalData && 
          prevSignalData.overallSignal === modifiedSignals.overallSignal && 
          prevSignalData.confidence === modifiedSignals.confidence) {
        return prevSignalData;
      }
      return modifiedSignals;
    });
    
    setSignalHistory(prev => {
      const updatedHistory = [
        ...prev,
        {
          type: modifiedSignals.overallSignal,
          time: Date.now(),
          confidence: modifiedSignals.confidence
        }
      ];
      
      return updatedHistory.slice(-15);
    });
    
    // Use an even lower threshold to allow more signals to pass through
    // Reduced threshold by 20% with minimum of 40%
    const effectiveThreshold = Math.max(confidenceThreshold * 0.8, 40);
    
    if (modifiedSignals.overallSignal !== 'HOLD' && 
        modifiedSignals.overallSignal !== 'NEUTRAL' &&
        modifiedSignals.confidence >= effectiveThreshold) {
      
      setRecentSignals(prev => {
        const now = Date.now();
        // Shorter time window of 5 minutes
        const timeWindow = 300000;
        
        const updatedSignals = {...prev};
        Object.keys(updatedSignals).forEach(key => {
          if (now - updatedSignals[key] > timeWindow) {
            delete updatedSignals[key];
          }
        });
        
        if (modifiedSignals.overallSignal === 'BUY' || modifiedSignals.overallSignal === 'SELL') {
          updatedSignals[modifiedSignals.overallSignal] = now;
        }
        
        return updatedSignals;
      });
      
      const isSignalValid = shouldProcessSignal(
        modifiedSignals.overallSignal,
        modifiedSignals.confidence,
        signalFingerprint
      );
      
      // Reduced time window to only 3 minutes (180000ms) for opposite signals
      const oppositeSignalRecently = 
        (modifiedSignals.overallSignal === 'BUY' && recentSignals['SELL'] && 
         Date.now() - recentSignals['SELL'] < 180000) ||
        (modifiedSignals.overallSignal === 'SELL' && recentSignals['BUY'] && 
         Date.now() - recentSignals['BUY'] < 180000);
      
      // For high confidence signals (>65%), ignore the opposite signal check
      const isHighConfidence = modifiedSignals.confidence > 65;
      
      if ((isSignalValid && !oppositeSignalRecently) || isHighConfidence) {
        showNotifications(modifiedSignals.overallSignal, modifiedSignals.confidence);
        trackSignal(modifiedSignals.overallSignal, signalFingerprint);
      } else if (oppositeSignalRecently && !isHighConfidence) {
        console.log(`Signal ${modifiedSignals.overallSignal} skipped: conflicting with recent opposite signal`);
      }
    } else {
      console.log(`Signal ${modifiedSignals.overallSignal} not processed as actionable signal: ${modifiedSignals.confidence.toFixed(0)}% vs threshold ${effectiveThreshold}%)`);
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

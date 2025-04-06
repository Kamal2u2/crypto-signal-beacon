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
    signalLockPeriod: 180000,
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

  const isSignalConsistent = (signalType: SignalType, confidence: number): boolean => {
    if (signalHistory.length < 4) return false;
    
    if (signalType === 'BUY' || signalType === 'SELL') {
      const recentHistory = signalHistory
        .filter(entry => Date.now() - entry.time < 120000)
        .slice(-5);
      
      const sameTypeCount = recentHistory.filter(s => s.type === signalType).length;
      const oppositeSignals = recentHistory.filter(s => 
        (signalType === 'BUY' && s.type === 'SELL') || 
        (signalType === 'SELL' && s.type === 'BUY')
      ).length;
      
      return sameTypeCount >= 3 && oppositeSignals === 0;
    }
    
    return true;
  };

  const shouldOverrideToHold = (newSignal: SignalType, confidence: number): boolean => {
    const now = Date.now();
    const state = signalStateRef.current;
    
    const avgConfidence = state.confidenceHistory.length > 0 ? 
      state.confidenceHistory.reduce((a, b) => a + b, 0) / state.confidenceHistory.length : 0;
    
    if (state.lastActionableSignal && 
        state.lastActionableSignal !== newSignal &&
        now - state.lastActionableTime < state.signalLockPeriod) {
      return true;
    }
    
    if ((newSignal === 'BUY' || newSignal === 'SELL') && 
        confidence < avgConfidence * 0.95) {
      return true;
    }
    
    if (state.lastActionableSignal && 
       ((state.lastActionableSignal === 'BUY' && newSignal === 'SELL') || 
        (state.lastActionableSignal === 'SELL' && newSignal === 'BUY')) && 
        now - state.lastActionableTime < state.signalLockPeriod * 2) {
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
      const isConsistent = isSignalConsistent(originalSignal, originalConfidence);
      
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
    
    if (modifiedSignals.overallSignal !== 'HOLD' && 
        modifiedSignals.overallSignal !== 'NEUTRAL' &&
        modifiedSignals.confidence >= confidenceThreshold) {
      
      setRecentSignals(prev => {
        const now = Date.now();
        const timeWindow = 600000;
        
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
      
      const oppositeSignalRecently = 
        (modifiedSignals.overallSignal === 'BUY' && recentSignals['SELL'] && 
         Date.now() - recentSignals['SELL'] < 900000) ||
        (modifiedSignals.overallSignal === 'SELL' && recentSignals['BUY'] && 
         Date.now() - recentSignals['BUY'] < 900000);
      
      if (isSignalValid && !oppositeSignalRecently) {
        showNotifications(modifiedSignals.overallSignal, modifiedSignals.confidence);
        trackSignal(modifiedSignals.overallSignal, signalFingerprint);
      } else if (oppositeSignalRecently) {
        console.log(`Signal ${modifiedSignals.overallSignal} skipped: conflicting with recent opposite signal`);
      }
    } else {
      console.log(`Signal ${modifiedSignals.overallSignal} not processed as actionable signal: ${modifiedSignals.confidence.toFixed(0)}% vs threshold ${confidenceThreshold}%)`);
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

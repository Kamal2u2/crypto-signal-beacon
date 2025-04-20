
import { useState, useCallback, useRef } from 'react';
import { SignalSummary, SignalType } from '@/services/technical/types';
import { useSignalNotifications } from './websocket/notifications/useSignalNotifications';
import { useSignalTracking } from './websocket/signals/useSignalTracking';
import { detectMarketRegime } from '@/services/technical/marketRegime';
import { KlineData } from '@/services/binanceService';

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
  klineData?: KlineData[];
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
  selectedPairLabel,
  klineData = []
}: SignalProcessorProps) => {
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const [recentSignals, setRecentSignals] = useState<{[key: string]: number}>({});
  const [signalHistory, setSignalHistory] = useState<Array<{type: SignalType, time: number, confidence: number}>>([]);
  
  // Enhanced signal state tracking with market context awareness
  const signalStateRef = useRef<{
    lastActionableSignal: SignalType | null;
    lastActionableTime: number;
    holdCount: number;
    signalLockPeriod: number;
    confidenceHistory: number[];
    marketRegime: string;
    lastMarketCheck: number;
    consecutiveSameSignals: number;
    oppositeSignalStreak: number;
  }>({
    lastActionableSignal: null,
    lastActionableTime: 0,
    holdCount: 0,
    signalLockPeriod: 60000, // 1 minute lock period
    confidenceHistory: [],
    marketRegime: 'UNDEFINED',
    lastMarketCheck: 0,
    consecutiveSameSignals: 0,
    oppositeSignalStreak: 0
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

  // Enhanced and adaptive signal consistency check
  const isSignalConsistent = (signalType: SignalType, confidence: number): boolean => {
    if (signalHistory.length < 2) return false;
    
    // Analyze recent signal history more comprehensively
    const recentHistory = signalHistory
      .filter(entry => Date.now() - entry.time < 90000)  // 1.5 minutes
      .slice(-4);
    
    // Only require 2 same type signals
    const sameTypeCount = recentHistory.filter(s => s.type === signalType).length;
    
    // Count opposite signals
    const oppositeSignals = recentHistory.filter(s => 
      (signalType === 'BUY' && s.type === 'SELL') || 
      (signalType === 'SELL' && s.type === 'BUY')
    ).length;
    
    // Include market regime in consistency check if available
    if (klineData.length >= 50) {
      // Only recalculate market regime if enough time has passed (every 30 seconds)
      const now = Date.now();
      if (now - signalStateRef.current.lastMarketCheck > 30000) {
        const regime = detectMarketRegime(klineData);
        signalStateRef.current.marketRegime = regime.regime;
        signalStateRef.current.lastMarketCheck = now;
        
        // In strong trending markets, we can be less strict about consistency
        if (regime.regime === 'TRENDING' && regime.strength > 70) {
          const signalAlignedWithTrend = 
            (signalType === 'BUY' && regime.direction === 'UP') ||
            (signalType === 'SELL' && regime.direction === 'DOWN');
            
          if (signalAlignedWithTrend) {
            return sameTypeCount >= 1 && oppositeSignals === 0;
          }
        }
        // In accumulation, be more permissive with BUY signals
        else if (regime.regime === 'ACCUMULATION' && signalType === 'BUY') {
          return sameTypeCount >= 1 && oppositeSignals <= 1;
        }
        // In distribution, be more permissive with SELL signals
        else if (regime.regime === 'DISTRIBUTION' && signalType === 'SELL') {
          return sameTypeCount >= 1 && oppositeSignals <= 1;
        }
      }
    }
    
    // Default consistency check
    return sameTypeCount >= 2 && oppositeSignals <= 1;
  };

  // Adaptive override function with market awareness
  const shouldOverrideToHold = (newSignal: SignalType, confidence: number): boolean => {
    const now = Date.now();
    const state = signalStateRef.current;
    
    // Calculate average confidence
    const avgConfidence = state.confidenceHistory.length > 0 ? 
      state.confidenceHistory.reduce((a, b) => a + b, 0) / state.confidenceHistory.length : 0;
    
    // Check if we're seeing consecutive same signals (indicator of stronger conviction)
    if (newSignal === state.lastActionableSignal) {
      state.consecutiveSameSignals++;
      state.oppositeSignalStreak = 0;
    } else if ((newSignal === 'BUY' && state.lastActionableSignal === 'SELL') ||
               (newSignal === 'SELL' && state.lastActionableSignal === 'BUY')) {
      state.oppositeSignalStreak++;
      state.consecutiveSameSignals = 0;
    }
    
    // Market regime-aware lock period
    let effectiveLockPeriod = state.signalLockPeriod;
    
    if (klineData.length >= 50 && now - state.lastMarketCheck > 30000) {
      const regime = detectMarketRegime(klineData);
      state.marketRegime = regime.regime;
      state.lastMarketCheck = now;
      
      // Adjust lock period based on market conditions
      if (regime.volatility > 80) {
        effectiveLockPeriod = state.signalLockPeriod * 1.5; // Longer lock in high volatility
      } else if (regime.regime === 'TRENDING' && regime.strength > 70) {
        effectiveLockPeriod = state.signalLockPeriod * 0.7; // Shorter lock in strong trends
      }
    }
    
    // For high confidence signals or consecutive same signals, reduce lock period
    if (confidence > 75 || state.consecutiveSameSignals >= 3) {
      effectiveLockPeriod *= 0.7;
    }
    
    // Reduced lock period check
    if (state.lastActionableSignal && 
        state.lastActionableSignal !== newSignal &&
        now - state.lastActionableTime < effectiveLockPeriod / 2) {
      return true;
    }
    
    // Adaptive confidence comparison based on market conditions
    const confidenceThresholdMultiplier = state.marketRegime === 'VOLATILE' ? 0.9 : 0.85;
    
    if ((newSignal === 'BUY' || newSignal === 'SELL') && 
        confidence < avgConfidence * confidenceThresholdMultiplier && 
        confidence < 45) {
      return true;
    }
    
    // Handle opposite signal streaks - if we're seeing many opposite signals, 
    // don't override after a certain point
    if (state.oppositeSignalStreak >= 3 && confidence > 65) {
      return false; // Don't override if we're seeing consistent opposite signals with high confidence
    }
    
    // Allow opposite signals sooner in volatile conditions
    const oppositeMultiplier = state.marketRegime === 'VOLATILE' ? 1.0 : 1.2;
    
    if (state.lastActionableSignal && 
       ((state.lastActionableSignal === 'BUY' && newSignal === 'SELL') || 
        (state.lastActionableSignal === 'SELL' && newSignal === 'BUY')) && 
        now - state.lastActionableTime < effectiveLockPeriod * oppositeMultiplier) {
      return true;
    }
    
    return false;
  };

  // Enhanced signal processing with market context awareness
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
      // For signals with high confidence, skip consistency check
      const highConfidence = originalConfidence >= 65;
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
      
      return updatedHistory.slice(-20); // Keep more history (20 instead of 15)
    });
    
    // Adaptive threshold for tracking based on market conditions
    let effectiveThreshold = confidenceThreshold * 0.9;
    
    // If we have consecutive same signals, we can be a bit more permissive
    if (signalStateRef.current.consecutiveSameSignals >= 2) {
      effectiveThreshold = Math.max(confidenceThreshold * 0.85, 40);
    }
    
    // For volatile markets, require higher confidence
    if (signalStateRef.current.marketRegime === 'VOLATILE') {
      effectiveThreshold = Math.max(confidenceThreshold * 0.95, 50);
    }
    
    if (modifiedSignals.overallSignal !== 'HOLD' && 
        modifiedSignals.overallSignal !== 'NEUTRAL' &&
        modifiedSignals.confidence >= effectiveThreshold) {
      
      setRecentSignals(prev => {
        const now = Date.now();
        const timeWindow = 600000; // 10 minutes
        
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
      
      // Adaptive opposite signal window based on market regime
      let oppositeSignalWindow = 300000; // Default: 5 minutes
      
      if (signalStateRef.current.marketRegime === 'VOLATILE') {
        oppositeSignalWindow = 450000; // 7.5 minutes in volatile markets
      } else if (signalStateRef.current.marketRegime === 'TRENDING') {
        oppositeSignalWindow = 200000; // 3.3 minutes in trending markets
      }
      
      const oppositeSignalRecently = 
        (modifiedSignals.overallSignal === 'BUY' && recentSignals['SELL'] && 
         Date.now() - recentSignals['SELL'] < oppositeSignalWindow) ||
        (modifiedSignals.overallSignal === 'SELL' && recentSignals['BUY'] && 
         Date.now() - recentSignals['BUY'] < oppositeSignalWindow);
      
      if (isSignalValid && !oppositeSignalRecently) {
        showNotifications(modifiedSignals.overallSignal, modifiedSignals.confidence);
        trackSignal(modifiedSignals.overallSignal, signalFingerprint);
      } else if (oppositeSignalRecently) {
        console.log(`Signal ${modifiedSignals.overallSignal} skipped: conflicting with recent opposite signal`);
      }
    } else {
      console.log(`Signal ${modifiedSignals.overallSignal} not processed as actionable signal: ${modifiedSignals.confidence.toFixed(0)}% vs threshold ${effectiveThreshold.toFixed(0)}%)`);
    }
  }, [
    confidenceThreshold, 
    shouldProcessSignal, 
    showNotifications, 
    trackSignal, 
    recentSignals,
    klineData
  ]);

  return {
    signalData,
    setSignalData,
    processNewSignal,
    signalHistory
  };
};

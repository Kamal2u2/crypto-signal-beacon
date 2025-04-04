
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
  
  // Memoize the signal processing to prevent unnecessary rerenders
  const processNewSignal = useCallback((newSignals: SignalSummary) => {
    // Create a stringified version of the signal to compare with previous
    const signalFingerprint = `${newSignals.overallSignal}-${newSignals.confidence}`;
    
    // Only update state if signal has changed
    if (lastProcessedSignalRef.current !== signalFingerprint) {
      lastProcessedSignalRef.current = signalFingerprint;
      setSignalData(newSignals);
      
      // Check for new valid signals
      const isSignalValid = newSignals.overallSignal !== 'NEUTRAL' && 
                          newSignals.overallSignal !== 'HOLD' && 
                          newSignals.confidence >= confidenceThreshold;
      
      if (isAudioInitialized && alertsEnabled && isSignalValid && newSignals.overallSignal !== lastSignalType) {
        if (newSignals.overallSignal === 'BUY' || newSignals.overallSignal === 'SELL') {
          playSignalSound(newSignals.overallSignal, alertVolume);
          
          if (notificationsEnabled) {
            sendSignalNotification(
              newSignals.overallSignal, 
              selectedPairLabel, 
              newSignals.confidence
            );
          }
          
          toast({
            title: `${newSignals.overallSignal} Signal Detected`,
            description: `${selectedPairLabel} - Confidence: ${newSignals.confidence.toFixed(0)}%`,
            variant: newSignals.overallSignal === 'BUY' ? 'default' : 'destructive',
          });
          
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

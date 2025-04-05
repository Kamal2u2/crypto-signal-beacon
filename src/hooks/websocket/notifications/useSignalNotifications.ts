
import { useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { SignalType } from '@/services/technical/types';

interface SignalNotificationProps {
  isAudioInitialized: boolean;
  alertsEnabled: boolean;
  alertVolume: number;
  notificationsEnabled: boolean;
  playSignalSound: (type: 'BUY' | 'SELL', volume: number) => void;
  sendSignalNotification: (type: string, symbol: string, confidence: number) => void;
  selectedPairLabel: string;
  confidenceThreshold: number;
}

export const useSignalNotifications = ({
  isAudioInitialized,
  alertsEnabled,
  alertVolume,
  notificationsEnabled,
  playSignalSound,
  sendSignalNotification,
  selectedPairLabel,
  confidenceThreshold
}: SignalNotificationProps) => {
  const lastToastTimeRef = useRef<number>(0);
  const MIN_TOAST_INTERVAL = 5000; // Minimum 5 seconds between toasts
  
  // Keep track of props to avoid closure issues
  const propsRef = useRef({
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    selectedPairLabel,
    confidenceThreshold
  });

  // Update props ref when they change
  useEffect(() => {
    propsRef.current = {
      isAudioInitialized,
      alertsEnabled,
      alertVolume,
      notificationsEnabled,
      selectedPairLabel,
      confidenceThreshold
    };
  }, [
    isAudioInitialized,
    alertsEnabled,
    alertVolume,
    notificationsEnabled,
    selectedPairLabel,
    confidenceThreshold
  ]);

  const showNotifications = useCallback((
    signalType: SignalType, 
    confidence: number
  ) => {
    // Get current props from ref to avoid closure issues
    const {
      isAudioInitialized,
      alertsEnabled,
      notificationsEnabled,
      alertVolume,
      selectedPairLabel,
      confidenceThreshold
    } = propsRef.current;
    
    // Skip notifications for signals below threshold
    if (confidence < confidenceThreshold) {
      console.log(`Skipping notification for ${signalType} signal (${confidence.toFixed(0)}% < ${confidenceThreshold}%)`);
      return;
    }
    
    if (signalType !== 'BUY' && signalType !== 'SELL') return;
    
    // Play the signal sound
    if (isAudioInitialized && alertsEnabled) {
      playSignalSound(signalType, alertVolume);
    }
    
    // Send browser notification if enabled
    if (notificationsEnabled) {
      sendSignalNotification(
        signalType, 
        selectedPairLabel, 
        confidence
      );
    }
    
    // Show toast notification (with rate limiting)
    const now = Date.now();
    if (now - lastToastTimeRef.current > MIN_TOAST_INTERVAL) {
      toast({
        title: `${signalType} Signal Detected`,
        description: `${selectedPairLabel} - Confidence: ${confidence.toFixed(0)}%`,
        variant: signalType === 'BUY' ? 'default' : 'destructive',
      });
      lastToastTimeRef.current = now;
    }
    
  }, [playSignalSound, sendSignalNotification]);

  return { showNotifications };
};

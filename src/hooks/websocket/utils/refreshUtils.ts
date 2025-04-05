
import { toast } from '@/components/ui/use-toast';
import { closeWebSocket } from '@/services/binanceService';

export const handleRefresh = ({
  lastFetchTimeRef,
  fetchInProgressRef,
  closeWebSocket,
  webSocketInitializedRef,
  reconnectAttemptsRef,
  setIsLoading,
  setupWebSocket
}: {
  lastFetchTimeRef: React.MutableRefObject<number>;
  fetchInProgressRef: React.MutableRefObject<boolean>;
  closeWebSocket: () => void;
  webSocketInitializedRef: React.MutableRefObject<boolean>;
  reconnectAttemptsRef: React.MutableRefObject<number>;
  setIsLoading: (isLoading: boolean) => void;
  setupWebSocket: () => Promise<void>;
}) => {
  const now = Date.now();
  if (now - lastFetchTimeRef.current < 2000) {
    console.log('Too many refreshes, throttling API calls');
    toast({
      title: "Please wait",
      description: "Refreshing too quickly, please wait a moment",
    });
    return;
  }
  
  if (fetchInProgressRef.current) {
    console.log('Fetch already in progress, skipping refresh request');
    return;
  }
  
  closeWebSocket();
  webSocketInitializedRef.current = false;
  reconnectAttemptsRef.current = 0;
  setIsLoading(true);
  
  setTimeout(() => {
    setupWebSocket().finally(() => {
      setIsLoading(false);
    });
  }, 500);
};

export const cleanupResources = ({
  reconnectTimeoutRef,
  closeWebSocket,
  webSocketInitializedRef
}: {
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  closeWebSocket: () => void;
  webSocketInitializedRef: React.MutableRefObject<boolean>;
}) => {
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }
  closeWebSocket();
  webSocketInitializedRef.current = false;
};

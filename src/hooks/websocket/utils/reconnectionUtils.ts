
import { toast } from '@/components/ui/use-toast';

export const handleReconnection = (
  reconnectAttemptsRef: React.MutableRefObject<number>,
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setupWebSocket: () => Promise<void>,
  closeWebSocket: () => void,
  webSocketInitializedRef: React.MutableRefObject<boolean>
) => {
  // Show toast notification for connection issues
  if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current > 5) {
    toast({
      title: "Connection Issue",
      description: "Attempting to reconnect chart data...",
      variant: "destructive"
    });
  }
  
  // Increment reconnection attempts
  reconnectAttemptsRef.current++;
  
  // Calculate backoff time with exponential increase
  const backoffTime = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
  
  // Clear any existing timeout
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
  }
  
  // Set new timeout with exponential backoff
  reconnectTimeoutRef.current = setTimeout(() => {
    if (reconnectAttemptsRef.current < 10) {
      closeWebSocket();
      webSocketInitializedRef.current = false;
      setupWebSocket();
    }
  }, backoffTime);
};

import { useEffect } from 'react';
import { pingPriceWebSocket } from '@/services/binanceService';

interface WebSocketHeartbeatProps {
  heartbeatIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export const useWebSocketHeartbeat = ({
  heartbeatIntervalRef
}: WebSocketHeartbeatProps) => {
  // Setup heartbeat to keep WebSocket connection alive
  useEffect(() => {
    if (!heartbeatIntervalRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        pingPriceWebSocket();
      }, 15000);
    }
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [heartbeatIntervalRef]);
};

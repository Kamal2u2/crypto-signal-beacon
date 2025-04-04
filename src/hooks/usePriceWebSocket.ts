
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  CoinPair,
  fetchCurrentPrice,
  initializePriceWebSocket,
  closePriceWebSocket
} from '@/services/binanceService';

export const usePriceWebSocket = (selectedPair: CoinPair) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const lastPriceUpdateRef = useRef<number>(Date.now());
  const initializedRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkPriceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    if (price !== currentPrice) {
      setCurrentPrice(price);
      lastPriceUpdateRef.current = Date.now();
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful update
    }
  }, [currentPrice]);

  const setupPriceWebSocket = useCallback(async () => {
    try {
      // Get initial price
      const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
      if (initialPrice !== null) {
        setCurrentPrice(initialPrice);
        lastPriceUpdateRef.current = Date.now();
      }
      
      // Initialize price WebSocket with explicit callback
      initializePriceWebSocket(
        selectedPair.symbol,
        handlePriceUpdate
      );
      
      initializedRef.current = true;
    } catch (error) {
      console.error('Error setting up price WebSocket:', error);
      
      // Only show toast for critical failures to avoid UI spam
      if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current > 5) {
        toast({
          title: "Price Connection Issue",
          description: "Attempting to reconnect...",
          variant: "destructive"
        });
      }
      
      // Schedule a reconnect
      reconnectAttemptsRef.current++;
      
      // Exponential backoff for reconnection attempts
      const backoffTime = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
      
      if (reconnectIntervalRef.current) {
        clearTimeout(reconnectIntervalRef.current);
      }
      
      reconnectIntervalRef.current = setTimeout(() => {
        if (reconnectAttemptsRef.current < 10) {
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }, backoffTime);
    }
  }, [selectedPair.symbol, handlePriceUpdate]);

  useEffect(() => {
    // Clear any existing intervals and connections when the pair changes
    if (checkPriceUpdateIntervalRef.current) {
      clearInterval(checkPriceUpdateIntervalRef.current);
    }
    
    if (reconnectIntervalRef.current) {
      clearTimeout(reconnectIntervalRef.current);
    }
    
    if (initializedRef.current) {
      closePriceWebSocket();
    }
    
    initializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    setupPriceWebSocket();
    
    // Set up a backup timer to check if we're getting updates
    checkPriceUpdateIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastPriceUpdateRef.current;
      
      // If no price update for 10 seconds, manually fetch a new price
      if (timeSinceLastUpdate > 10000 && reconnectAttemptsRef.current < 5) {
        fetchCurrentPrice(selectedPair.symbol)
          .then(price => {
            if (price !== null && price !== currentPrice) {
              setCurrentPrice(price);
              lastPriceUpdateRef.current = now;
            }
          })
          .catch(err => console.error("Error fetching fallback price:", err));
          
        // Try to reconnect the WebSocket if we haven't had an update in a while
        if (timeSinceLastUpdate > 20000) {
          reconnectAttemptsRef.current++;
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }
    }, 5000);
    
    return () => {
      if (checkPriceUpdateIntervalRef.current) {
        clearInterval(checkPriceUpdateIntervalRef.current);
      }
      
      if (reconnectIntervalRef.current) {
        clearTimeout(reconnectIntervalRef.current);
      }
      
      closePriceWebSocket();
    };
  }, [selectedPair.symbol, setupPriceWebSocket, currentPrice]);

  return { currentPrice };
};


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
  
  // Use a separate ref to track price updates without triggering renders
  const priceUpdateRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const batchUpdatesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    if (price !== priceUpdateRef.current) {
      priceUpdateRef.current = price;
      lastPriceUpdateRef.current = Date.now();
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful update
      
      // Cancel any pending updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (batchUpdatesTimeoutRef.current) {
        clearTimeout(batchUpdatesTimeoutRef.current);
      }
      
      // Use rAF for smooth updates that don't block the UI
      animationFrameRef.current = requestAnimationFrame(() => {
        // Only update the state (which triggers renders) if no update has occurred in the last 100ms
        // This batches rapid price updates to prevent excessive rendering
        batchUpdatesTimeoutRef.current = setTimeout(() => {
          setCurrentPrice(priceUpdateRef.current);
          batchUpdatesTimeoutRef.current = null;
        }, 100);
        animationFrameRef.current = null;
      });
    }
  }, []);

  const setupPriceWebSocket = useCallback(async () => {
    try {
      // Get initial price
      const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
      if (initialPrice !== null) {
        priceUpdateRef.current = initialPrice;
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
    // Clean up any existing timers and animation frames
    const cleanupTimers = () => {
      if (checkPriceUpdateIntervalRef.current) {
        clearInterval(checkPriceUpdateIntervalRef.current);
      }
      
      if (reconnectIntervalRef.current) {
        clearTimeout(reconnectIntervalRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (batchUpdatesTimeoutRef.current) {
        clearTimeout(batchUpdatesTimeoutRef.current);
      }
    };
    
    // Clear existing connections when the pair changes
    cleanupTimers();
    
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
      
      // If no price update for 5 seconds (reduced from 10s), manually fetch a new price
      if (timeSinceLastUpdate > 5000 && reconnectAttemptsRef.current < 5) {
        fetchCurrentPrice(selectedPair.symbol)
          .then(price => {
            if (price !== null && price !== priceUpdateRef.current) {
              priceUpdateRef.current = price;
              setCurrentPrice(price);
              lastPriceUpdateRef.current = now;
            }
          })
          .catch(err => console.error("Error fetching fallback price:", err));
          
        // Try to reconnect the WebSocket if we haven't had an update in a while
        if (timeSinceLastUpdate > 15000) { // Reduced from 20s
          reconnectAttemptsRef.current++;
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }
    }, 3000); // Check more frequently (reduced from 5s)
    
    return () => {
      cleanupTimers();
      closePriceWebSocket();
    };
  }, [selectedPair.symbol, setupPriceWebSocket]);

  return { currentPrice };
};

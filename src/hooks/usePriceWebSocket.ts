
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  AssetPair,
  fetchCurrentPrice,
  initializePriceWebSocket,
  closePriceWebSocket
} from '@/services/binanceService';
import { isUsingSimulatedStockData } from '@/services/market/stockService';

export const usePriceWebSocket = (selectedPair: AssetPair) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const lastPriceUpdateRef = useRef<number>(Date.now());
  const initializedRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkPriceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Price update optimization
  const priceUpdateRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRenderedPriceRef = useRef<number | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    if (price !== priceUpdateRef.current) {
      priceUpdateRef.current = price;
      lastPriceUpdateRef.current = Date.now();
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful update
      
      // Cancel any pending updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Use rAF for smooth updates without debouncing
      animationFrameRef.current = requestAnimationFrame(() => {
        setCurrentPrice(price);
        lastRenderedPriceRef.current = price;
        animationFrameRef.current = null;
      });
    }
  }, []);

  const setupPriceWebSocket = useCallback(async () => {
    try {
      console.log(`Setting up price WebSocket for ${selectedPair.symbol} (${selectedPair.assetType})`);
      
      // Get initial price
      const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
      console.log(`Initial price for ${selectedPair.symbol}: ${initialPrice}`);
      
      if (initialPrice !== null) {
        priceUpdateRef.current = initialPrice;
        setCurrentPrice(initialPrice);
        lastRenderedPriceRef.current = initialPrice;
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
      
      // Faster backoff for reconnection attempts
      const backoffTime = Math.min(1000 * Math.pow(1.3, reconnectAttemptsRef.current), 10000); // Reduced max backoff
      
      if (reconnectIntervalRef.current) {
        clearTimeout(reconnectIntervalRef.current);
      }
      
      reconnectIntervalRef.current = setTimeout(() => {
        if (reconnectAttemptsRef.current < 15) { // Increased max attempts
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }, backoffTime);
    }
  }, [selectedPair.symbol, handlePriceUpdate, selectedPair.assetType]);

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
    };
    
    // Clear existing connections when the pair changes
    cleanupTimers();
    
    if (initializedRef.current) {
      closePriceWebSocket();
    }
    
    initializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    lastRenderedPriceRef.current = null;
    
    setupPriceWebSocket();
    
    // Set up a backup timer to check if we're getting updates
    checkPriceUpdateIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastPriceUpdateRef.current;
      
      // If no price update for 2 seconds (reduced from 3s), manually fetch a new price
      if (timeSinceLastUpdate > 2000 && reconnectAttemptsRef.current < 5) {
        fetchCurrentPrice(selectedPair.symbol)
          .then(price => {
            if (price !== null && price !== priceUpdateRef.current) {
              priceUpdateRef.current = price;
              setCurrentPrice(price); // Update UI immediately
              lastRenderedPriceRef.current = price;
              lastPriceUpdateRef.current = now;
            }
          })
          .catch(err => console.error("Error fetching fallback price:", err));
          
        // Try to reconnect the WebSocket if we haven't had an update in a while
        if (timeSinceLastUpdate > 5000) { // Reduced from 8s
          reconnectAttemptsRef.current++;
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }
    }, 1000); // Check more frequently (reduced from 2s)
    
    return () => {
      cleanupTimers();
      closePriceWebSocket();
    };
  }, [selectedPair.symbol, setupPriceWebSocket]);

  return { currentPrice };
};


import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  AssetPair,
  fetchCurrentPrice,
  initializePriceWebSocket,
  closePriceWebSocket
} from '@/services/binanceService';

export const usePriceWebSocket = (selectedPair: AssetPair) => {
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
      
      if (batchUpdatesTimeoutRef.current) {
        clearTimeout(batchUpdatesTimeoutRef.current);
      }
      
      // Use rAF for smooth updates that don't block the UI
      animationFrameRef.current = requestAnimationFrame(() => {
        // Only update the state (which triggers renders) if price has changed by a meaningful amount
        // or if a certain time has passed since the last render
        const priceDiffPercent = lastRenderedPriceRef.current ? 
          Math.abs((price - lastRenderedPriceRef.current) / lastRenderedPriceRef.current) * 100 : 100;
        
        const timeSinceLastUpdate = Date.now() - (lastRenderedPriceRef.current ? lastPriceUpdateRef.current : 0);
        
        // Update immediately if price change is significant or if no update in a while
        if (priceDiffPercent > 0.01 || timeSinceLastUpdate > 3000 || lastRenderedPriceRef.current === null) {
          setCurrentPrice(price);
          lastRenderedPriceRef.current = price;
        } else {
          // For small changes, batch updates to prevent too many renders
          batchUpdatesTimeoutRef.current = setTimeout(() => {
            if (priceUpdateRef.current !== lastRenderedPriceRef.current) {
              setCurrentPrice(priceUpdateRef.current);
              lastRenderedPriceRef.current = priceUpdateRef.current;
            }
            batchUpdatesTimeoutRef.current = null;
          }, 500); // Batch updates over a 500ms window
        }
        
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
    lastRenderedPriceRef.current = null;
    
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
              
              // Only update UI if meaningful change or enough time has passed
              if (lastRenderedPriceRef.current === null || 
                  Math.abs((price - (lastRenderedPriceRef.current || 0)) / (lastRenderedPriceRef.current || 1)) > 0.001 ||
                  now - lastPriceUpdateRef.current > 5000) {
                setCurrentPrice(price);
                lastRenderedPriceRef.current = price;
              }
              
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

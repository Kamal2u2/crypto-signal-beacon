
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  AssetPair,
  fetchCurrentPrice,
  initializePriceWebSocket,
  closePriceWebSocket,
  resumeConnections
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
  
  // Add a ref to store last valid price
  const lastValidPriceRef = useRef<number | null>(null);

  const handlePriceUpdate = useCallback((price: number) => {
    // Don't update UI with error values (-1)
    if (price === -1) {
      console.log('Received error price value (-1), not updating UI');
      return;
    }
    
    // Store the last valid price
    lastValidPriceRef.current = price;
    
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
          console.log(`Price display updated to: ${price}`);
        } else {
          // For small changes, batch updates to prevent too many renders
          batchUpdatesTimeoutRef.current = setTimeout(() => {
            if (priceUpdateRef.current !== lastRenderedPriceRef.current) {
              setCurrentPrice(priceUpdateRef.current);
              lastRenderedPriceRef.current = priceUpdateRef.current;
              console.log(`Batched price display updated to: ${priceUpdateRef.current}`);
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
      
      if (initialPrice !== null && initialPrice !== -1) {
        priceUpdateRef.current = initialPrice;
        setCurrentPrice(initialPrice);
        lastRenderedPriceRef.current = initialPrice;
        lastValidPriceRef.current = initialPrice;
        lastPriceUpdateRef.current = Date.now();
      } else if (initialPrice === -1) {
        console.warn(`Error fetching initial price for ${selectedPair.symbol}, using simulated price`);
        
        // Generate a realistic price based on the stock symbol
        const simulatedPrice = selectedPair.symbol.includes('AAPL') ? 170 + (Math.random() * 10 - 5) : 
                              selectedPair.symbol.includes('MSFT') ? 380 + (Math.random() * 20 - 10) : 
                              selectedPair.symbol.includes('GOOGL') ? 150 + (Math.random() * 8 - 4) : 
                              selectedPair.symbol.includes('AMZN') ? 180 + (Math.random() * 10 - 5) : 
                              100 + (Math.random() * 5 - 2.5);
        
        priceUpdateRef.current = simulatedPrice;
        setCurrentPrice(simulatedPrice);
        lastRenderedPriceRef.current = simulatedPrice;
        lastValidPriceRef.current = simulatedPrice;
        lastPriceUpdateRef.current = Date.now();
        
        // Show toast about simulated data
        toast({
          title: "Using simulated price data",
          description: `Live prices for ${selectedPair.symbol} are unavailable`,
          variant: "warning"
        });
      }
      
      // Initialize price WebSocket with explicit callback
      initializePriceWebSocket(
        selectedPair.symbol,
        handlePriceUpdate
      );
      
      initializedRef.current = true;
    } catch (error) {
      console.error('Error setting up price WebSocket:', error);
      
      // Generate simulated price if we have an error
      if (lastValidPriceRef.current === null) {
        const simulatedPrice = selectedPair.symbol.includes('AAPL') ? 170 + (Math.random() * 10 - 5) : 
                              selectedPair.symbol.includes('MSFT') ? 380 + (Math.random() * 20 - 10) : 
                              selectedPair.symbol.includes('GOOGL') ? 150 + (Math.random() * 8 - 4) : 
                              selectedPair.symbol.includes('AMZN') ? 180 + (Math.random() * 10 - 5) : 
                              100 + (Math.random() * 5 - 2.5);
        
        priceUpdateRef.current = simulatedPrice;
        setCurrentPrice(simulatedPrice);
        lastRenderedPriceRef.current = simulatedPrice;
        lastValidPriceRef.current = simulatedPrice;
        lastPriceUpdateRef.current = Date.now();
      }
      
      // Only show toast for critical failures to avoid UI spam
      if (reconnectAttemptsRef.current === 0 || reconnectAttemptsRef.current > 5) {
        toast({
          title: "Price Connection Issue",
          description: "Using simulated data, attempting to reconnect...",
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
      
      // If no price update for 5 seconds, manually fetch a new price
      if (timeSinceLastUpdate > 5000 && reconnectAttemptsRef.current < 5) {
        // Resume any paused connections first
        resumeConnections();
        
        fetchCurrentPrice(selectedPair.symbol)
          .then(price => {
            if (price !== null && price !== -1 && price !== priceUpdateRef.current) {
              priceUpdateRef.current = price;
              lastValidPriceRef.current = price;
              
              // Only update UI if meaningful change or enough time has passed
              if (lastRenderedPriceRef.current === null || 
                  Math.abs((price - (lastRenderedPriceRef.current || 0)) / (lastRenderedPriceRef.current || 1)) > 0.001 ||
                  now - lastPriceUpdateRef.current > 5000) {
                console.log(`Manual price update for ${selectedPair.symbol}: ${price}`);
                setCurrentPrice(price);
                lastRenderedPriceRef.current = price;
              }
              
              lastPriceUpdateRef.current = now;
            } else if (price === -1) {
              // For error values, generate a simulated price movement
              if (lastValidPriceRef.current !== null) {
                const volatility = 0.001; // 0.1% price movement
                const change = lastValidPriceRef.current * volatility * (Math.random() * 2 - 1);
                const simulatedPrice = lastValidPriceRef.current + change;
                
                priceUpdateRef.current = simulatedPrice;
                lastValidPriceRef.current = simulatedPrice;
                
                console.log(`Generated simulated price update: ${simulatedPrice}`);
                setCurrentPrice(simulatedPrice);
                lastRenderedPriceRef.current = simulatedPrice;
                lastPriceUpdateRef.current = now;
              }
            }
          })
          .catch(err => {
            console.error("Error fetching fallback price:", err);
            
            // Generate a simulated price movement if we have a previous valid price
            if (lastValidPriceRef.current !== null) {
              const volatility = 0.001; // 0.1% price movement
              const change = lastValidPriceRef.current * volatility * (Math.random() * 2 - 1);
              const simulatedPrice = lastValidPriceRef.current + change;
              
              priceUpdateRef.current = simulatedPrice;
              lastValidPriceRef.current = simulatedPrice;
              
              console.log(`Generated simulated price update after error: ${simulatedPrice}`);
              setCurrentPrice(simulatedPrice);
              lastRenderedPriceRef.current = simulatedPrice;
              lastPriceUpdateRef.current = now;
            }
          });
          
        // Try to reconnect the WebSocket if we haven't had an update in a while
        if (timeSinceLastUpdate > 15000) {
          reconnectAttemptsRef.current++;
          closePriceWebSocket();
          setupPriceWebSocket();
        }
      }
    }, 3000);
    
    return () => {
      cleanupTimers();
      closePriceWebSocket();
    };
  }, [selectedPair.symbol, setupPriceWebSocket, selectedPair]);

  return { currentPrice };
};

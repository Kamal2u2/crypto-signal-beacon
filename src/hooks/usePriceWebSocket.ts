
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

  const handlePriceUpdate = useCallback((price: number) => {
    console.log(`Price update received: ${price} for ${selectedPair.symbol}`);
    setCurrentPrice(price);
    lastPriceUpdateRef.current = Date.now();
  }, [selectedPair.symbol]);

  useEffect(() => {
    const setupPriceWebSocket = async () => {
      try {
        // Get initial price
        const initialPrice = await fetchCurrentPrice(selectedPair.symbol);
        setCurrentPrice(initialPrice);
        
        // Initialize price WebSocket with explicit callback
        initializePriceWebSocket(
          selectedPair.symbol,
          handlePriceUpdate
        );
        
        // Set up a backup timer to check if we're getting updates
        const checkPriceUpdates = setInterval(() => {
          const now = Date.now();
          const timeSinceLastUpdate = now - lastPriceUpdateRef.current;
          
          // If no price update for 5 seconds, manually fetch a new price
          // and try to reconnect the WebSocket
          if (timeSinceLastUpdate > 5000) {
            console.log(`No price updates for ${Math.round(timeSinceLastUpdate/1000)}s, manually fetching price`);
            
            // Fetch a fresh price
            fetchCurrentPrice(selectedPair.symbol)
              .then(price => {
                if (price !== null) {
                  setCurrentPrice(price);
                  lastPriceUpdateRef.current = now;
                }
              })
              .catch(err => console.error("Error fetching fallback price:", err));
            
            // Try to reconnect the WebSocket
            closePriceWebSocket();
            initializePriceWebSocket(selectedPair.symbol, handlePriceUpdate);
          }
        }, 2000); // Check every 2 seconds
        
        return () => {
          clearInterval(checkPriceUpdates);
          closePriceWebSocket();
        };
      } catch (error) {
        console.error('Error setting up price WebSocket:', error);
        toast({
          title: "Price Connection Error",
          description: "Failed to establish price connection. Try refreshing the page.",
          variant: "destructive"
        });
      }
    };
    
    setupPriceWebSocket();
  }, [selectedPair.symbol, handlePriceUpdate]);

  return { currentPrice };
};

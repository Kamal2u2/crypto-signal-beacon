
// Re-export all types and constants
export * from './market/types';
export * from './market/assetPairs';

import { AssetType, TimeInterval, KlineData, AssetPair } from './market/types';
import { STOCK_PAIRS } from './market/assetPairs';
import { 
  fetchCryptoPrice, 
  fetchCryptoKlineData,
  initializeCryptoPriceWebSocket,
  initializeCryptoKlineWebSocket,
  closeCryptoPriceWebSocket,
  closeCryptoWebSocket,
  updateKlineData,
  testCryptoWebSocketConnection,
  pingCryptoWebSocket
} from './market/cryptoService';
import {
  fetchStockPrice,
  fetchStockKlineData,
  initializeStockPricePolling,
  initializeStockKlinePolling,
  closeStockPolling
} from './market/stockService';

// Re-export for backward compatibility
export { updateKlineData };
export const testWebSocketConnection = testCryptoWebSocketConnection;
export const pingPriceWebSocket = pingCryptoWebSocket;

// Helper function to determine if a symbol is a stock
const isStockSymbol = (symbol: string): boolean => {
  return STOCK_PAIRS.some(pair => pair.symbol === symbol);
};

// Fetch current price for an asset (crypto or stock)
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    // Check if this is a stock symbol
    if (isStockSymbol(symbol)) {
      console.log(`Fetching STOCK price for: ${symbol}`);
      return await fetchStockPrice(symbol);
    } else {
      console.log(`Fetching CRYPTO price for: ${symbol}`);
      return await fetchCryptoPrice(symbol);
    }
  } catch (error) {
    console.error('Error fetching current price:', error);
    return null;
  }
};

// Fetch kline data for a symbol
export const fetchKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    // Check if this is a stock symbol
    if (isStockSymbol(symbol)) {
      console.log(`Fetching STOCK kline data for: ${symbol}`);
      return await fetchStockKlineData(symbol, interval, limit);
    } else {
      console.log(`Fetching CRYPTO kline data for: ${symbol}`);
      return await fetchCryptoKlineData(symbol, interval, limit);
    }
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return [];
  }
};

// Initialize price WebSocket for both crypto and stocks
export const initializePriceWebSocket = (symbol: string, onPriceUpdate: (price: number) => void) => {
  // Check if this is a stock symbol
  if (isStockSymbol(symbol)) {
    console.log(`Initializing STOCK price polling for: ${symbol}`);
    initializeStockPricePolling(symbol, onPriceUpdate);
  } else {
    console.log(`Initializing CRYPTO price websocket for: ${symbol}`);
    initializeCryptoPriceWebSocket(symbol, onPriceUpdate);
  }
};

// Initialize WebSocket for kline data
export const initializeWebSocket = (
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
) => {
  // Check if this is a stock symbol
  if (isStockSymbol(symbol)) {
    console.log(`Initializing STOCK kline polling for: ${symbol}`);
    initializeStockKlinePolling(symbol, interval, onKlineUpdate);
  } else {
    console.log(`Initializing CRYPTO kline websocket for: ${symbol}`);
    initializeCryptoKlineWebSocket(symbol, interval, onKlineUpdate);
  }
};

// Close WebSocket connection for price only
export const closePriceWebSocket = () => {
  closeCryptoPriceWebSocket();
  closeStockPolling();
};

// Close all WebSocket connections
export const closeWebSocket = () => {
  closeCryptoWebSocket();
  closeStockPolling();
};

// Add a helper function to fetch all available asset pairs (for future development)
export const fetchAllAssetPairs = async (): Promise<AssetPair[]> => {
  // This would normally fetch from an API, but we'll just use our predefined lists
  return [...STOCK_PAIRS];
};

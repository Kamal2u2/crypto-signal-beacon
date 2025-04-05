
import { KlineData, TimeInterval } from './types';

// Finnhub API Key
const FINNHUB_API_KEY = 'cu387p9r01qure9c49ugcu387p9r01qure9c49v0';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Convert our interval format to Finnhub's format
const convertIntervalForFinnhub = (interval: TimeInterval): string => {
  // Map Binance intervals to Finnhub intervals
  switch (interval) {
    case '1m': return '1';
    case '5m': return '5';
    case '15m': return '15';
    case '30m': return '30';
    case '1h': return '60';
    case '4h': return '240';
    case '1d': return 'D';
    default: return '15';
  }
};

// Determine the from/to timestamps based on interval and limit
const getTimeRange = (interval: TimeInterval, limit: number = 100): { from: number, to: number } => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  let timeBack: number;
  
  switch (interval) {
    case '1m': timeBack = 60 * limit; break;
    case '5m': timeBack = 5 * 60 * limit; break;
    case '15m': timeBack = 15 * 60 * limit; break;
    case '30m': timeBack = 30 * 60 * limit; break;
    case '1h': timeBack = 60 * 60 * limit; break;
    case '4h': timeBack = 4 * 60 * 60 * limit; break;
    case '1d': timeBack = 24 * 60 * 60 * limit; break;
    default: timeBack = 15 * 60 * limit;
  }
  
  return {
    from: now - timeBack,
    to: now
  };
};

// Fetch current stock price from Finnhub API
export const fetchStockPrice = async (symbol: string): Promise<number | null> => {
  try {
    console.log(`Fetching current price for stock: ${symbol} from Finnhub API`);
    
    // Add cache-busting parameter to prevent caching issues
    const timestamp = Date.now();
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}&_=${timestamp}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      throw new Error(`Finnhub API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && typeof data.c === 'number') {
      console.log(`Stock price received for ${symbol}: ${data.c}`);
      return data.c; // Current price
    } else {
      console.error('Invalid data received from Finnhub API:', data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching stock price from Finnhub:', error);
    
    // Return a placeholder price to indicate error (-1)
    // This ensures we don't fall back to crypto data
    return -1;
  }
};

// Fetch stock candle data from Finnhub API
export const fetchStockKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    console.log(`Fetching kline data for stock: ${symbol} with interval ${interval} from Finnhub API`);
    
    const resolution = convertIntervalForFinnhub(interval);
    const { from, to } = getTimeRange(interval, limit);
    
    // Add cache-busting parameter to prevent caching issues
    const timestamp = Date.now();
    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}&_=${timestamp}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      throw new Error(`Finnhub API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.s === "ok" && Array.isArray(data.t) && data.t.length > 0) {
      const klineData: KlineData[] = [];
      
      for (let i = 0; i < data.t.length; i++) {
        // Skip any data points that are missing any OHLCV value
        if (data.o[i] === null || data.h[i] === null || data.l[i] === null || data.c[i] === null || data.v[i] === null) {
          continue;
        }
        
        klineData.push({
          openTime: data.t[i] * 1000, // Convert to milliseconds
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i],
          closeTime: (data.t[i] * 1000) + getIntervalMs(interval) - 1,
          quoteAssetVolume: data.v[i] * data.c[i], // Calculate quote asset volume
          trades: 0, // Finnhub doesn't provide this
          takerBuyBaseAssetVolume: 0, // Finnhub doesn't provide this
          takerBuyQuoteAssetVolume: 0 // Finnhub doesn't provide this
        });
      }
      
      console.log(`Received ${klineData.length} kline data points for stock ${symbol} from Finnhub`);
      return klineData;
    } else {
      console.error('Invalid or empty data received from Finnhub API:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching stock kline data from Finnhub:', error);
    return [];
  }
};

// Get interval in milliseconds 
const getIntervalMs = (interval: TimeInterval): number => {
  switch(interval) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '4h': return 4 * 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

// Variables for stock data polling
let stockPriceInterval: NodeJS.Timeout | null = null;
let stockKlineInterval: NodeJS.Timeout | null = null;
let priceUpdateCallback: ((price: number) => void) | null = null;
let klineUpdateCallback: ((kline: KlineData) => void) | null = null;
let currentSymbol: string | null = null;
let currentInterval: TimeInterval | null = null;
let isPollingActive = false;

// Initialize price polling for stocks
export const initializeStockPricePolling = (symbol: string, onPriceUpdate: (price: number) => void) => {
  // Store the callback and symbol for later use
  priceUpdateCallback = onPriceUpdate;
  currentSymbol = symbol;
  
  // Clear existing interval if any
  if (stockPriceInterval) {
    clearInterval(stockPriceInterval);
  }
  
  // Initial price fetch
  fetchStockPrice(symbol).then(price => {
    if (price && price !== -1 && priceUpdateCallback) {
      console.log(`Initial stock price update for ${symbol}: ${price}`);
      priceUpdateCallback(price);
    } else if (price === -1) {
      console.warn(`Error fetching initial stock price for ${symbol}, not updating UI`);
      // Don't update the UI with error value
    }
  });
  
  // Set up polling
  isPollingActive = true;
  stockPriceInterval = setInterval(() => {
    if (!isPollingActive) return;
    
    fetchStockPrice(symbol).then(price => {
      if (price && price !== -1 && priceUpdateCallback) {
        console.log(`Polled stock price update for ${symbol}: ${price}`);
        priceUpdateCallback(price);
      }
    });
  }, 10000); // Poll every 10 seconds for stocks
  
  console.log(`Stock price polling initialized for ${symbol}`);
};

// Initialize kline data polling for stocks
export const initializeStockKlinePolling = (
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
) => {
  // Store the callback, symbol, and interval for later use
  klineUpdateCallback = onKlineUpdate;
  currentSymbol = symbol;
  currentInterval = interval;
  
  if (stockKlineInterval) {
    clearInterval(stockKlineInterval);
  }
  
  // Initial data fetch
  fetchStockKlineData(symbol, interval).then(klineData => {
    if (klineData.length > 0 && klineUpdateCallback) {
      const latestKline = klineData[klineData.length - 1];
      console.log(`Initial kline update for ${symbol} (${interval}): close=${latestKline.close}`);
      klineUpdateCallback(latestKline);
    }
  });
  
  // Set up polling based on interval frequency
  const pollInterval = getPollingInterval(interval);
  isPollingActive = true;
  
  stockKlineInterval = setInterval(() => {
    if (!isPollingActive) return;
    
    fetchStockKlineData(symbol, interval).then(klineData => {
      if (klineData.length > 0 && klineUpdateCallback) {
        const latestKline = klineData[klineData.length - 1];
        console.log(`Polled kline update for ${symbol} (${interval}): close=${latestKline.close}`);
        klineUpdateCallback(latestKline);
      }
    });
  }, pollInterval);
  
  console.log(`Stock kline polling initialized for ${symbol} with interval ${interval}`);
};

// Helper function to determine polling interval based on chart interval
const getPollingInterval = (interval: TimeInterval): number => {
  switch (interval) {
    case '1m': return 30000; // 30 seconds
    case '5m': return 60000; // 1 minute
    case '15m': return 120000; // 2 minutes
    case '30m': return 300000; // 5 minutes
    case '1h': return 600000; // 10 minutes
    case '4h': return 900000; // 15 minutes
    case '1d': return 1800000; // 30 minutes
    default: return 60000; // Default to 1 minute
  }
};

// Stop all stock polling intervals
export const closeStockPolling = () => {
  console.log("Closing all stock polling intervals");
  isPollingActive = false;
  
  if (stockPriceInterval) {
    clearInterval(stockPriceInterval);
    stockPriceInterval = null;
  }
  
  if (stockKlineInterval) {
    clearInterval(stockKlineInterval);
    stockKlineInterval = null;
  }
  
  // Reset stored callbacks and data
  priceUpdateCallback = null;
  klineUpdateCallback = null;
};

// Resume polling if it was stopped
export const resumeStockPolling = () => {
  if (!isPollingActive && currentSymbol) {
    console.log(`Resuming stock polling for ${currentSymbol}`);
    isPollingActive = true;
    
    // Reinitialize price polling if needed
    if (priceUpdateCallback) {
      initializeStockPricePolling(currentSymbol, priceUpdateCallback);
    }
    
    // Reinitialize kline polling if needed
    if (klineUpdateCallback && currentInterval) {
      initializeStockKlinePolling(currentSymbol, currentInterval, klineUpdateCallback);
    }
  }
};

// Implement a method to manually refresh data
export const refreshStockData = async (symbol: string, interval?: TimeInterval): Promise<void> => {
  console.log(`Manually refreshing stock data for ${symbol}`);
  
  try {
    // Fetch and update price
    const price = await fetchStockPrice(symbol);
    if (price && price !== -1 && priceUpdateCallback) {
      console.log(`Manual refresh - price update for ${symbol}: ${price}`);
      priceUpdateCallback(price);
    } else if (price === -1) {
      console.warn(`Error fetching stock price during manual refresh for ${symbol}, not updating UI`);
    }
    
    // Fetch and update kline if interval is provided
    if (interval && klineUpdateCallback) {
      const klineData = await fetchStockKlineData(symbol, interval);
      if (klineData.length > 0) {
        const latestKline = klineData[klineData.length - 1];
        console.log(`Manual refresh - kline update for ${symbol}: close=${latestKline.close}`);
        klineUpdateCallback(latestKline);
      }
    }
  } catch (error) {
    console.error("Error during manual refresh of stock data:", error);
  }
};

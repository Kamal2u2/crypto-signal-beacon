
import { KlineData, TimeInterval } from './types';
import { toast } from '@/components/ui/use-toast';

// Finnhub API Key
const FINNHUB_API_KEY = 'cu387p9r01qure9c49ugcu387p9r01qure9c49v0';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Track if we've shown the fallback notice
let fallbackNoticeShown = false;
let usingSimulatedData = false;

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

// Generate historical stock data for demo purposes
const generateHistoricalStockData = (
  symbol: string, 
  interval: TimeInterval, 
  limit: number = 100
): KlineData[] => {
  const klineData: KlineData[] = [];
  const { from, to } = getTimeRange(interval, limit);
  const intervalMs = getIntervalMs(interval);
  const basePrice = getBasePrice(symbol);
  
  // Set the flag that we're using simulated data
  usingSimulatedData = true;
  
  if (!fallbackNoticeShown) {
    toast({
      title: "Using simulated stock data",
      description: "Real-time stock data is unavailable. Using simulated data for demonstration purposes.",
      variant: "destructive", 
      duration: 10000, // Increased duration so it's more noticeable
    });
    fallbackNoticeShown = true;
  }
  
  // Generate historical data points
  for (let i = 0; i < limit; i++) {
    const openTime = (from + i * (intervalMs / 1000)) * 1000;
    const closeTime = openTime + intervalMs - 1;
    
    // Calculate price with some randomness but maintain a trend
    const dayFactor = Math.sin(i / 10) * 5; // Creates a sine wave pattern
    const randomFactor = (Math.random() - 0.5) * 2; // Random factor between -1 and 1
    
    const open = basePrice * (1 + (dayFactor + randomFactor) / 100);
    const close = open * (1 + (Math.random() - 0.48) / 50);
    const high = Math.max(open, close) * (1 + Math.random() / 40);
    const low = Math.min(open, close) * (1 - Math.random() / 40);
    const volume = Math.floor(100000 + Math.random() * 900000);
    
    klineData.push({
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      quoteAssetVolume: volume * close, // Approximation
      trades: Math.floor(volume / 100),
      takerBuyBaseAssetVolume: volume * 0.6,
      takerBuyQuoteAssetVolume: volume * 0.6 * close
    });
  }
  
  return klineData;
};

// Base price for each stock symbol
const getBasePrice = (symbol: string): number => {
  const prices: Record<string, number> = {
    'AAPL': 188.38,
    'MSFT': 425.22,
    'GOOGL': 156.37,
    'AMZN': 185.07,
    'TSLA': 172.98,
    'META': 492.98,
    'NVDA': 94.31,
    'JPM': 196.46,
    'V': 276.69,
    'JNJ': 151.14
  };
  
  return prices[symbol] || 100;
};

// Fetch current stock price from Finnhub API
export const fetchStockPrice = async (symbol: string): Promise<number | null> => {
  try {
    console.log(`Fetching current price for stock: ${symbol} from Finnhub API`);
    
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      usingSimulatedData = true;
      // Return the base price as a fallback
      return getBasePrice(symbol);
    }
    
    const data = await response.json();
    
    if (data && typeof data.c === 'number') {
      console.log(`Stock price received for ${symbol}: ${data.c}`);
      usingSimulatedData = false;
      return data.c; // Current price
    } else {
      console.error('Invalid data received from Finnhub API:', data);
      usingSimulatedData = true;
      // Return the base price as a fallback
      return getBasePrice(symbol);
    }
  } catch (error) {
    console.error('Error fetching stock price from Finnhub:', error);
    usingSimulatedData = true;
    // Return the base price as a fallback
    return getBasePrice(symbol);
  }
};

// Fetch stock candle data from Finnhub API
export const fetchStockKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    console.log(`Fetching kline data for stock: ${symbol} with interval ${interval} from Finnhub API`);
    
    const resolution = convertIntervalForFinnhub(interval);
    const { from, to } = getTimeRange(interval, limit);
    
    const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      
      // If API fails, generate mock data
      console.log(`Generating sample historical data for ${symbol}`);
      return generateHistoricalStockData(symbol, interval, limit);
    }
    
    const data = await response.json();
    
    if (data && data.s === "ok" && Array.isArray(data.t) && data.t.length > 0) {
      usingSimulatedData = false;
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
      
      // Generate mock data as fallback
      return generateHistoricalStockData(symbol, interval, limit);
    }
  } catch (error) {
    console.error('Error fetching stock kline data from Finnhub:', error);
    
    // Return generated data on error
    return generateHistoricalStockData(symbol, interval, limit);
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

// Initialize price polling for stocks
export const initializeStockPricePolling = (symbol: string, onPriceUpdate: (price: number) => void) => {
  // Clear existing interval if any
  if (stockPriceInterval) {
    clearInterval(stockPriceInterval);
  }
  
  // Initial price fetch
  fetchStockPrice(symbol).then(price => {
    if (price) onPriceUpdate(price);
  });
  
  // Set up polling
  stockPriceInterval = setInterval(() => {
    fetchStockPrice(symbol).then(price => {
      if (price) onPriceUpdate(price);
    });
  }, 10000); // Poll every 10 seconds for stocks
};

// Initialize kline data polling for stocks
export const initializeStockKlinePolling = (
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
) => {
  if (stockKlineInterval) {
    clearInterval(stockKlineInterval);
  }
  
  // Initial data fetch
  fetchStockKlineData(symbol, interval).then(klineData => {
    if (klineData.length > 0) {
      const latestKline = klineData[klineData.length - 1];
      onKlineUpdate(latestKline);
    }
  });
  
  // Set up polling based on interval frequency
  const pollInterval = getPollingInterval(interval);
  
  stockKlineInterval = setInterval(() => {
    fetchStockKlineData(symbol, interval).then(klineData => {
      if (klineData.length > 0) {
        const latestKline = klineData[klineData.length - 1];
        onKlineUpdate(latestKline);
      }
    });
  }, pollInterval);
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
  if (stockPriceInterval) {
    clearInterval(stockPriceInterval);
    stockPriceInterval = null;
  }
  
  if (stockKlineInterval) {
    clearInterval(stockKlineInterval);
    stockKlineInterval = null;
  }
};

// Export whether we're using simulated data
export const isUsingSimulatedStockData = (): boolean => {
  return usingSimulatedData;
};

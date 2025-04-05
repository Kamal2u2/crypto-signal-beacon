import { KlineData, TimeInterval } from './types';

// Convert Yahoo Finance interval to their format
const convertIntervalForYahoo = (interval: TimeInterval): string => {
  // Map Binance intervals to Yahoo Finance intervals
  switch (interval) {
    case '1m': return '1m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '30m': return '30m';
    case '1h': return '1h';
    case '4h': return '60m'; // Yahoo doesn't have 4h, use 60m
    case '1d': return '1d';
    default: return '15m';
  }
};

// Determine range based on interval
const getRangeForInterval = (interval: TimeInterval): string => {
  switch (interval) {
    case '1m': return '1d';
    case '5m': return '5d';
    case '15m': return '7d';
    case '30m': return '10d';
    case '1h': return '30d';
    case '4h': return '60d';
    case '1d': return '1y';
    default: return '7d';
  }
};

// Mock data cache to avoid excessive API calls and CORS issues
const mockStockPrices: Record<string, number> = {
  'AAPL': 169.58,
  'GOOGL': 147.60,
  'AMZN': 178.75,
  'MSFT': 425.22,
  'TSLA': 175.34,
  'META': 474.99,
  'NFLX': 610.25,
  'NVDA': 880.18,
  'JPM': 182.56,
  'V': 275.89,
  'WMT': 60.20,
  'JNJ': 152.15,
  'PG': 162.50,
  'DIS': 114.25,
  'KO': 61.40,
};

// Generate realistic kline data from a base price
const generateMockKlineData = (symbol: string, interval: TimeInterval, limit: number): KlineData[] => {
  console.log(`Generating mock data for ${symbol} with interval ${interval}`);
  const basePrice = mockStockPrices[symbol] || 100; // Default price if not found
  const result: KlineData[] = [];
  
  // Create a seed for pseudo-randomness based on symbol
  const seed = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  
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
  
  // Generate data points
  const now = Date.now();
  const intervalMs = getIntervalMs(interval);
  
  for (let i = 0; i < limit; i++) {
    // Generate time for this candle
    const openTime = now - ((limit - i) * intervalMs);
    const closeTime = openTime + intervalMs - 1;
    
    // Generate realistic price movement (with some randomness based on symbol and time)
    const randomFactor = Math.sin(seed + i) * 0.03; // +/- 3% variation
    const trendFactor = (i / limit) * 0.05; // slight trend over time
    const multiplier = 1 + randomFactor + trendFactor;
    
    const open = basePrice * (1 + ((i-1) / limit) * 0.05 + Math.sin(seed + i-1) * 0.03);
    const close = basePrice * multiplier;
    const high = Math.max(open, close) * (1 + Math.abs(randomFactor) * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(randomFactor) * 0.5);
    const volume = basePrice * 1000 * (1 + Math.abs(randomFactor) * 2);
    
    result.push({
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      quoteAssetVolume: volume * close,
      trades: Math.floor(volume / 100),
      takerBuyBaseAssetVolume: volume * 0.6,
      takerBuyQuoteAssetVolume: volume * close * 0.6
    });
  }
  
  return result;
};

// Fetch Yahoo Finance data (previously this was trying to fetch real data)
// Now we'll use our mock data instead due to CORS restrictions
const fetchYahooFinanceData = async (symbol: string, interval: string, range: string): Promise<any> => {
  try {
    // Log that we're using mock data instead of actual API calls
    console.log(`Using mock data for ${symbol} instead of Yahoo Finance API due to CORS restrictions`);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create a mock response similar to what Yahoo Finance would return
    const mockResponse = {
      chart: {
        result: [{
          meta: {
            symbol: symbol,
            regularMarketPrice: mockStockPrices[symbol] || 100
          },
          timestamp: Array(50).fill(0).map((_, i) => Math.floor(Date.now()/1000) - (50-i) * 86400),
          indicators: {
            quote: [{
              open: Array(50).fill(0).map(() => (mockStockPrices[symbol] || 100) * (0.99 + Math.random() * 0.02)),
              high: Array(50).fill(0).map(() => (mockStockPrices[symbol] || 100) * (1.01 + Math.random() * 0.02)),
              low: Array(50).fill(0).map(() => (mockStockPrices[symbol] || 100) * (0.98 + Math.random() * 0.02)),
              close: Array(50).fill(0).map(() => (mockStockPrices[symbol] || 100) * (0.99 + Math.random() * 0.02)),
              volume: Array(50).fill(0).map(() => (mockStockPrices[symbol] || 100) * 10000 * (0.5 + Math.random()))
            }]
          }
        }]
      }
    };
    
    console.log('Mock Yahoo Finance data created successfully');
    return mockResponse;
  } catch (error) {
    console.error('Error creating mock Yahoo Finance data:', error);
    throw error;
  }
};

// Convert Yahoo Finance data to KlineData format with improved error handling
const convertYahooToKlineFormat = (yahooData: any): KlineData[] => {
  if (!yahooData || !yahooData.chart || !yahooData.chart.result || yahooData.chart.result.length === 0) {
    console.error('Invalid Yahoo Finance data for conversion:', yahooData);
    return [];
  }
  
  const result = yahooData.chart.result[0];
  const { timestamp, indicators } = result;
  
  if (!timestamp || !indicators || !indicators.quote || indicators.quote.length === 0) {
    console.error('Missing critical data in Yahoo Finance response:', yahooData);
    return [];
  }
  
  const { open, high, low, close, volume } = indicators.quote[0];
  
  if (!open || !high || !low || !close) {
    console.error('Missing OHLC data in Yahoo Finance response');
    return [];
  }
  
  const klineData: KlineData[] = [];
  
  for (let i = 0; timestamp && i < timestamp.length; i++) {
    // Skip entries with missing data
    if (open[i] === null || high[i] === null || low[i] === null || close[i] === null) {
      continue;
    }
    
    klineData.push({
      openTime: timestamp[i] * 1000, // Convert to milliseconds
      open: open[i] !== null ? open[i] : 0,
      high: high[i] !== null ? high[i] : 0,
      low: low[i] !== null ? low[i] : 0,
      close: close[i] !== null ? close[i] : 0,
      volume: volume[i] !== null ? volume[i] : 0,
      closeTime: (timestamp[i] * 1000) + 59999, // Add 59.999 seconds
      quoteAssetVolume: volume[i] !== null ? volume[i] : 0,
      trades: 0, // Yahoo doesn't provide this
      takerBuyBaseAssetVolume: 0, // Yahoo doesn't provide this
      takerBuyQuoteAssetVolume: 0, // Yahoo doesn't provide this
    });
  }
  
  // Ensure we have recent data by sorting by timestamp
  klineData.sort((a, b) => a.openTime - b.openTime);
  
  // Return all data points
  return klineData;
};

// Variables for stock data polling
let stockPriceInterval: NodeJS.Timeout | null = null;
let stockKlineInterval: NodeJS.Timeout | null = null;

// Fetch current price for a stock
export const fetchStockPrice = async (symbol: string): Promise<number | null> => {
  try {
    console.log(`Fetching current price for stock: ${symbol}`);
    // Use our mock price instead of fetching from Yahoo
    const price = mockStockPrices[symbol] || 100;
    
    // Add a small random variation to simulate market movement
    const variation = (Math.random() - 0.5) * 0.01; // +/- 0.5% variation
    const updatedPrice = price * (1 + variation);
    
    console.log(`Stock price received for ${symbol}: ${updatedPrice.toFixed(2)}`);
    return updatedPrice;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return mockStockPrices[symbol] || 100; // Fallback to mock price
  }
};

// Fetch kline data for a stock
export const fetchStockKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    console.log(`Fetching kline data for stock: ${symbol} with interval ${interval}`);
    // Generate mock kline data instead of fetching from Yahoo
    return generateMockKlineData(symbol, interval, limit);
  } catch (error) {
    console.error('Error fetching stock kline data:', error);
    return generateMockKlineData(symbol, interval, limit); // Fallback to mock data
  }
};

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

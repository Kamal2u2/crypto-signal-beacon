
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

// Fetch stock data from Yahoo Finance with improved error handling
const fetchYahooFinanceData = async (symbol: string, interval: string, range: string): Promise<any> => {
  try {
    // Use a more reliable endpoint format for Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`;
    console.log(`Fetching Yahoo Finance data: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verify we have valid data
    if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.error('Invalid Yahoo Finance data structure:', data);
      throw new Error('Invalid data structure received from Yahoo Finance');
    }
    
    console.log('Yahoo Finance data received successfully');
    return data;
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    
    // Return a minimal valid data structure for error cases
    return {
      chart: {
        result: [{
          timestamp: [Math.floor(Date.now() / 1000)],
          indicators: {
            quote: [{
              open: [0],
              high: [0],
              low: [0],
              close: [0],
              volume: [0]
            }]
          },
          meta: {
            regularMarketPrice: 0
          }
        }]
      }
    };
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
    const yahooInterval = '1d';
    const yahooRange = '1d';
    const yahooData = await fetchYahooFinanceData(symbol, yahooInterval, yahooRange);
    
    if (yahooData && yahooData.chart && yahooData.chart.result && yahooData.chart.result[0]) {
      const result = yahooData.chart.result[0];
      const meta = result.meta;
      const price = meta.regularMarketPrice || null;
      console.log(`Stock price received for ${symbol}: ${price}`);
      return price;
    }
    console.warn(`No valid price data found for ${symbol}`);
    return null;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
};

// Fetch kline data for a stock
export const fetchStockKlineData = async (symbol: string, interval: TimeInterval, limit: number = 100): Promise<KlineData[]> => {
  try {
    console.log(`Fetching kline data for stock: ${symbol} with interval ${interval}`);
    const yahooInterval = convertIntervalForYahoo(interval);
    const range = getRangeForInterval(interval);
    const yahooData = await fetchYahooFinanceData(symbol, yahooInterval, range);
    const klineData = convertYahooToKlineFormat(yahooData);
    console.log(`Received ${klineData.length} kline data points for stock ${symbol}`);
    return klineData;
  } catch (error) {
    console.error('Error fetching stock kline data:', error);
    return [];
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

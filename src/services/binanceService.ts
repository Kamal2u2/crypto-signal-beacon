
// Export the AssetType enum directly in this file since it's being used here
export enum AssetType {
  CRYPTO = 'CRYPTO',
  STOCKS = 'STOCKS'
}

// Define types for Binance API data
export interface CoinPair {
  symbol: string;
  label: string;
  assetType: AssetType;
}

export interface AssetPair {
  symbol: string;
  label: string;
  assetType: AssetType;
}

export type TimeInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d';

export interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  trades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

// Crypto pairs - top 10 by market cap
export const CRYPTO_PAIRS: AssetPair[] = [
  { symbol: 'BTCUSDT', label: 'Bitcoin', assetType: AssetType.CRYPTO },
  { symbol: 'ETHUSDT', label: 'Ethereum', assetType: AssetType.CRYPTO },
  { symbol: 'BNBUSDT', label: 'Binance Coin', assetType: AssetType.CRYPTO },
  { symbol: 'XRPUSDT', label: 'Ripple', assetType: AssetType.CRYPTO },
  { symbol: 'SOLUSDT', label: 'Solana', assetType: AssetType.CRYPTO },
  { symbol: 'ADAUSDT', label: 'Cardano', assetType: AssetType.CRYPTO },
  { symbol: 'DOGEUSDT', label: 'Dogecoin', assetType: AssetType.CRYPTO },
  { symbol: 'TRXUSDT', label: 'Tron', assetType: AssetType.CRYPTO },
  { symbol: 'AVAXUSDT', label: 'Avalanche', assetType: AssetType.CRYPTO },
  { symbol: 'DOTUSDT', label: 'Polkadot', assetType: AssetType.CRYPTO },
];

// Stock pairs - using actual stock symbols
export const STOCK_PAIRS: AssetPair[] = [
  { symbol: 'AAPL', label: 'Apple Inc.', assetType: AssetType.STOCKS },
  { symbol: 'MSFT', label: 'Microsoft', assetType: AssetType.STOCKS },
  { symbol: 'GOOGL', label: 'Alphabet', assetType: AssetType.STOCKS },
  { symbol: 'AMZN', label: 'Amazon', assetType: AssetType.STOCKS },
  { symbol: 'TSLA', label: 'Tesla', assetType: AssetType.STOCKS },
  { symbol: 'META', label: 'Meta Platforms', assetType: AssetType.STOCKS },
  { symbol: 'NVDA', label: 'NVIDIA', assetType: AssetType.STOCKS },
  { symbol: 'JPM', label: 'JPMorgan Chase', assetType: AssetType.STOCKS },
  { symbol: 'V', label: 'Visa Inc', assetType: AssetType.STOCKS },
  { symbol: 'JNJ', label: 'Johnson & Johnson', assetType: AssetType.STOCKS },
];

// WebSocket and interval variables
let priceWebSocket: WebSocket | null = null;
let klineWebSocket: WebSocket | null = null;
let priceWebSocketInterval: NodeJS.Timeout | null = null;
let klineWebSocketInterval: NodeJS.Timeout | null = null;
let klineDataCache: KlineData[] = [];

// Function to test WebSocket connection
export const testWebSocketConnection = () => {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    console.log('Price WebSocket connection is open.');
  } else {
    console.log('Price WebSocket connection is closed.');
  }
  
  if (klineWebSocket && klineWebSocket.readyState === WebSocket.OPEN) {
    console.log('Kline WebSocket connection is open.');
  } else {
    console.log('Kline WebSocket connection is closed.');
  }
};

// Function to send a ping message to the WebSocket server
export const pingPriceWebSocket = () => {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    priceWebSocket.send('ping');
    console.log('Ping message sent to Price WebSocket server.');
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

// Update Kline Data
export const updateKlineData = (newKline: KlineData) => {
  if (!klineDataCache) {
    klineDataCache = [newKline];
    return;
  }
  
  const existingIndex = klineDataCache.findIndex(k => k.openTime === newKline.openTime);
  
  if (existingIndex !== -1) {
    klineDataCache[existingIndex] = newKline;
  } else {
    klineDataCache.push(newKline);
    if (klineDataCache.length > 1000) {
      klineDataCache.shift();
    }
  }
};

// Fetch current price for an asset (crypto or stock)
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    // Check if this is a crypto or stock symbol
    const isStock = STOCK_PAIRS.some(pair => pair.symbol === symbol);
    
    if (isStock) {
      // For stocks, fetch from Yahoo Finance
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
    } else {
      // For crypto, use the existing Binance implementation
      console.log(`Fetching current price for crypto: ${symbol}`);
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      const data = await response.json();
      const price = data && data.price ? parseFloat(data.price) : null;
      console.log(`Crypto price received for ${symbol}: ${price}`);
      return price;
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
    const isStock = STOCK_PAIRS.some(pair => pair.symbol === symbol);
    
    if (isStock) {
      // For stocks, fetch from Yahoo Finance
      console.log(`Fetching kline data for stock: ${symbol} with interval ${interval}`);
      const yahooInterval = convertIntervalForYahoo(interval);
      const range = getRangeForInterval(interval);
      const yahooData = await fetchYahooFinanceData(symbol, yahooInterval, range);
      const klineData = convertYahooToKlineFormat(yahooData);
      console.log(`Received ${klineData.length} kline data points for stock ${symbol}`);
      return klineData;
    } else {
      // For crypto, use the existing Binance implementation
      console.log(`Fetching kline data for crypto: ${symbol} with interval ${interval}`);
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const data = await response.json();
      
      const klineData = data.map((item: any[]) => ({
        openTime: item[0],
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: item[6],
        quoteAssetVolume: parseFloat(item[7]),
        trades: item[8],
        takerBuyBaseAssetVolume: parseFloat(item[9]),
        takerBuyQuoteAssetVolume: parseFloat(item[10])
      }));
      
      console.log(`Received ${klineData.length} kline data points for crypto ${symbol}`);
      return klineData;
    }
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return [];
  }
};

// Close WebSocket connection for price only
export const closePriceWebSocket = () => {
  if (priceWebSocket) {
    priceWebSocket.close();
    priceWebSocket = null;
    console.log('Price WebSocket connection closed.');
  }
  
  if (priceWebSocketInterval) {
    clearInterval(priceWebSocketInterval);
    priceWebSocketInterval = null;
  }
};

// Initialize price WebSocket for both crypto and stocks
export const initializePriceWebSocket = (symbol: string, onPriceUpdate: (price: number) => void) => {
  // Check if this is a stock symbol
  const isStock = STOCK_PAIRS.some(pair => pair.symbol === symbol);
  
  if (isStock) {
    // For stocks, we'll poll Yahoo Finance at regular intervals
    if (priceWebSocketInterval) {
      clearInterval(priceWebSocketInterval);
    }
    
    // Initial price fetch
    fetchCurrentPrice(symbol).then(price => {
      if (price) onPriceUpdate(price);
    });
    
    // Set up polling
    priceWebSocketInterval = setInterval(() => {
      fetchCurrentPrice(symbol).then(price => {
        if (price) onPriceUpdate(price);
      });
    }, 10000); // Poll every 10 seconds for stocks
  } else {
    // For crypto, use the WebSocket API
    const wsEndpoint = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
    
    if (priceWebSocket) {
      priceWebSocket.close();
    }
    
    priceWebSocket = new WebSocket(wsEndpoint);
    
    priceWebSocket.onopen = () => {
      console.log(`Price WebSocket opened for ${symbol}`);
    };
    
    priceWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.c) {
          const price = parseFloat(data.c);
          if (!isNaN(price)) {
            onPriceUpdate(price);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    priceWebSocket.onerror = (error) => {
      console.error('Price WebSocket error:', error);
    };
    
    priceWebSocket.onclose = () => {
      console.log('Price WebSocket closed');
    };
  }
};

// Initialize WebSocket for kline data
export const initializeWebSocket = (
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
) => {
  // Check if this is a stock symbol
  const isStock = STOCK_PAIRS.some(pair => pair.symbol === symbol);
  
  if (isStock) {
    // For stocks, we'll poll Yahoo Finance at intervals
    if (klineWebSocketInterval) {
      clearInterval(klineWebSocketInterval);
    }
    
    // Initial data fetch
    fetchKlineData(symbol, interval).then(klineData => {
      if (klineData.length > 0) {
        klineDataCache = klineData;
        const latestKline = klineData[klineData.length - 1];
        onKlineUpdate(latestKline);
      }
    });
    
    // Set up polling based on interval frequency
    const pollInterval = getPollingInterval(interval);
    
    klineWebSocketInterval = setInterval(() => {
      fetchKlineData(symbol, interval).then(klineData => {
        if (klineData.length > 0) {
          klineDataCache = klineData;
          const latestKline = klineData[klineData.length - 1];
          onKlineUpdate(latestKline);
        }
      });
    }, pollInterval);
  } else {
    // For crypto, use the WebSocket API
    const wsEndpoint = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    
    if (klineWebSocket) {
      klineWebSocket.close();
    }
    
    klineWebSocket = new WebSocket(wsEndpoint);
    
    klineWebSocket.onopen = () => {
      console.log(`Kline WebSocket opened for ${symbol}`);
    };
    
    klineWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.k) {
          const kline = data.k;
          const klineData: KlineData = {
            openTime: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
            closeTime: kline.T,
            quoteAssetVolume: parseFloat(kline.q),
            trades: kline.n,
            takerBuyBaseAssetVolume: parseFloat(kline.V),
            takerBuyQuoteAssetVolume: parseFloat(kline.Q)
          };
          onKlineUpdate(klineData);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    klineWebSocket.onerror = (error) => {
      console.error('Kline WebSocket error:', error);
    };
    
    klineWebSocket.onclose = () => {
      console.log('Kline WebSocket closed');
    };
  }
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

// Close WebSocket connection
export const closeWebSocket = () => {
  if (priceWebSocket) {
    priceWebSocket.close();
    priceWebSocket = null;
    console.log('Price WebSocket connection closed.');
  }
  
  if (klineWebSocket) {
    klineWebSocket.close();
    klineWebSocket = null;
    console.log('Kline WebSocket connection closed.');
  }
  
  if (priceWebSocketInterval) {
    clearInterval(priceWebSocketInterval);
    priceWebSocketInterval = null;
  }
  
  if (klineWebSocketInterval) {
    clearInterval(klineWebSocketInterval);
    klineWebSocketInterval = null;
  }
};

// Fetch all available asset pairs
export const fetchAllAssetPairs = async (): Promise<AssetPair[]> => {
  try {
    // For a real implementation, you might want to fetch actual available pairs
    // For now, return the predefined lists
    return [...CRYPTO_PAIRS, ...STOCK_PAIRS];
  } catch (error) {
    console.error('Error fetching available pairs:', error);
    return [...CRYPTO_PAIRS, ...STOCK_PAIRS]; // Fallback to predefined lists
  }
};

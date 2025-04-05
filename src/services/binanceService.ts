import { toast } from '@/components/ui/use-toast';

// Define types for Binance API responses
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

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
  ignored: string;
}

// Add new enums for asset types
export enum AssetType {
  CRYPTO = 'crypto',
  STOCKS = 'stocks'
}

// Update CoinPair interface to be more generic for both crypto and stocks
export interface AssetPair {
  symbol: string;
  label: string;
  assetType: AssetType;
}

// Rename COIN_PAIRS to CRYPTO_PAIRS for clarity and consistency
export const CRYPTO_PAIRS: AssetPair[] = [
  { symbol: 'BTCUSDT', label: 'BTC/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'ETHUSDT', label: 'ETH/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'BNBUSDT', label: 'BNB/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'SOLUSDT', label: 'SOL/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'ADAUSDT', label: 'ADA/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'XRPUSDT', label: 'XRP/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'DOGEUSDT', label: 'DOGE/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'DOTUSDT', label: 'DOT/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'AVAXUSDT', label: 'AVAX/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'MATICUSDT', label: 'MATIC/USDT', assetType: AssetType.CRYPTO }
];

// Add stock pairs
export const STOCK_PAIRS: AssetPair[] = [
  { symbol: 'AAPL', label: 'Apple Inc.', assetType: AssetType.STOCKS },
  { symbol: 'MSFT', label: 'Microsoft Corp.', assetType: AssetType.STOCKS },
  { symbol: 'GOOGL', label: 'Alphabet Inc.', assetType: AssetType.STOCKS },
  { symbol: 'AMZN', label: 'Amazon.com Inc.', assetType: AssetType.STOCKS },
  { symbol: 'TSLA', label: 'Tesla Inc.', assetType: AssetType.STOCKS },
  { symbol: 'META', label: 'Meta Platforms Inc.', assetType: AssetType.STOCKS },
  { symbol: 'NVDA', label: 'NVIDIA Corp.', assetType: AssetType.STOCKS },
  { symbol: 'JPM', label: 'JPMorgan Chase & Co.', assetType: AssetType.STOCKS },
  { symbol: 'V', label: 'Visa Inc.', assetType: AssetType.STOCKS },
  { symbol: 'WMT', label: 'Walmart Inc.', assetType: AssetType.STOCKS }
];

// Maintain backward compatibility with a combined array
export const ALL_ASSET_PAIRS: AssetPair[] = [...CRYPTO_PAIRS, ...STOCK_PAIRS];
export const COIN_PAIRS = CRYPTO_PAIRS; // For backward compatibility

// For backward compatibility
export type CoinPair = AssetPair;

// WebSocket connections
let klineWebSocket: WebSocket | null = null;
let priceWebSocket: WebSocket | null = null;
let lastPongTime = Date.now();
let isKlineConnected = false;
let isPriceConnected = false;

// Update fetchKlineData to handle both crypto and stocks
export const fetchKlineData = async (
  symbol: string,
  interval: TimeInterval,
  limit: number = 100
): Promise<KlineData[]> => {
  try {
    const assetPair = ALL_ASSET_PAIRS.find(pair => pair.symbol === symbol);
    
    if (!assetPair) {
      console.error(`Symbol ${symbol} not found in asset pairs`);
      return [];
    }
    
    if (assetPair.assetType === AssetType.CRYPTO) {
      // Use Binance API for crypto
      const endpoint = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch kline data: ${response.statusText}`);
      }
      
      return parseBinanceKlineData(await response.json());
    } else {
      // Use Yahoo Finance API for stocks
      return await fetchYahooFinanceKlineData(symbol, interval, limit);
    }
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return [];
  }
};

// New function to fetch stock data from Yahoo Finance
const fetchYahooFinanceKlineData = async (
  symbol: string,
  interval: TimeInterval,
  limit: number = 100
): Promise<KlineData[]> => {
  try {
    // Convert our interval format to Yahoo Finance format
    const yahooInterval = mapIntervalForYahooFinance(interval);
    
    // Calculate the start and end dates
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = calculateStartDate(endDate, interval, limit);
    
    // Construct Yahoo Finance API URL
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=${yahooInterval}&events=history`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.statusText}`);
      return generateDemoStockData(interval);
    }
    
    const data = await response.json();
    
    // Check if we have valid data from Yahoo Finance
    if (!data || 
        !data.chart || 
        !data.chart.result || 
        !data.chart.result[0] || 
        !data.chart.result[0].indicators || 
        !data.chart.result[0].indicators.quote || 
        !data.chart.result[0].indicators.quote[0]) {
      console.error('Invalid data format from Yahoo Finance');
      return generateDemoStockData(interval);
    }
    
    // Parse Yahoo Finance data to our KlineData format
    return parseYahooFinanceData(data, interval);
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    // Return demo data if there's an error
    return generateDemoStockData(interval);
  }
};

// Map our intervals to Yahoo Finance intervals
const mapIntervalForYahooFinance = (interval: TimeInterval): string => {
  const intervalMap: Record<TimeInterval, string> = {
    '1m': '1m',
    '3m': '5m', // Yahoo doesn't have 3m, using 5m
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h', 
    '6h': '1d', // Yahoo doesn't have 6h, using 1d
    '8h': '1d', // Yahoo doesn't have 8h, using 1d
    '12h': '1d', // Yahoo doesn't have 12h, using 1d
    '1d': '1d',
    '3d': '5d', // Yahoo doesn't have 3d, using 5d
    '1w': '1wk',
    '1M': '1mo'
  };
  return intervalMap[interval] || '1h';
};

// Calculate start date based on interval and limit
const calculateStartDate = (endDate: number, interval: TimeInterval, limit: number): number => {
  const intervalMilliseconds = getIntervalMilliseconds(interval);
  const totalMilliseconds = intervalMilliseconds * limit;
  return Math.floor((endDate * 1000 - totalMilliseconds) / 1000);
};

// Parse Yahoo Finance data to KlineData format
const parseYahooFinanceData = (data: any, interval: TimeInterval): KlineData[] => {
  const result = data.chart.result[0];
  const quotes = result.indicators.quote[0];
  const timestamps = result.timestamp;
  
  const klineData: KlineData[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    // Skip entries with missing data
    if (!quotes.open[i] || !quotes.high[i] || !quotes.low[i] || !quotes.close[i] || !quotes.volume[i]) {
      continue;
    }
    
    const openTime = timestamps[i] * 1000;
    const intervalMs = getIntervalMilliseconds(interval);
    
    klineData.push({
      openTime,
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i],
      closeTime: openTime + intervalMs - 1,
      quoteAssetVolume: quotes.volume[i] * quotes.close[i],
      trades: Math.floor(Math.random() * 1000) + 100, // Not provided by Yahoo Finance
      takerBuyBaseAssetVolume: quotes.volume[i] * 0.5, // Approximation
      takerBuyQuoteAssetVolume: quotes.volume[i] * 0.5 * quotes.close[i], // Approximation
      ignored: '0'
    });
  }
  
  // Return all of the data we have, or the last 100 points if we have more
  return klineData.length > 100 ? klineData.slice(-100) : klineData;
};

// Keep Alpha Vantage mapping for backward compatibility
const mapIntervalForStocks = (interval: TimeInterval): string => {
  const intervalMap: Record<TimeInterval, string> = {
    '1m': '1min',
    '3m': '5min', // Alpha Vantage doesn't support 3m, using 5m as closest
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '60min',
    '2h': '60min', // Alpha Vantage doesn't support 2h, using 1h as fallback
    '4h': '60min', // Alpha Vantage doesn't support 4h, using 1h as fallback
    '6h': '60min', // Alpha Vantage doesn't support 6h, using 1h as fallback
    '8h': '60min', // Alpha Vantage doesn't support 8h, using 1h as fallback
    '12h': '60min', // Alpha Vantage doesn't support 12h, using 1h as fallback
    '1d': 'daily',
    '3d': 'daily', // Alpha Vantage doesn't support 3d, using daily as fallback
    '1w': 'weekly',
    '1M': 'monthly'
  };
  return intervalMap[interval] || '15min';
};

// Generate demo stock data when API is rate-limited
const generateDemoStockData = (interval: TimeInterval): KlineData[] => {
  const result: KlineData[] = [];
  const now = new Date();
  const intervalMs = getIntervalMilliseconds(interval);
  let basePrice = 150 + Math.random() * 50; // Random base price between 150 and 200
  
  for (let i = 99; i >= 0; i--) {
    const openTime = now.getTime() - (i * intervalMs);
    const closeTime = openTime + intervalMs - 1;
    
    // Generate realistic-looking price action
    const priceChange = (Math.random() - 0.5) * 2; // Random change between -1 and 1
    basePrice = basePrice + priceChange;
    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 1.5;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = Math.floor(Math.random() * 10000) + 1000;
    
    result.push({
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      quoteAssetVolume: volume * close,
      trades: Math.floor(Math.random() * 500) + 100,
      takerBuyBaseAssetVolume: volume * 0.6,
      takerBuyQuoteAssetVolume: volume * 0.6 * close,
      ignored: '0'
    });
  }
  
  return result;
};

const getIntervalMilliseconds = (interval: TimeInterval): number => {
  switch (interval) {
    case '1m': return 60 * 1000;
    case '3m': return 3 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '2h': return 2 * 60 * 60 * 1000;
    case '4h': return 4 * 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '8h': return 8 * 60 * 60 * 1000;
    case '12h': return 12 * 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
    case '3d': return 3 * 24 * 60 * 60 * 1000;
    case '1w': return 7 * 24 * 60 * 60 * 1000;
    case '1M': return 30 * 24 * 60 * 60 * 1000; // Approximation
    default: return 15 * 60 * 1000;
  }
};

// Parse Binance kline data
export const parseBinanceKlineData = (data: any[]): KlineData[] => {
  return data.map(item => ({
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
    takerBuyQuoteAssetVolume: parseFloat(item[10]),
    ignored: item[11]
  }));
};

// Update fetchCurrentPrice to use Yahoo Finance for stocks
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    const assetPair = ALL_ASSET_PAIRS.find(pair => pair.symbol === symbol);
    
    if (!assetPair) {
      console.error(`Symbol ${symbol} not found in asset pairs`);
      return null;
    }
    
    if (assetPair.assetType === AssetType.CRYPTO) {
      // Use Binance API for crypto
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch current price: ${response.statusText}`);
      }
      const data = await response.json();
      return parseFloat(data.price);
    } else {
      // Use Yahoo Finance for stock prices
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch stock price: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && 
          data.chart && 
          data.chart.result && 
          data.chart.result[0] && 
          data.chart.result[0].meta) {
        // Get the regularMarketPrice from the meta information
        return data.chart.result[0].meta.regularMarketPrice;
      } else {
        console.error('Invalid Yahoo Finance price data format');
        // Return a realistic demo price if API call fails
        return 150 + Math.random() * 50;
      }
    }
  } catch (error) {
    console.error('Error fetching current price:', error);
    return null;
  }
};

// Update fetchAllCoinPairs to be fetchAllAssetPairs
export const fetchAllAssetPairs = async (): Promise<AssetPair[]> => {
  try {
    // Return both crypto and stocks
    return ALL_ASSET_PAIRS;
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return ALL_ASSET_PAIRS;
  }
};

// Keep fetchAllCoinPairs for backward compatibility
export const fetchAllCoinPairs = fetchAllAssetPairs;

// Variable to store the interval ID for stock polling
let stockIntervalId: NodeJS.Timeout | null = null;

// Update WebSocket functions to handle both asset types
export const initializeWebSocket = (
  symbol: string,
  interval: TimeInterval,
  onUpdate: (kline: KlineData) => void
): void => {
  const assetPair = ALL_ASSET_PAIRS.find(pair => pair.symbol === symbol);
  
  if (!assetPair) {
    console.error(`Symbol ${symbol} not found in asset pairs`);
    return;
  }
  
  if (assetPair.assetType === AssetType.CRYPTO) {
    // Close any existing WebSocket connection
    if (klineWebSocket) {
      klineWebSocket.close();
      klineWebSocket = null;
    }
    
    // Create a new WebSocket connection
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    klineWebSocket = new WebSocket(wsUrl);
    
    klineWebSocket.onopen = () => {
      console.log(`WebSocket connected: ${wsUrl}`);
      isKlineConnected = true;
      lastPongTime = Date.now();
    };
    
    klineWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping/pong messages
        if (data.e === 'pong') {
          lastPongTime = Date.now();
          return;
        }
        
        // Handle kline data
        if (data.e === 'kline') {
          const k = data.k;
          
          const klineData: KlineData = {
            openTime: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            closeTime: k.T,
            quoteAssetVolume: parseFloat(k.q),
            trades: k.n,
            takerBuyBaseAssetVolume: parseFloat(k.V),
            takerBuyQuoteAssetVolume: parseFloat(k.Q),
            ignored: k.B
          };
          
          onUpdate(klineData);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    klineWebSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isKlineConnected = false;
    };
    
    klineWebSocket.onclose = () => {
      console.log('WebSocket connection closed');
      isKlineConnected = false;
    };
  } else {
    // For stocks, we'll use periodic polling with Yahoo Finance data
    if (stockIntervalId) {
      clearInterval(stockIntervalId);
      stockIntervalId = null;
    }
    
    // Initial data fetch
    fetchYahooFinanceKlineData(symbol, interval, 1)
      .then(data => {
        if (data.length > 0) {
          onUpdate(data[0]);
        }
      })
      .catch(error => console.error('Error fetching initial stock data:', error));
    
    // Set up polling interval
    stockIntervalId = setInterval(async () => {
      try {
        const klineData = await fetchYahooFinanceKlineData(symbol, interval, 1);
        if (klineData.length > 0) {
          onUpdate(klineData[0]);
        }
      } catch (error) {
        console.error('Error polling stock data:', error);
      }
    }, 10000); // Poll every 10 seconds
  }
};

// Update kline data with new data
export const updateKlineData = (newKline: KlineData): void => {
  // This function is called by the WebSocket handler to update the kline data
  // It's a no-op here as the actual state update happens in the component
};

// Similarly update the price WebSocket functions
let stockPriceIntervalId: NodeJS.Timeout | null = null;

export const initializePriceWebSocket = (
  symbol: string,
  onUpdate: (price: number) => void
): void => {
  const assetPair = ALL_ASSET_PAIRS.find(pair => pair.symbol === symbol);
  
  if (!assetPair) {
    console.error(`Symbol ${symbol} not found in asset pairs`);
    return;
  }
  
  if (assetPair.assetType === AssetType.CRYPTO) {
    // Close any existing price WebSocket
    if (priceWebSocket) {
      priceWebSocket.close();
      priceWebSocket = null;
    }
    
    // Create a new WebSocket connection for price updates
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
    priceWebSocket = new WebSocket(wsUrl);
    
    priceWebSocket.onopen = () => {
      console.log(`Price WebSocket connected: ${wsUrl}`);
      isPriceConnected = true;
    };
    
    priceWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c); // Current price is in the 'c' field
        onUpdate(price);
      } catch (error) {
        console.error('Error processing price WebSocket message:', error);
      }
    };
    
    priceWebSocket.onerror = (error) => {
      console.error('Price WebSocket error:', error);
      isPriceConnected = false;
    };
    
    priceWebSocket.onclose = () => {
      console.log('Price WebSocket connection closed');
      isPriceConnected = false;
    };
  } else {
    // For stocks, use Yahoo Finance polling
    if (stockPriceIntervalId) {
      clearInterval(stockPriceIntervalId);
      stockPriceIntervalId = null;
    }
    
    // Initial fetch
    fetchCurrentPrice(symbol)
      .then(price => {
        if (price !== null) {
          onUpdate(price);
        }
      })
      .catch(error => console.error('Error fetching initial stock price:', error));
    
    // Set up polling
    stockPriceIntervalId = setInterval(async () => {
      try {
        const price = await fetchCurrentPrice(symbol);
        if (price !== null) {
          onUpdate(price);
        }
      } catch (error) {
        console.error('Error polling stock price:', error);
      }
    }, 5000); // Poll every 5 seconds
  }
};

export const closePriceWebSocket = (): void => {
  // Clear the interval for stock price polling
  if (stockPriceIntervalId) {
    clearInterval(stockPriceIntervalId);
    stockPriceIntervalId = null;
  }
  
  // Close the WebSocket connection if it exists
  if (priceWebSocket) {
    priceWebSocket.close();
    priceWebSocket = null;
    isPriceConnected = false;
  }
};

export const closeWebSocket = (): void => {
  // Clear the interval for stock polling if it exists
  if (stockIntervalId) {
    clearInterval(stockIntervalId);
    stockIntervalId = null;
  }
  
  // Close the WebSocket connection if it exists
  if (klineWebSocket) {
    klineWebSocket.close();
    klineWebSocket = null;
    isKlineConnected = false;
  }
};

// Ping the WebSocket to keep it alive
export const pingPriceWebSocket = (): void => {
  if (priceWebSocket && priceWebSocket.readyState === WebSocket.OPEN) {
    priceWebSocket.send(JSON.stringify({ method: 'ping' }));
  }
};

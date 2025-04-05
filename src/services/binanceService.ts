import { toast } from '@/components/ui/use-toast';

// Define types for Binance API responses
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

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
  { symbol: 'BTCUSDT', label: 'Bitcoin', assetType: AssetType.CRYPTO },
  { symbol: 'ETHUSDT', label: 'Ethereum', assetType: AssetType.CRYPTO },
  { symbol: 'BNBUSDT', label: 'Binance Coin', assetType: AssetType.CRYPTO },
  { symbol: 'SOLUSDT', label: 'Solana', assetType: AssetType.CRYPTO },
  { symbol: 'ADAUSDT', label: 'Cardano', assetType: AssetType.CRYPTO },
  { symbol: 'XRPUSDT', label: 'Ripple', assetType: AssetType.CRYPTO },
  { symbol: 'DOGEUSDT', label: 'Dogecoin', assetType: AssetType.CRYPTO },
  { symbol: 'DOTUSDT', label: 'Polkadot', assetType: AssetType.CRYPTO },
  { symbol: 'AVAXUSDT', label: 'Avalanche', assetType: AssetType.CRYPTO },
  { symbol: 'MATICUSDT', label: 'Polygon', assetType: AssetType.CRYPTO }
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
    let endpoint;
    
    if (!assetPair) {
      console.error(`Symbol ${symbol} not found in asset pairs`);
      return [];
    }
    
    if (assetPair.assetType === AssetType.CRYPTO) {
      endpoint = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    } else {
      // For stocks, we'll use a different API endpoint (Alpha Vantage as an example)
      // Note: In a real implementation, you'd need to sign up for an Alpha Vantage API key
      endpoint = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${mapIntervalForStocks(interval)}&outputsize=full&apikey=demo`;
    }
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch kline data: ${response.statusText}`);
    }
    
    if (assetPair.assetType === AssetType.CRYPTO) {
      return parseBinanceKlineData(await response.json());
    } else {
      return parseStockKlineData(await response.json(), interval);
    }
  } catch (error) {
    console.error('Error fetching kline data:', error);
    return [];
  }
};

// Map Binance intervals to Alpha Vantage intervals
const mapIntervalForStocks = (interval: TimeInterval): string => {
  const intervalMap: Record<TimeInterval, string> = {
    '1m': '1min',
    '3m': '5min', // Alpha Vantage doesn't support 3m, using 5m as closest
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '60min',
    '4h': '60min', // Alpha Vantage doesn't support 4h, using 1h as fallback
    '1d': 'daily'
  };
  return intervalMap[interval] || '15min';
};

// Parse Alpha Vantage JSON response into our KlineData format
const parseStockKlineData = (data: any, interval: TimeInterval): KlineData[] => {
  // Handle API rate limit or errors
  if (data['Error Message'] || data['Note']) {
    console.error('Alpha Vantage API error or limit:', data['Error Message'] || data['Note']);
    return [];
  }
  
  // Get the correct time series key based on interval
  let timeSeriesKey = 'Time Series (15min)';
  if (interval === '1m') timeSeriesKey = 'Time Series (1min)';
  else if (interval === '5m') timeSeriesKey = 'Time Series (5min)';
  else if (interval === '15m') timeSeriesKey = 'Time Series (15min)';
  else if (interval === '30m') timeSeriesKey = 'Time Series (30min)';
  else if (interval === '1h') timeSeriesKey = 'Time Series (60min)';
  else if (interval === '1d') timeSeriesKey = 'Time Series (Daily)';
  
  // Use demo data if API call failed or was rate-limited
  if (!data[timeSeriesKey]) {
    return generateDemoStockData(interval);
  }
  
  const timeSeries = data[timeSeriesKey];
  const timestamps = Object.keys(timeSeries).sort();
  
  return timestamps.map(timestamp => {
    const candle = timeSeries[timestamp];
    const time = new Date(timestamp).getTime();
    
    return {
      openTime: time,
      open: parseFloat(candle['1. open']),
      high: parseFloat(candle['2. high']),
      low: parseFloat(candle['3. low']),
      close: parseFloat(candle['4. close']),
      volume: parseFloat(candle['5. volume']),
      closeTime: time + getIntervalMilliseconds(interval) - 1,
      quoteAssetVolume: parseFloat(candle['5. volume']) * parseFloat(candle['4. close']),
      trades: Math.floor(Math.random() * 1000) + 500, // Not provided by Alpha Vantage
      takerBuyBaseAssetVolume: 0, // Not provided by Alpha Vantage
      takerBuyQuoteAssetVolume: 0, // Not provided by Alpha Vantage
      ignored: '0'
    };
  }).slice(-100); // Take the most recent 100 candles
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
    case '4h': return 4 * 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
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

// Update fetchCurrentPrice to handle both crypto and stocks
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    const assetPair = ALL_ASSET_PAIRS.find(pair => pair.symbol === symbol);
    
    if (!assetPair) {
      console.error(`Symbol ${symbol} not found in asset pairs`);
      return null;
    }
    
    if (assetPair.assetType === AssetType.CRYPTO) {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch current price: ${response.statusText}`);
      }
      const data = await response.json();
      return parseFloat(data.price);
    } else {
      // For stocks, we'll use Alpha Vantage's quote endpoint
      const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock price: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if we hit API rate limits
      if (data['Note'] || !data['Global Quote'] || !data['Global Quote']['05. price']) {
        // Return a realistic demo price if API call fails
        return 150 + Math.random() * 50; // Random price between 150 and 200
      }
      
      return parseFloat(data['Global Quote']['05. price']);
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
    // For stocks, we'll use periodic polling instead of WebSockets
    // since most stock APIs don't offer WebSocket connections in free tiers
    stockIntervalId = setInterval(async () => {
      try {
        const klineData = await fetchKlineData(symbol, interval, 1);
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
    // For stocks, use polling
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

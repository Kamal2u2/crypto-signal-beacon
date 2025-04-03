import { toast } from "@/components/ui/use-toast";

// Base URL for Binance API
const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';

// Valid time intervals supported by Binance
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

// CoinPair type for supported trading pairs
export type CoinPair = {
  symbol: string;  // Binance symbol format (e.g., BTCUSDT)
  label: string;   // Human-readable format (e.g., BTC/USDT)
};

// Default coin pairs (shown initially)
export const COIN_PAIRS: CoinPair[] = [
  { symbol: 'BTCUSDT', label: 'BTC/USDT' },
  { symbol: 'ETHUSDT', label: 'ETH/USDT' },
  { symbol: 'BNBUSDT', label: 'BNB/USDT' },
  { symbol: 'ADAUSDT', label: 'ADA/USDT' },
  { symbol: 'SOLUSDT', label: 'SOL/USDT' },
  { symbol: 'XRPUSDT', label: 'XRP/USDT' },
  { symbol: 'DOGEUSDT', label: 'DOGE/USDT' },
  { symbol: 'DOTUSDT', label: 'DOT/USDT' }
];

// Kline (candlestick) data format
export interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
}

// Determine the appropriate limit based on time interval
export function getDataLimitForTimeframe(interval: TimeInterval): number {
  switch(interval) {
    case '1m':
      return 1000; // Approximately 16 hours of 1-minute data
    case '3m':
      return 1000; // Approximately 2 days of 3-minute data
    case '5m':
      return 950; // Approximately 3 days of 5-minute data
    case '15m':
      return 600; // Approximately 6 days of 15-minute data
    case '30m':
      return 480; // Approximately 10 days of 30-minute data
    case '1h':
      return 720; // Approximately 30 days of hourly data
    case '4h':
      return 500; // Approximately 83 days of 4-hour data
    case '1d':
      return 365; // Approximately 1 year of daily data
    default:
      return 100; // Default fallback
  }
}

// WebSocket base URL for Binance
const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';

let websocket: WebSocket | null = null;
let lastKlineData: KlineData[] = [];
let activeSubscriptions: Set<string> = new Set();
let priceWebsocket: WebSocket | null = null;
let activePriceSymbol: string | null = null;

// Track connection state and retry attempts
let wsRetryCount = 0;
let priceWsRetryCount = 0;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAY = 2000; // Start with 2 seconds
let isReconnecting = false;
let isPriceReconnecting = false;

// Connection timeout tracking
let connectionTimeoutId: NodeJS.Timeout | null = null;
let priceConnectionTimeoutId: NodeJS.Timeout | null = null;
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Function to initialize WebSocket connection for kline data
export function initializeWebSocket(
  symbol: string, 
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
): void {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    closeWebSocket();
  }

  try {
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    if (isReconnecting) {
      console.log(`Already attempting to reconnect kline WebSocket. Skipping new connection request.`);
      return;
    }
    
    // Set timeout for connection establishment
    if (connectionTimeoutId) clearTimeout(connectionTimeoutId);
    connectionTimeoutId = setTimeout(() => {
      if (websocket && websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket connection timeout');
        websocket.close();
        websocket = null;
        
        // If still not connected after timeout, try again
        if (!isReconnecting) {
          retryWebSocketConnection(symbol, interval, onKlineUpdate);
        }
      }
    }, CONNECTION_TIMEOUT);
    
    console.log(`Initializing kline WebSocket for ${symbol} at ${interval} interval`);
    websocket = new WebSocket(`${BINANCE_WS_BASE_URL}/${streamName}`);
    
    websocket.onopen = () => {
      console.log('Kline WebSocket connection established');
      activeSubscriptions.add(streamName);
      wsRetryCount = 0; // Reset retry counter on successful connection
      isReconnecting = false;
      
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === 'kline') {
          const kline = transformWebSocketKline(data.k);
          onKlineUpdate(kline);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      
      if (!isReconnecting) {
        retryWebSocketConnection(symbol, interval, onKlineUpdate);
      }
    };

    websocket.onclose = (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      
      // Only attempt to reconnect if it was a valid stream and not manually closed
      if (activeSubscriptions.has(streamName) && !isReconnecting) {
        retryWebSocketConnection(symbol, interval, onKlineUpdate);
      }
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    isReconnecting = false;
    
    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
      connectionTimeoutId = null;
    }
    
    // Still try to reconnect on initialization error
    if (!isReconnecting) {
      retryWebSocketConnection(symbol, interval, onKlineUpdate);
    }
  }
}

// Function to retry WebSocket connection with exponential backoff
function retryWebSocketConnection(
  symbol: string,
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
): void {
  if (isReconnecting) return;
  isReconnecting = true;
  
  if (wsRetryCount >= MAX_RETRY_COUNT) {
    console.error(`Maximum retry attempts (${MAX_RETRY_COUNT}) reached for WebSocket connection.`);
    toast({
      title: "Connection Error",
      description: "Failed to connect to Binance. Please check your internet connection and refresh the page.",
      variant: "destructive"
    });
    isReconnecting = false;
    return;
  }
  
  // Calculate delay with exponential backoff (2^n * base_delay)
  const delay = Math.min(30000, RETRY_DELAY * Math.pow(2, wsRetryCount));
  wsRetryCount++;
  
  console.log(`Retrying WebSocket connection in ${delay}ms (attempt ${wsRetryCount}/${MAX_RETRY_COUNT})...`);
  
  setTimeout(() => {
    if (activeSubscriptions.size > 0) {
      console.log('Attempting to reconnect WebSocket...');
      initializeWebSocket(symbol, interval, onKlineUpdate);
    } else {
      isReconnecting = false;
    }
  }, delay);
}

// Function to initialize WebSocket connection for price ticker with improved reliability
export function initializePriceWebSocket(
  symbol: string,
  onPriceUpdate: (price: number) => void
): void {
  if (priceWebsocket && priceWebsocket.readyState === WebSocket.OPEN && activePriceSymbol === symbol) {
    console.log(`Price WebSocket for ${symbol} already connected and open`);
    return;
  }
  
  if (priceWebsocket) {
    console.log(`Closing existing price WebSocket before creating new one`);
    closePriceWebSocket();
  }
  
  try {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    if (isPriceReconnecting) {
      console.log(`Already attempting to reconnect price WebSocket. Skipping new connection request.`);
      return;
    }
    
    // Set timeout for connection establishment
    if (priceConnectionTimeoutId) clearTimeout(priceConnectionTimeoutId);
    priceConnectionTimeoutId = setTimeout(() => {
      if (priceWebsocket && priceWebsocket.readyState !== WebSocket.OPEN) {
        console.error('Price WebSocket connection timeout');
        priceWebsocket.close();
        priceWebsocket = null;
        
        // If still not connected after timeout, try again
        if (!isPriceReconnecting) {
          retryPriceWebSocketConnection(symbol, onPriceUpdate);
        }
      }
    }, CONNECTION_TIMEOUT);
    
    console.log(`Initializing price WebSocket for ${symbol}`);
    priceWebsocket = new WebSocket(`${BINANCE_WS_BASE_URL}/${streamName}`);
    activePriceSymbol = symbol;

    priceWebsocket.onopen = () => {
      console.log('Price WebSocket connection established');
      priceWsRetryCount = 0; // Reset retry counter on successful connection
      isPriceReconnecting = false;
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
    };

    priceWebsocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping/pong messages
        if (data.result === null) {
          console.log('Received pong from Binance WebSocket');
          return;
        }
        
        if (data.e === 'ticker') {
          const price = parseFloat(data.c); // Current price
          if (!isNaN(price) && price > 0) {
            onPriceUpdate(price);
          }
        }
      } catch (error) {
        console.error('Error processing price WebSocket message:', error);
      }
    };

    priceWebsocket.onerror = (error) => {
      console.error('Price WebSocket error:', error);
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      if (!isPriceReconnecting) {
        retryPriceWebSocketConnection(symbol, onPriceUpdate);
      }
    };

    priceWebsocket.onclose = (event) => {
      console.log(`Price WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      // Only attempt to reconnect if not manually closed
      if (activePriceSymbol === symbol && !isPriceReconnecting) {
        retryPriceWebSocketConnection(symbol, onPriceUpdate);
      }
    };
  } catch (error) {
    console.error('Error initializing price WebSocket:', error);
    isPriceReconnecting = false;
    
    if (priceConnectionTimeoutId) {
      clearTimeout(priceConnectionTimeoutId);
      priceConnectionTimeoutId = null;
    }
    
    // Still try to reconnect on initialization error
    if (!isPriceReconnecting) {
      retryPriceWebSocketConnection(symbol, onPriceUpdate);
    }
  }
}

// Function to retry price WebSocket connection with exponential backoff
function retryPriceWebSocketConnection(
  symbol: string,
  onPriceUpdate: (price: number) => void
): void {
  if (isPriceReconnecting) return;
  isPriceReconnecting = true;
  
  if (priceWsRetryCount >= MAX_RETRY_COUNT) {
    console.error(`Maximum retry attempts (${MAX_RETRY_COUNT}) reached for price WebSocket connection.`);
    toast({
      title: "Price Connection Error",
      description: "Failed to connect to Binance price feed. Live price updates may be unavailable.",
      variant: "destructive"
    });
    isPriceReconnecting = false;
    return;
  }
  
  // Calculate delay with exponential backoff (2^n * base_delay)
  const delay = Math.min(30000, RETRY_DELAY * Math.pow(2, priceWsRetryCount));
  priceWsRetryCount++;
  
  console.log(`Retrying price WebSocket connection in ${delay}ms (attempt ${priceWsRetryCount}/${MAX_RETRY_COUNT})...`);
  
  setTimeout(() => {
    if (activePriceSymbol === symbol) {
      console.log('Attempting to reconnect price WebSocket...');
      initializePriceWebSocket(symbol, onPriceUpdate);
    } else {
      isPriceReconnecting = false;
    }
  }, delay);
}

// Function to send ping to keep WebSocket alive
export function pingPriceWebSocket(): void {
  if (priceWebsocket && priceWebsocket.readyState === WebSocket.OPEN) {
    try {
      console.log('Sending ping to price WebSocket to keep it alive');
      priceWebsocket.send(JSON.stringify({ method: "PING" }));
    } catch (error) {
      console.error('Error sending ping to price WebSocket:', error);
      // If we can't send a ping, the connection might be dead, try to reconnect
      if (activePriceSymbol) {
        closePriceWebSocket();
      }
    }
  } else if (priceWebsocket && priceWebsocket.readyState !== WebSocket.CONNECTING && activePriceSymbol) {
    // If the WebSocket is not open or connecting, but we have an active symbol, try to reconnect
    console.warn('Price WebSocket not open, attempting to reconnect');
    closePriceWebSocket();
  }
}

// Function to close WebSocket connection for price ticker with improved cleanup
export function closePriceWebSocket(): void {
  if (priceWebsocket) {
    try {
      isPriceReconnecting = false;
      activePriceSymbol = null;
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      priceWebsocket.close();
      priceWebsocket = null;
    } catch (error) {
      console.error('Error closing price WebSocket:', error);
    }
  }
}

// Function to close WebSocket connection with improved cleanup
export function closeWebSocket(): void {
  if (websocket) {
    try {
      isReconnecting = false;
      activeSubscriptions.clear();
      
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      
      websocket.close();
      websocket = null;
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }
}

// Transform WebSocket kline data to our KlineData format
function transformWebSocketKline(wsKline: any): KlineData {
  return {
    openTime: wsKline.t,
    open: parseFloat(wsKline.o),
    high: parseFloat(wsKline.h),
    low: parseFloat(wsKline.l),
    close: parseFloat(wsKline.c),
    volume: parseFloat(wsKline.v),
    closeTime: wsKline.T,
    quoteAssetVolume: parseFloat(wsKline.q),
    numberOfTrades: wsKline.n,
    takerBuyBaseAssetVolume: parseFloat(wsKline.V),
    takerBuyQuoteAssetVolume: parseFloat(wsKline.Q)
  };
}

// Function to fetch all available trading pairs from Binance
export async function fetchAllCoinPairs(): Promise<CoinPair[]> {
  try {
    const url = `${BINANCE_API_BASE_URL}/exchangeInfo`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const usdtPairs = data.symbols
      .filter((symbol: any) => 
        symbol.status === 'TRADING' && 
        symbol.quoteAsset === 'USDT'
      )
      .map((symbol: any): CoinPair => ({
        symbol: symbol.symbol,
        label: `${symbol.baseAsset}/USDT`
      }));
    
    return usdtPairs;
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    toast({
      title: "Error fetching trading pairs",
      description: error instanceof Error ? error.message : "Failed to load available trading pairs",
      variant: "destructive"
    });
    return COIN_PAIRS; // Return default pairs as fallback
  }
}

// Function to fetch kline (candlestick) data from Binance
export async function fetchKlineData(
  symbol: string, 
  interval: TimeInterval, 
  limit: number = 100
): Promise<KlineData[]> {
  try {
    const dynamicLimit = limit || getDataLimitForTimeframe(interval);
    
    console.log(`Fetching ${dynamicLimit} data points for ${symbol} at ${interval} interval`);
    
    const now = Date.now();
    const url = `${BINANCE_API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${dynamicLimit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      toast({
        title: "No data available",
        description: `Binance returned 0 data points for ${symbol} at ${interval} interval`,
        variant: "destructive"
      });
      return [];
    }
    
    lastKlineData = data.map((item: any[]): KlineData => ({
      openTime: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      closeTime: item[6],
      quoteAssetVolume: parseFloat(item[7]),
      numberOfTrades: item[8],
      takerBuyBaseAssetVolume: parseFloat(item[9]),
      takerBuyQuoteAssetVolume: parseFloat(item[10])
    }));
    
    return lastKlineData;
  } catch (error) {
    console.error('Error fetching kline data:', error);
    toast({
      title: "Error fetching data",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive"
    });
    return lastKlineData;
  }
}

// Update or append new kline data
export function updateKlineData(newKline: KlineData): KlineData[] {
  if (lastKlineData.length === 0) return [newKline];
  
  const index = lastKlineData.findIndex(k => k.openTime === newKline.openTime);
  
  if (index !== -1) {
    lastKlineData[index] = newKline;
  } else {
    lastKlineData.push(newKline);
    if (lastKlineData.length > 1000) {
      lastKlineData.shift();
    }
  }
  
  return [...lastKlineData];
}

// Get current price for a symbol
export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `${BINANCE_API_BASE_URL}/ticker/price?symbol=${symbol}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error('Error fetching current price:', error);
    return null;
  }
}

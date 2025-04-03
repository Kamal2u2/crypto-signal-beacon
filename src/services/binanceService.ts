
import { toast } from "@/components/ui/use-toast";

// Base URL for Binance API
const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';

// Valid time intervals supported by Binance
export type TimeInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

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
    case '2h':
      return 600; // Approximately 50 days of 2-hour data
    case '4h':
      return 500; // Approximately 83 days of 4-hour data
    case '6h':
      return 400; // Approximately 100 days of 6-hour data
    case '8h':
      return 360; // Approximately 120 days of 8-hour data
    case '12h':
      return 300; // Approximately 150 days of 12-hour data
    case '1d':
      return 365; // Approximately 1 year of daily data
    case '3d':
      return 200; // Approximately 600 days of 3-day data
    case '1w':
      return 100; // Approximately 2 years of weekly data
    case '1M':
      return 60;  // Approximately 5 years of monthly data
    default:
      return 100; // Default fallback
  }
}

// WebSocket base URL for Binance
const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';

let websocket: WebSocket | null = null;
let lastKlineData: KlineData[] = [];
let activeSubscriptions: Set<string> = new Set();

// Price WebSocket management 
let priceWebsocket: WebSocket | null = null;
let activePriceSymbol: string | null = null;
let priceUpdateCallback: ((price: number) => void) | null = null;

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

// Price WebSocket heartbeat management
let priceHeartbeatInterval: NodeJS.Timeout | null = null;
const HEARTBEAT_INTERVAL = 3000; // Reduced from 5s to 3s

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

// Completely rewritten initializePriceWebSocket function for better reliability
export function initializePriceWebSocket(
  symbol: string,
  onPriceUpdate: (price: number) => void
): void {
  // Save the callback globally for reconnection purposes
  priceUpdateCallback = onPriceUpdate;
  
  // Always close existing connections before creating a new one
  if (priceWebsocket) {
    closePriceWebSocket();
  }
  
  try {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    activePriceSymbol = symbol;
    
    if (isPriceReconnecting) {
      console.log(`Already attempting to reconnect price WebSocket. Skipping new connection request.`);
      return;
    }
    
    // Set timeout for connection establishment
    if (priceConnectionTimeoutId) clearTimeout(priceConnectionTimeoutId);
    priceConnectionTimeoutId = setTimeout(() => {
      if (priceWebsocket && priceWebsocket.readyState !== WebSocket.OPEN) {
        console.error('Price WebSocket connection timeout');
        closePriceWebSocket();
        
        // Try again after timeout
        if (!isPriceReconnecting && activePriceSymbol === symbol) {
          retryPriceWebSocketConnection();
        }
      }
    }, CONNECTION_TIMEOUT);
    
    console.log(`Initializing price WebSocket for ${symbol} with stream: ${streamName}`);
    priceWebsocket = new WebSocket(`${BINANCE_WS_BASE_URL}/${streamName}`);

    priceWebsocket.onopen = () => {
      console.log(`Price WebSocket connection established for ${symbol}`);
      priceWsRetryCount = 0; // Reset retry counter on successful connection
      isPriceReconnecting = false;
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      // Set up heartbeat interval to keep the connection alive
      if (priceHeartbeatInterval) {
        clearInterval(priceHeartbeatInterval);
      }
      
      priceHeartbeatInterval = setInterval(() => {
        sendPriceHeartbeat();
      }, HEARTBEAT_INTERVAL);
      
      // Immediately send a heartbeat to test the connection
      sendPriceHeartbeat();
    };

    priceWebsocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping/pong messages
        if (data.result === null) {
          console.log("Received pong response from price WebSocket");
          return;
        }
        
        if (data.e === 'ticker') {
          const price = parseFloat(data.c); // Current price
          if (!isNaN(price) && price > 0 && priceUpdateCallback) {
            console.log(`Price update from WebSocket: ${symbol} = $${price}`);
            priceUpdateCallback(price);
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
      
      // Try to reconnect on any error
      if (!isPriceReconnecting && activePriceSymbol === symbol) {
        console.log("Price WebSocket error occurred, attempting to reconnect...");
        closePriceWebSocket();
        retryPriceWebSocketConnection();
      }
    };

    priceWebsocket.onclose = (event) => {
      console.log(`Price WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      if (priceHeartbeatInterval) {
        clearInterval(priceHeartbeatInterval);
        priceHeartbeatInterval = null;
      }
      
      // Only attempt to reconnect if not manually closed
      if (activePriceSymbol === symbol && !isPriceReconnecting) {
        console.log("Price WebSocket closed, attempting to reconnect...");
        retryPriceWebSocketConnection();
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
    if (!isPriceReconnecting && activePriceSymbol === symbol) {
      retryPriceWebSocketConnection();
    }
  }
}

// Send a heartbeat to the price WebSocket
function sendPriceHeartbeat(): void {
  if (priceWebsocket && priceWebsocket.readyState === WebSocket.OPEN) {
    try {
      // Send a ping message
      const pingMessage = JSON.stringify({ method: "PING", id: Date.now() });
      priceWebsocket.send(pingMessage);
      console.log("Price WebSocket heartbeat sent");
    } catch (error) {
      console.error('Error sending heartbeat to price WebSocket:', error);
      
      // If sending fails, the connection might be broken
      if (activePriceSymbol && priceUpdateCallback) {
        closePriceWebSocket();
        retryPriceWebSocketConnection();
      }
    }
  } else if (priceWebsocket && priceWebsocket.readyState !== WebSocket.CONNECTING && 
            activePriceSymbol && priceUpdateCallback) {
    // If the WebSocket is not open or connecting, try to reconnect
    console.warn('Price WebSocket not open during heartbeat, attempting to reconnect');
    closePriceWebSocket();
    retryPriceWebSocketConnection();
  }
}

// Function to retry WebSocket connection with exponential backoff
function retryPriceWebSocketConnection(): void {
  if (isPriceReconnecting || !activePriceSymbol || !priceUpdateCallback) return;
  
  isPriceReconnecting = true;
  
  if (priceWsRetryCount >= MAX_RETRY_COUNT) {
    console.error(`Maximum retry attempts (${MAX_RETRY_COUNT}) reached for price WebSocket connection.`);
    toast({
      title: "Price Connection Error",
      description: "Failed to connect to live price feed. Try refreshing the page.",
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
    if (activePriceSymbol && priceUpdateCallback) {
      console.log(`Attempting to reconnect price WebSocket for ${activePriceSymbol}...`);
      // Store values locally in case they change during the timeout
      const symbol = activePriceSymbol;
      const callback = priceUpdateCallback;
      
      // Reinitialize with the same parameters
      initializePriceWebSocket(symbol, callback);
    } else {
      isPriceReconnecting = false;
    }
  }, delay);
}

// The pingPriceWebSocket function is now replaced by our automatic heartbeat mechanism
export function pingPriceWebSocket(): void {
  // This is now just a manual trigger for the heartbeat
  sendPriceHeartbeat();
}

// Improved close function for price WebSocket
export function closePriceWebSocket(): void {
  if (priceWebsocket) {
    try {
      isPriceReconnecting = false;
      
      if (priceConnectionTimeoutId) {
        clearTimeout(priceConnectionTimeoutId);
        priceConnectionTimeoutId = null;
      }
      
      if (priceHeartbeatInterval) {
        clearInterval(priceHeartbeatInterval);
        priceHeartbeatInterval = null;
      }
      
      // Save symbol before closing for debugging
      const symbol = activePriceSymbol;
      activePriceSymbol = null;
      
      console.log(`Closing price WebSocket for ${symbol}`);
      priceWebsocket.close();
      priceWebsocket = null;
    } catch (error) {
      console.error('Error closing price WebSocket:', error);
      priceWebsocket = null;
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
  limit: number = 100,
  startTime?: number,
  endTime?: number
): Promise<KlineData[]> {
  try {
    const dynamicLimit = limit || getDataLimitForTimeframe(interval);
    
    console.log(`Fetching ${dynamicLimit} data points for ${symbol} at ${interval} interval`);
    
    // Build URL with optional startTime and endTime parameters
    let url = `${BINANCE_API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${dynamicLimit}`;
    
    if (startTime) {
      url += `&startTime=${startTime}`;
    }
    
    if (endTime) {
      url += `&endTime=${endTime}`;
    }
    
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

// Additional utility function to manually trigger a price update
export async function forceUpdatePrice(symbol: string, callback: (price: number) => void): Promise<boolean> {
  try {
    const price = await fetchCurrentPrice(symbol);
    if (price !== null) {
      callback(price);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error in force update price:", error);
    return false;
  }
}

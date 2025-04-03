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

// Function to initialize WebSocket connection for kline data
export function initializeWebSocket(
  symbol: string, 
  interval: TimeInterval,
  onKlineUpdate: (kline: KlineData) => void
): void {
  if (websocket) {
    closeWebSocket();
  }

  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  websocket = new WebSocket(`${BINANCE_WS_BASE_URL}/${streamName}`);

  websocket.onopen = () => {
    console.log('WebSocket connection established');
    activeSubscriptions.add(streamName);
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
    toast({
      title: "WebSocket Error",
      description: "Connection error occurred. Attempting to reconnect...",
      variant: "destructive"
    });
    setTimeout(() => {
      if (activeSubscriptions.has(streamName)) {
        initializeWebSocket(symbol, interval, onKlineUpdate);
      }
    }, 5000);
  };

  websocket.onclose = () => {
    console.log('WebSocket connection closed');
    if (activeSubscriptions.has(streamName)) {
      setTimeout(() => {
        initializeWebSocket(symbol, interval, onKlineUpdate);
      }, 5000);
    }
  };
}

// Function to initialize WebSocket connection for price ticker
export function initializePriceWebSocket(
  symbol: string,
  onPriceUpdate: (price: number) => void
): void {
  if (priceWebsocket && activePriceSymbol === symbol) {
    return;
  }
  
  if (priceWebsocket) {
    closePriceWebSocket();
  }
  
  const streamName = `${symbol.toLowerCase()}@ticker`;
  priceWebsocket = new WebSocket(`${BINANCE_WS_BASE_URL}/${streamName}`);
  activePriceSymbol = symbol;

  priceWebsocket.onopen = () => {
    console.log('Price WebSocket connection established');
  };

  priceWebsocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.e === 'ticker') {
        const price = parseFloat(data.c); // Current price
        onPriceUpdate(price);
      }
    } catch (error) {
      console.error('Error processing price WebSocket message:', error);
    }
  };

  priceWebsocket.onerror = (error) => {
    console.error('Price WebSocket error:', error);
    setTimeout(() => {
      if (activePriceSymbol === symbol) {
        initializePriceWebSocket(symbol, onPriceUpdate);
      }
    }, 5000);
  };

  priceWebsocket.onclose = () => {
    console.log('Price WebSocket connection closed');
    if (activePriceSymbol === symbol) {
      setTimeout(() => {
        initializePriceWebSocket(symbol, onPriceUpdate);
      }, 5000);
    }
  };
}

// Function to close WebSocket connection for price ticker
export function closePriceWebSocket(): void {
  if (priceWebsocket) {
    priceWebsocket.close();
    priceWebsocket = null;
    activePriceSymbol = null;
  }
}

// Function to close WebSocket connection
export function closeWebSocket(): void {
  if (websocket) {
    activeSubscriptions.clear();
    websocket.close();
    websocket = null;
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

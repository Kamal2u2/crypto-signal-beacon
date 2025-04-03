
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
    case '1h':
      return 720; // Approximately 30 days of hourly data
    case '4h':
      return 500; // Approximately 83 days of 4-hour data
    case '1d':
      return 365; // Approximately 1 year of daily data
    case '30m':
      return 480; // Approximately 10 days of 30-minute data
    case '15m':
      return 300; // Approximately 3 days of 15-minute data
    default:
      return 100; // Default for shorter timeframes
  }
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
    
    // Filter for USDT trading pairs (most popular)
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
    // Determine if we need more data based on the interval
    const dynamicLimit = limit || getDataLimitForTimeframe(interval);
    
    console.log(`Fetching ${dynamicLimit} data points for ${symbol} at ${interval} interval`);
    
    const url = `${BINANCE_API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${dynamicLimit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`Received ${data.length} data points from Binance`);
    
    if (data.length === 0) {
      toast({
        title: "No data available",
        description: `Binance returned 0 data points for ${symbol} at ${interval} interval`,
        variant: "destructive"
      });
      return [];
    }
    
    // Transform the response data into our KlineData format
    return data.map((item: any[]): KlineData => ({
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
  } catch (error) {
    console.error('Error fetching kline data:', error);
    toast({
      title: "Error fetching data",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive"
    });
    return [];
  }
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


import { AssetPair, AssetType } from './types';

// Re-export types needed by other modules
export { AssetType } from './types';
export type { AssetPair, TimeInterval } from './types';

// Crypto pairs - top 10 by market cap
export const CRYPTO_PAIRS: AssetPair[] = [
  { symbol: 'BTCUSDT', label: 'BTC/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'ETHUSDT', label: 'ETH/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'BNBUSDT', label: 'BNB/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'XRPUSDT', label: 'XRP/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'SOLUSDT', label: 'SOL/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'ADAUSDT', label: 'ADA/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'DOGEUSDT', label: 'DOGE/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'TRXUSDT', label: 'TRX/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'AVAXUSDT', label: 'AVAX/USDT', assetType: AssetType.CRYPTO },
  { symbol: 'DOTUSDT', label: 'DOT/USDT', assetType: AssetType.CRYPTO },
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

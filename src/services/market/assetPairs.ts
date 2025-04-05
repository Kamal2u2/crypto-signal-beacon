import { AssetPair, AssetType } from './types';

// Re-export types needed by other modules
export { AssetPair, AssetType } from './types';
export type { TimeInterval } from './types';

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


import { AssetPair, AssetType } from './types';

// Re-export types needed by other modules
export { AssetType } from './types';
export type { AssetPair, TimeInterval } from './types';

// Crypto pairs - top 10 by market cap (used as fallback)
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

// Fetch all available Binance pairs
export const fetchAllBinancePairs = async (): Promise<AssetPair[]> => {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    if (!response.ok) {
      console.error('Failed to fetch Binance pairs:', response.statusText);
      return CRYPTO_PAIRS; // Fallback to predefined list
    }
    
    const data = await response.json();
    
    // Filter for USDT trading pairs as they're most common
    const binancePairs = data.symbols
      .filter((symbol: any) => 
        symbol.status === 'TRADING' && 
        symbol.quoteAsset === 'USDT' &&
        !symbol.symbol.includes('_')
      )
      .map((symbol: any) => {
        const baseAsset = symbol.baseAsset;
        return {
          symbol: symbol.symbol,
          label: `${baseAsset}/USDT`,
          assetType: AssetType.CRYPTO
        };
      });
    
    console.log(`Fetched ${binancePairs.length} Binance pairs`);
    return binancePairs.length > 0 ? binancePairs : CRYPTO_PAIRS;
  } catch (error) {
    console.error('Error fetching Binance pairs:', error);
    return CRYPTO_PAIRS; // Fallback to predefined list in case of error
  }
};

// Fetch all available asset pairs
export const fetchAllAssetPairs = async (): Promise<AssetPair[]> => {
  try {
    // For crypto, fetch from Binance API
    const cryptoPairs = await fetchAllBinancePairs();
    
    // For stocks, use our predefined list
    return [...cryptoPairs, ...STOCK_PAIRS];
  } catch (error) {
    console.error('Error fetching available pairs:', error);
    return [...CRYPTO_PAIRS, ...STOCK_PAIRS]; // Fallback to predefined lists
  }
};


// Define basic types for market data
export enum AssetType {
  CRYPTO = 'CRYPTO',
  STOCKS = 'STOCKS'
}

export interface AssetPair {
  symbol: string;
  label: string;
  assetType: AssetType;
}

// Alias for backward compatibility
export type CoinPair = AssetPair;

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

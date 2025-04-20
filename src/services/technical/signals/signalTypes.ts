
import { SignalType, IndicatorSignal } from '../types';
import { MarketRegimeType } from '../marketRegime';

export interface TradingSignalWeight {
  buyWeight: number;
  sellWeight: number;
  holdWeight: number;
  neutralWeight: number;
  totalWeight: number;
  aiPrediction?: {
    prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
    confidence: number;
    predictedChangePercent: number;
    shortTermPrediction: 'UP' | 'DOWN' | 'NEUTRAL';
    mediumTermPrediction: 'UP' | 'DOWN' | 'NEUTRAL';
    explanation?: string;
    marketRegime?: MarketRegimeType;
    marketDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
    marketPhase?: 'EARLY' | 'MIDDLE' | 'LATE';
  };
  marketContext?: {
    regime: MarketRegimeType;
    strength: number;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    volatility: number;
    phase?: 'EARLY' | 'MIDDLE' | 'LATE';
  };
}

export interface PriceTarget {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
}

// New: For multi-timeframe consensus tracking
export interface TimeframeSignal {
  timeframe: string;  // '1m', '5m', '15m', '1h', etc.
  signal: SignalType;
  confidence: number;
  timestamp: number;   // When this signal was generated
}

// New: For tracking execution quality
export interface SignalQuality {
  signalType: SignalType;
  generatedAt: number;  // Timestamp when signal was generated
  entryPrice: number;
  currentStatus: 'ACTIVE' | 'STOPPED' | 'TARGET1' | 'TARGET2' | 'TARGET3';
  pnlPercent: number;   // Current or final P&L
  maxDrawdown: number;  // Maximum adverse excursion
  duration: number;     // How long the signal has been active (ms)
}

// New: Volume profile data structure
export interface VolumeProfileLevel {
  price: number;
  volume: number;
  isHVN: boolean;       // High Volume Node
  isLVN: boolean;       // Low Volume Node
  isPOC: boolean;       // Point of Control (highest volume)
  isVAH: boolean;       // Value Area High
  isVAL: boolean;       // Value Area Low
}

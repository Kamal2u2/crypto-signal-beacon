
import { SignalType, IndicatorSignal } from '../types';

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

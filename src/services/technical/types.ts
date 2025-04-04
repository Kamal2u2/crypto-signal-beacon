
import { KlineData } from '../binanceService';

export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

export interface PatternDetection {
  name: string;
  description: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface TradingSignal {
  indicator: string;
  type: SignalType;
  message: string;
  strength: number;
}

export interface IndicatorSignal {
  signal: SignalType;
  weight: number;
  confidence: number;
}

export interface SignalSummary {
  overallSignal: SignalType;
  confidence: number;
  indicators: {
    [key: string]: IndicatorSignal;
  };
  signals: TradingSignal[];
  patterns?: PatternDetection[];
  priceTargets?: {
    entryPrice: number;
    stopLoss: number;
    target1: number;
    target2: number;
    target3: number;
    riskRewardRatio: number;
  };
}

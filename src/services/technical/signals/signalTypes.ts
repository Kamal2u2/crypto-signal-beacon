
import { SignalType, IndicatorSignal } from '../types';

export interface TradingSignalWeight {
  buyWeight: number;
  sellWeight: number;
  holdWeight: number;
  neutralWeight: number;
  totalWeight: number;
}

export interface PriceTarget {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
}


import { SignalType, IndicatorSignal } from '../types';
import { TradingSignalWeight } from './signalTypes';
import { KlineData } from '../../binanceService';
import { calculateATR } from '../atr';

// Helper function to sum weights for a given signal type
export const sumSignalWeights = (indicators: { [key: string]: IndicatorSignal }, signalType: SignalType): number => {
  return Object.values(indicators)
    .filter(indicator => indicator.signal === signalType)
    .reduce((sum, indicator) => sum + indicator.weight, 0);
};

// Helper function to calculate confidence
export const calculateConfidence = (signalWeight: number, totalWeight: number): number => {
  return Math.min(100, Math.round((signalWeight / totalWeight) * 100) + 30); // Base 30% + weighted contribution
};

// Calculate price targets based on ATR
export const calculatePriceTargets = (klineData: KlineData[], signal: SignalType): {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
} | undefined => {
  if (signal !== 'BUY' && signal !== 'SELL') {
    return undefined;
  }
  
  const atr = calculateATR(klineData);
  const lastATR = atr[atr.length - 1];
  const lastPrice = klineData[klineData.length - 1].close;
  
  if (!lastATR || isNaN(lastATR)) {
    return undefined;
  }
  
  const isBuy = signal === 'BUY';
  const entryPrice = lastPrice;
  const stopLoss = isBuy ? entryPrice - (lastATR * 2) : entryPrice + (lastATR * 2);
  const riskAmount = Math.abs(entryPrice - stopLoss);
  
  const target1 = isBuy ? entryPrice + (riskAmount * 1.5) : entryPrice - (riskAmount * 1.5);
  const target2 = isBuy ? entryPrice + (riskAmount * 3) : entryPrice - (riskAmount * 3);
  const target3 = isBuy ? entryPrice + (riskAmount * 5) : entryPrice - (riskAmount * 5);
  
  const riskRewardRatio = 3.0; // Average of the three targets
  
  return {
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskRewardRatio
  };
};

// Helper function to get opens from KlineData
export const getOpens = (klineData: KlineData[]): number[] => {
  return klineData.map(item => item.open);
};

// Compute all signal weights
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }): TradingSignalWeight => {
  const buyWeight = sumSignalWeights(indicators, 'BUY');
  const sellWeight = sumSignalWeights(indicators, 'SELL');
  const holdWeight = sumSignalWeights(indicators, 'HOLD');
  const neutralWeight = sumSignalWeights(indicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight;
  
  return {
    buyWeight,
    sellWeight,
    holdWeight,
    neutralWeight,
    totalWeight
  };
};

// Determine overall signal based on weights
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight } = weights;
  
  let overallSignal: SignalType;
  let confidence: number;
  
  if (buyWeight > sellWeight && buyWeight > holdWeight && buyWeight > 0.25 * totalWeight) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
  } else if (sellWeight > buyWeight && sellWeight > holdWeight && sellWeight > 0.25 * totalWeight) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
  } else if (holdWeight > 0.25 * totalWeight) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight, totalWeight);
  } else {
    overallSignal = 'NEUTRAL';
    confidence = calculateConfidence(neutralWeight, totalWeight);
  }
  
  return { overallSignal, confidence };
};

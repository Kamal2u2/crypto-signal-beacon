import { SignalType, IndicatorSignal } from '../types';
import { TradingSignalWeight } from './signalTypes';
import { KlineData } from '../../binanceService';
import { calculateATR } from '../atr';
import { getAIPrediction } from '../aiPrediction';

// Helper function to sum weights for a given signal type
export const sumSignalWeights = (indicators: { [key: string]: IndicatorSignal }, signalType: SignalType): number => {
  return Object.values(indicators)
    .filter(indicator => indicator.signal === signalType)
    .reduce((sum, indicator) => sum + indicator.weight, 0);
};

// Helper function to calculate confidence
export const calculateConfidence = (signalWeight: number, totalWeight: number): number => {
  if (totalWeight === 0) return 0;
  const weightedContribution = Math.min(82, (signalWeight / totalWeight) * 82);
  return Math.min(100, Math.round(18 + weightedContribution));
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
  
  const riskRewardRatio = 3.0;
  
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

// Compute all signal weights with improved priority weighting for early signals
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }, klineData: KlineData[]): TradingSignalWeight => {
  Object.keys(indicators).forEach(key => {
    if (key.startsWith('early') || key === 'priceAcceleration' || key === 'volumeAccumulation' || key === 'volumeDistribution') {
      indicators[key].weight *= 1.3;
    }
  });
  
  const buyWeight = sumSignalWeights(indicators, 'BUY');
  const sellWeight = sumSignalWeights(indicators, 'SELL');
  const holdWeight = sumSignalWeights(indicators, 'HOLD');
  const neutralWeight = sumSignalWeights(indicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight || 1;
  
  const aiPrediction = getAIPrediction(klineData);
  
  let explanation = '';
  if (Math.abs(aiPrediction.predictedChangePercent) < 0.2) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (minimal change)`;
  } else if (Math.abs(aiPrediction.predictedChangePercent) < 0.5) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (moderate change)`;
  } else {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (significant change)`;
  }
  
  console.log(`AI Prediction: ${aiPrediction.prediction} with ${aiPrediction.confidence}% confidence, predicted change: ${aiPrediction.predictedChangePercent}%, explanation: ${explanation}`);
  
  let aiBuyWeight = 0;
  let aiSellWeight = 0;
  let aiHoldWeight = 0;
  
  if (aiPrediction.confidence > 45) {
    const baseWeight = Math.min(3.0, (aiPrediction.confidence / 100) * 3.5);
    const changeMultiplier = Math.min(1.8, 1 + (Math.abs(aiPrediction.predictedChangePercent) / 1.5));
    const aiWeight = baseWeight * changeMultiplier;
    
    if (aiPrediction.prediction === 'BUY') {
      aiBuyWeight = aiWeight;
    } else if (aiPrediction.prediction === 'SELL') {
      aiSellWeight = aiWeight;
    } else if (aiPrediction.prediction === 'HOLD') {
      aiHoldWeight = aiWeight;
    }
  }
  
  const adjustedBuyWeight = buyWeight + aiBuyWeight;
  const adjustedSellWeight = sellWeight + aiSellWeight;
  const adjustedHoldWeight = holdWeight + aiHoldWeight;
  const adjustedTotalWeight = adjustedBuyWeight + adjustedSellWeight + adjustedHoldWeight + neutralWeight;
  
  aiPrediction.explanation = explanation;
  
  return {
    buyWeight: adjustedBuyWeight,
    sellWeight: adjustedSellWeight,
    holdWeight: adjustedHoldWeight,
    neutralWeight,
    totalWeight: adjustedTotalWeight,
    aiPrediction
  };
};

// Determine overall signal based on weights - IMPROVED ALGORITHM FOR EARLIER SIGNALS
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, aiPrediction } = weights;
  
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  if (aiPrediction) {
    console.log('AI prediction:', aiPrediction);
  }

  const buyThreshold = 0.20;
  const sellThreshold = 0.20;
  const holdThreshold = 0.30;
  
  let overallSignal: SignalType;
  let confidence: number;
  
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  const isStrongConfirmation = buyWeight > 2.0 * sellWeight || sellWeight > 2.0 * buyWeight;
  
  if (buyWeight > 0 && buyWeight > sellWeight * 1.2 && buyProportion > buyThreshold) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
    
    if (buyProportion > 0.45 && isStrongConfirmation) {
      confidence = Math.min(100, confidence + 12);
    } else if (!isStrongConfirmation) {
      confidence = Math.max(0, confidence - 5);
    }
    
    if (aiPrediction && aiPrediction.confidence > 55) {
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 10);
      }
    }
  } 
  else if (sellWeight > 0 && sellWeight > buyWeight * 1.2 && sellProportion > sellThreshold) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
    
    if (sellProportion > 0.45 && isStrongConfirmation) {
      confidence = Math.min(100, confidence + 12);
    } else if (!isStrongConfirmation) {
      confidence = Math.max(0, confidence - 5);
    }
    
    if (aiPrediction && aiPrediction.confidence > 55) {
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 10);
      }
    }
  } 
  else if (holdProportion > holdThreshold && holdWeight > buyWeight && holdWeight > sellWeight) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight, totalWeight);
    
    if (aiPrediction && aiPrediction.confidence > 60 && aiPrediction.prediction === 'HOLD') {
      confidence = Math.min(100, confidence + 5);
    }
  } 
  else {
    overallSignal = 'NEUTRAL';
    confidence = calculateConfidence(neutralWeight, totalWeight);
  }
  
  console.log(`Signal decision: ${overallSignal} with confidence: ${confidence.toFixed(1)}%, buyProportion: ${(buyProportion*100).toFixed(1)}%, sellProportion: ${(sellProportion*100).toFixed(1)}%, holdProportion: ${(holdProportion*100).toFixed(1)}%`);
  
  return { overallSignal, confidence };
};

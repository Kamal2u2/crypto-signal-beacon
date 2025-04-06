
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
// and increased bias toward HOLD in uncertain conditions
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }, klineData: KlineData[]): TradingSignalWeight => {
  // Clone indicators to avoid mutating the original
  const modifiedIndicators = JSON.parse(JSON.stringify(indicators));
  
  // Boost early detection signals
  Object.keys(modifiedIndicators).forEach(key => {
    if (key.startsWith('early') || key === 'priceAcceleration' || key === 'volumeAccumulation' || key === 'volumeDistribution') {
      modifiedIndicators[key].weight *= 1.3;
    }
  });
  
  // Get individual signal weights
  const buyWeight = sumSignalWeights(modifiedIndicators, 'BUY');
  const sellWeight = sumSignalWeights(modifiedIndicators, 'SELL');
  const holdWeight = sumSignalWeights(modifiedIndicators, 'HOLD');
  const neutralWeight = sumSignalWeights(modifiedIndicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight || 1;
  
  // Get AI prediction
  const aiPrediction = getAIPrediction(klineData);
  
  // Enhanced AI explanation based on predicted change
  let explanation = '';
  if (Math.abs(aiPrediction.predictedChangePercent) < 0.2) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (minimal change)`;
  } else if (Math.abs(aiPrediction.predictedChangePercent) < 0.5) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (moderate change)`;
  } else {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent}% (significant change)`;
  }
  
  console.log(`AI Prediction: ${aiPrediction.prediction} with ${aiPrediction.confidence}% confidence, predicted change: ${aiPrediction.predictedChangePercent}%, explanation: ${explanation}`);
  
  // Calculate AI contribution to weights
  let aiBuyWeight = 0;
  let aiSellWeight = 0;
  let aiHoldWeight = 0;
  
  // Only use AI prediction if confidence is high enough
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
  
  // Adjust weights with AI contribution
  const adjustedBuyWeight = buyWeight + aiBuyWeight;
  const adjustedSellWeight = sellWeight + aiSellWeight;
  const adjustedHoldWeight = holdWeight + aiHoldWeight;
  const adjustedTotalWeight = adjustedBuyWeight + adjustedSellWeight + adjustedHoldWeight + neutralWeight;
  
  // Add explanation to AI prediction
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

// Determine overall signal based on weights - IMPROVED ALGORITHM WITH STRONGER HOLD BIAS
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, aiPrediction } = weights;
  
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  if (aiPrediction) {
    console.log('AI prediction:', aiPrediction);
  }

  // Increased thresholds to force more HOLD signals (similar to Python tool)
  const buyThreshold = 0.30;  // Increased from 0.20
  const sellThreshold = 0.30; // Increased from 0.20
  const holdThreshold = 0.25;
  
  let overallSignal: SignalType;
  let confidence: number;
  
  // Calculate proportions of each signal type
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  // Determine if we have a strong confirmation
  const isStrongBuyConfirmation = buyWeight > 2.5 * sellWeight && buyProportion > 0.40;
  const isStrongSellConfirmation = sellWeight > 2.5 * buyWeight && sellProportion > 0.40;
  
  // Default to HOLD unless we have strong confirmation
  if (isStrongBuyConfirmation && buyProportion > buyThreshold) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
    
    if (buyProportion > 0.50) {
      confidence = Math.min(100, confidence + 12);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 55) {
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 15); // Stronger penalty for conflicting AI
      }
    }
  } 
  else if (isStrongSellConfirmation && sellProportion > sellThreshold) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
    
    if (sellProportion > 0.50) {
      confidence = Math.min(100, confidence + 12);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 55) {
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 15); // Stronger penalty for conflicting AI
      }
    }
  } 
  else if (holdProportion > holdThreshold && holdWeight > 0) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight + neutralWeight, totalWeight);
    
    if (aiPrediction && aiPrediction.confidence > 60 && aiPrediction.prediction === 'HOLD') {
      confidence = Math.min(100, confidence + 5);
    }
  } 
  else {
    // Default to HOLD when in doubt (like the Python tool)
    overallSignal = 'HOLD';
    
    // Calculate confidence based on how mixed the signals are
    const maxWeight = Math.max(buyWeight, sellWeight);
    confidence = calculateConfidence(maxWeight, totalWeight) * 0.7; // Reduced confidence for mixed signals
  }
  
  console.log(`Signal decision: ${overallSignal} with confidence: ${confidence.toFixed(1)}%, buyProportion: ${(buyProportion*100).toFixed(1)}%, sellProportion: ${(sellProportion*100).toFixed(1)}%, holdProportion: ${(holdProportion*100).toFixed(1)}%`);
  
  return { overallSignal, confidence };
};

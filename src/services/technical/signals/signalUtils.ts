
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
  // Increased the base confidence and maximum contribution to produce higher confidence scores
  const weightedContribution = Math.min(87, (signalWeight / totalWeight) * 87);
  return Math.min(100, Math.round(20 + weightedContribution));
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
// and decreased bias toward HOLD in uncertain conditions
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }, klineData: KlineData[]): TradingSignalWeight => {
  // Clone indicators to avoid mutating the original
  const modifiedIndicators = JSON.parse(JSON.stringify(indicators));
  
  // Boost early detection signals even more
  Object.keys(modifiedIndicators).forEach(key => {
    if (key.startsWith('early') || key === 'priceAcceleration' || key === 'volumeAccumulation' || key === 'volumeDistribution') {
      // Increased boost for early signals from 1.3 to 1.5
      modifiedIndicators[key].weight *= 1.5;
    }
    
    // Reduce weight of HOLD signals to favor more BUY/SELL signals
    if (modifiedIndicators[key].signal === 'HOLD') {
      modifiedIndicators[key].weight *= 0.8;
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
  
  // More weight to AI prediction by lowering confidence threshold
  if (aiPrediction.confidence > 40) {  // Reduced from 45 to 40
    // Increased base weight multiplier from 3.5 to 4.0
    const baseWeight = Math.min(3.5, (aiPrediction.confidence / 100) * 4.0);
    const changeMultiplier = Math.min(2.0, 1 + (Math.abs(aiPrediction.predictedChangePercent) / 1.5));
    const aiWeight = baseWeight * changeMultiplier;
    
    if (aiPrediction.prediction === 'BUY') {
      aiBuyWeight = aiWeight;
    } else if (aiPrediction.prediction === 'SELL') {
      aiSellWeight = aiWeight;
    } else if (aiPrediction.prediction === 'HOLD') {
      aiHoldWeight = aiWeight * 0.8;  // Reduced HOLD weight
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

// Determine overall signal based on weights - LESS HOLD BIAS
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, aiPrediction } = weights;
  
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  if (aiPrediction) {
    console.log('AI prediction:', aiPrediction);
  }

  // Reduced thresholds to favor more BUY/SELL signals
  const buyThreshold = 0.25;  // Decreased from 0.30
  const sellThreshold = 0.25; // Decreased from 0.30
  const holdThreshold = 0.30; // Increased from 0.25
  
  let overallSignal: SignalType;
  let confidence: number;
  
  // Calculate proportions of each signal type
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  // Determine if we have a strong confirmation - relaxed requirements
  const isStrongBuyConfirmation = buyWeight > 2.0 * sellWeight && buyProportion > 0.35;  // Reduced from 2.5 and 0.40
  const isStrongSellConfirmation = sellWeight > 2.0 * buyWeight && sellProportion > 0.35;  // Reduced from 2.5 and 0.40
  
  // Default to BUY or SELL more often
  if (isStrongBuyConfirmation && buyProportion > buyThreshold) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
    
    if (buyProportion > 0.45) {  // Reduced from 0.50
      confidence = Math.min(100, confidence + 15);  // Increased from +12
    }
    
    // AI consistency bonus - increased bonuses
    if (aiPrediction && aiPrediction.confidence > 50) {  // Reduced from 55
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 10);  // Increased from +8
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 12);  // Reduced penalty from -15
      }
    }
  } 
  else if (isStrongSellConfirmation && sellProportion > sellThreshold) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
    
    if (sellProportion > 0.45) {  // Reduced from 0.50
      confidence = Math.min(100, confidence + 15);  // Increased from +12
    }
    
    // AI consistency bonus - increased bonuses
    if (aiPrediction && aiPrediction.confidence > 50) {  // Reduced from 55
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 10);  // Increased from +8
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 12);  // Reduced penalty from -15
      }
    }
  } 
  else if (holdProportion > holdThreshold && holdWeight > 0) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight + neutralWeight, totalWeight);
    
    if (aiPrediction && aiPrediction.confidence > 55 && aiPrediction.prediction === 'HOLD') {
      confidence = Math.min(100, confidence + 5);
    }
  }
  // Check if we have a moderate buy or sell signal without strong confirmation
  else if (buyWeight > sellWeight && buyWeight > holdWeight) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight) * 0.85;  // Reduced confidence multiplier from previous default
  }
  else if (sellWeight > buyWeight && sellWeight > holdWeight) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight) * 0.85;  // Reduced confidence multiplier from previous default
  }
  else {
    // Default to HOLD when truly in doubt
    overallSignal = 'HOLD';
    
    // Calculate confidence based on how mixed the signals are
    const maxWeight = Math.max(buyWeight, sellWeight);
    confidence = calculateConfidence(maxWeight, totalWeight) * 0.7; // Reduced confidence for mixed signals
  }
  
  console.log(`Signal decision: ${overallSignal} with confidence: ${confidence.toFixed(1)}%, buyProportion: ${(buyProportion*100).toFixed(1)}%, sellProportion: ${(sellProportion*100).toFixed(1)}%, holdProportion: ${(holdProportion*100).toFixed(1)}%`);
  
  return { overallSignal, confidence };
};

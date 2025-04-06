
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
  // Further increased the base confidence and maximum contribution
  const weightedContribution = Math.min(90, (signalWeight / totalWeight) * 90);
  return Math.min(100, Math.round(25 + weightedContribution));
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
      // Increased boost for early signals to 1.8
      modifiedIndicators[key].weight *= 1.8;
    }
    
    // Further reduce weight of HOLD signals to favor more BUY/SELL signals
    if (modifiedIndicators[key].signal === 'HOLD') {
      modifiedIndicators[key].weight *= 0.6; // Reduced from 0.8
    }
    
    // Boost BUY/SELL signals
    if (modifiedIndicators[key].signal === 'BUY' || modifiedIndicators[key].signal === 'SELL') {
      modifiedIndicators[key].weight *= 1.15; // Boost by 15%
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
  if (aiPrediction.confidence > 35) {  // Further reduced from 40 to 35
    // Increased base weight multiplier to 4.5
    const baseWeight = Math.min(4.0, (aiPrediction.confidence / 100) * 4.5);
    const changeMultiplier = Math.min(2.0, 1 + (Math.abs(aiPrediction.predictedChangePercent) / 1.5));
    const aiWeight = baseWeight * changeMultiplier;
    
    if (aiPrediction.prediction === 'BUY') {
      aiBuyWeight = aiWeight;
    } else if (aiPrediction.prediction === 'SELL') {
      aiSellWeight = aiWeight;
    } else if (aiPrediction.prediction === 'HOLD') {
      aiHoldWeight = aiWeight * 0.6;  // Further reduced HOLD weight
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

// Determine overall signal based on weights - EVEN LESS HOLD BIAS
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, aiPrediction } = weights;
  
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  if (aiPrediction) {
    console.log('AI prediction:', aiPrediction);
  }

  // Further reduced thresholds to favor more BUY/SELL signals
  const buyThreshold = 0.18;  // Decreased from 0.25
  const sellThreshold = 0.18; // Decreased from 0.25
  const holdThreshold = 0.40; // Increased from 0.30
  
  let overallSignal: SignalType;
  let confidence: number;
  
  // Calculate proportions of each signal type
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  // Determine if we have a strong confirmation - very relaxed requirements
  const isStrongBuyConfirmation = buyWeight > 1.5 * sellWeight && buyProportion > 0.25;  // Reduced requirements 
  const isStrongSellConfirmation = sellWeight > 1.5 * buyWeight && sellProportion > 0.25;  // Reduced requirements
  
  // Default to BUY or SELL much more often
  if (isStrongBuyConfirmation && buyProportion > buyThreshold) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
    
    if (buyProportion > 0.35) {  // Reduced from 0.45
      confidence = Math.min(100, confidence + 15);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 45) {  // Reduced from 50
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 12);
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 10);  // Reduced penalty
      }
    }
  } 
  else if (isStrongSellConfirmation && sellProportion > sellThreshold) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
    
    if (sellProportion > 0.35) {  // Reduced from 0.45
      confidence = Math.min(100, confidence + 15);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 45) {  // Reduced from 50
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 12);
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 10);  // Reduced penalty
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
  // Check for moderate buy signals with even less strict requirements
  else if (buyWeight > 0.8 * sellWeight) { // Changed from buyWeight > sellWeight
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight) * 0.9;  // Less reduction in confidence
  }
  // Check for moderate sell signals with even less strict requirements
  else if (sellWeight > 0.8 * buyWeight) { // Changed from sellWeight > buyWeight
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight) * 0.9;  // Less reduction in confidence
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

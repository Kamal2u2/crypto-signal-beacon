
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
  // Enhanced confidence calculation - lower base confidence for more conservative signals
  if (totalWeight === 0) return 0;
  const weightedContribution = Math.min(75, (signalWeight / totalWeight) * 75);
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

// Compute all signal weights with improved priority weighting
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }, klineData: KlineData[]): TradingSignalWeight => {
  const buyWeight = sumSignalWeights(indicators, 'BUY');
  const sellWeight = sumSignalWeights(indicators, 'SELL');
  const holdWeight = sumSignalWeights(indicators, 'HOLD');
  const neutralWeight = sumSignalWeights(indicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight || 1; // Prevent division by zero
  
  // Get AI prediction
  const aiPrediction = getAIPrediction(klineData);
  console.log(`AI Prediction: ${aiPrediction.prediction} with ${aiPrediction.confidence}% confidence, predicted change: ${aiPrediction.predictedChangePercent}%`);
  
  // Apply AI weighting if confidence is high enough
  let aiBuyWeight = 0;
  let aiSellWeight = 0;
  let aiHoldWeight = 0;
  
  if (aiPrediction.confidence > 50) {
    // Convert AI prediction to weights
    const aiWeight = Math.min(2.5, (aiPrediction.confidence / 100) * 3); // Max AI weight is 2.5
    
    if (aiPrediction.prediction === 'BUY') {
      aiBuyWeight = aiWeight;
    } else if (aiPrediction.prediction === 'SELL') {
      aiSellWeight = aiWeight;
    } else if (aiPrediction.prediction === 'HOLD') {
      aiHoldWeight = aiWeight;
    }
  }
  
  // Add AI weights to technical indicator weights
  const adjustedBuyWeight = buyWeight + aiBuyWeight;
  const adjustedSellWeight = sellWeight + aiSellWeight;
  const adjustedHoldWeight = holdWeight + aiHoldWeight;
  const adjustedTotalWeight = adjustedBuyWeight + adjustedSellWeight + adjustedHoldWeight + neutralWeight;
  
  return {
    buyWeight: adjustedBuyWeight,
    sellWeight: adjustedSellWeight,
    holdWeight: adjustedHoldWeight,
    neutralWeight,
    totalWeight: adjustedTotalWeight,
    aiPrediction // Include the AI prediction in the weights object
  };
};

// Determine overall signal based on weights - OPTIMIZED ALGORITHM
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, aiPrediction } = weights;
  
  // Log the weights for debugging
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  if (aiPrediction) {
    console.log('AI prediction:', aiPrediction);
  }

  // More conservative thresholds to prevent false signals
  const buyThreshold = 0.25; // Increased from 0.18
  const sellThreshold = 0.25; // Increased from 0.18
  const holdThreshold = 0.30; // Increased from 0.20
  
  let overallSignal: SignalType;
  let confidence: number;
  
  // Calculate the proportions
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  // Add additional confirmation check
  const isStrongConfirmation = buyWeight > 2.5 * sellWeight || sellWeight > 2.5 * buyWeight;
  
  // Decision logic - more conservative with clearer signal requirement
  if (buyWeight > 0 && buyWeight > sellWeight * 1.5 && buyProportion > buyThreshold) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight);
    
    // Only boost confidence for very strong signals with confirmation
    if (buyProportion > 0.50 && isStrongConfirmation) {
      confidence = Math.min(100, confidence + 10);
    } else if (!isStrongConfirmation) {
      confidence = Math.max(0, confidence - 5);  // Reduce confidence if not strongly confirmed
    }
    
    // Adjust confidence based on AI prediction
    if (aiPrediction && aiPrediction.confidence > 60) {
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 5);  // Boost confidence if AI agrees
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 10);  // Reduce confidence if AI disagrees strongly
      }
    }
  } 
  else if (sellWeight > 0 && sellWeight > buyWeight * 1.5 && sellProportion > sellThreshold) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight);
    
    // Only boost confidence for very strong signals with confirmation
    if (sellProportion > 0.50 && isStrongConfirmation) {
      confidence = Math.min(100, confidence + 10);
    } else if (!isStrongConfirmation) {
      confidence = Math.max(0, confidence - 5);  // Reduce confidence if not strongly confirmed
    }
    
    // Adjust confidence based on AI prediction
    if (aiPrediction && aiPrediction.confidence > 60) {
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 5);  // Boost confidence if AI agrees
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 10);  // Reduce confidence if AI disagrees strongly
      }
    }
  } 
  // Check for hold signal - more strict criteria
  else if (holdProportion > holdThreshold && holdWeight > buyWeight && holdWeight > sellWeight) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight, totalWeight);
    
    // Adjust confidence based on AI prediction
    if (aiPrediction && aiPrediction.confidence > 60 && aiPrediction.prediction === 'HOLD') {
      confidence = Math.min(100, confidence + 5);  // Boost confidence if AI agrees
    }
  } 
  // If nothing is significant, it's neutral
  else {
    overallSignal = 'NEUTRAL';
    confidence = calculateConfidence(neutralWeight, totalWeight);
  }
  
  // Log the decision
  console.log(`Signal decision: ${overallSignal} with confidence: ${confidence.toFixed(1)}%, buyProportion: ${(buyProportion*100).toFixed(1)}%, sellProportion: ${(sellProportion*100).toFixed(1)}%, holdProportion: ${(holdProportion*100).toFixed(1)}%`);
  
  return { overallSignal, confidence };
};


import { SignalType, IndicatorSignal } from '../types';
import { TradingSignalWeight } from './signalTypes';
import { KlineData } from '../../binanceService';
import { calculateATR } from '../atr';
import { getAIPrediction } from '../aiPrediction';
import { detectMarketRegime, adjustPredictionForRegime } from '../marketRegime';

// Helper function to sum weights for a given signal type
export const sumSignalWeights = (indicators: { [key: string]: IndicatorSignal }, signalType: SignalType): number => {
  return Object.values(indicators)
    .filter(indicator => indicator.signal === signalType)
    .reduce((sum, indicator) => sum + indicator.weight, 0);
};

// Helper function to calculate confidence with more sophisticated model
export const calculateConfidence = (signalWeight: number, totalWeight: number, marketContext?: any): number => {
  if (totalWeight === 0) return 0;
  
  // Base confidence calculation
  const baseConfidence = 20; // Minimum confidence
  const weightedContribution = Math.min(87, (signalWeight / totalWeight) * 87);
  let confidence = Math.min(100, Math.round(baseConfidence + weightedContribution));
  
  // Apply market context adjustments if available
  if (marketContext) {
    // Adjust for market volatility
    if (marketContext.volatility > 70) {
      confidence = Math.max(20, confidence * 0.92);
    }
    
    // Adjust for consistency with market regime
    if (marketContext.regime === 'TRENDING') {
      const signalAlignedWithTrend = 
        (marketContext.direction === 'UP' && marketContext.signal === 'BUY') ||
        (marketContext.direction === 'DOWN' && marketContext.signal === 'SELL');
      
      confidence = signalAlignedWithTrend 
        ? Math.min(100, confidence * 1.15) 
        : Math.max(20, confidence * 0.85);
    }
  }
  
  return Math.round(confidence);
};

// Enhanced price target calculation with ATR and market context
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
  
  // Market regime detection for adaptive targets
  const marketAnalysis = detectMarketRegime(klineData);
  const marketVolatility = marketAnalysis.volatility;
  const isTrending = marketAnalysis.regime === 'TRENDING' && marketAnalysis.strength > 60;
  
  // Adjust ATR multiplier based on market conditions
  let atrMultiplier = 2.0;
  if (marketVolatility > 80) atrMultiplier = 3.0; // Higher stop loss in volatile markets
  else if (marketVolatility < 30) atrMultiplier = 1.5; // Tighter stop loss in calm markets
  
  const isBuy = signal === 'BUY';
  const entryPrice = lastPrice;
  const stopLoss = isBuy ? entryPrice - (lastATR * atrMultiplier) : entryPrice + (lastATR * atrMultiplier);
  const riskAmount = Math.abs(entryPrice - stopLoss);
  
  // Adjust target ratios based on market regime
  let t1Ratio = 1.5;
  let t2Ratio = 3.0;
  let t3Ratio = 5.0;
  
  if (isTrending) {
    // More ambitious targets in trending markets
    t1Ratio = 2.0;
    t2Ratio = 4.0; 
    t3Ratio = 7.0;
  } else if (marketAnalysis.regime === 'RANGING') {
    // More conservative targets in ranging markets
    t1Ratio = 1.2;
    t2Ratio = 2.0;
    t3Ratio = 3.5;
  }
  
  const target1 = isBuy ? entryPrice + (riskAmount * t1Ratio) : entryPrice - (riskAmount * t1Ratio);
  const target2 = isBuy ? entryPrice + (riskAmount * t2Ratio) : entryPrice - (riskAmount * t2Ratio);
  const target3 = isBuy ? entryPrice + (riskAmount * t3Ratio) : entryPrice - (riskAmount * t3Ratio);
  
  // Adaptive risk:reward ratio based on market context
  const riskRewardRatio = isTrending ? 3.5 : 2.5;
  
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

// Compute signal weights with adaptive weighting and context awareness
export const computeSignalWeights = (indicators: { [key: string]: IndicatorSignal }, klineData: KlineData[]): TradingSignalWeight => {
  // Clone indicators to avoid mutating the original
  const modifiedIndicators = JSON.parse(JSON.stringify(indicators));
  
  // Get market context to inform signal weighting
  const marketAnalysis = detectMarketRegime(klineData);
  
  // Adaptive indicator weighting based on market regime
  Object.keys(modifiedIndicators).forEach(key => {
    // Boost early detection signals
    if (key.startsWith('early') || key === 'priceAcceleration') {
      modifiedIndicators[key].weight *= 1.5;
    }
    
    // Adjust weights based on market regime
    switch (marketAnalysis.regime) {
      case 'TRENDING':
        // In trending markets, boost trend indicators
        if (key === 'Trend Consistency' || key === 'ADX' || key === 'EMA Cross') {
          modifiedIndicators[key].weight *= 1.3;
        }
        // Decrease oscillator importance in strong trends
        if (key === 'RSI' || key === 'Stochastic') {
          modifiedIndicators[key].weight *= 0.8;
        }
        break;
        
      case 'RANGING':
        // In ranging markets, boost oscillators
        if (key === 'RSI' || key === 'Stochastic' || key === 'Bollinger') {
          modifiedIndicators[key].weight *= 1.3;
        }
        // Decrease trend indicators
        if (key === 'Trend Consistency' || key === 'ADX') {
          modifiedIndicators[key].weight *= 0.8;
        }
        break;
        
      case 'VOLATILE':
        // In volatile markets, prioritize volume and volatility
        if (key === 'Volume Flow' || key === 'Bollinger' || key === 'ATR') {
          modifiedIndicators[key].weight *= 1.4;
        }
        break;
        
      case 'ACCUMULATION':
        // In accumulation, boost early buy signals and volume
        if (key === 'Volume Flow' || key.includes('Divergence')) {
          modifiedIndicators[key].weight *= 1.5;
        }
        if (modifiedIndicators[key].signal === 'BUY') {
          modifiedIndicators[key].weight *= 1.2;
        }
        break;
        
      case 'DISTRIBUTION':
        // In distribution, boost early sell signals and volume
        if (key === 'Volume Flow' || key.includes('Divergence')) {
          modifiedIndicators[key].weight *= 1.5;
        }
        if (modifiedIndicators[key].signal === 'SELL') {
          modifiedIndicators[key].weight *= 1.2;
        }
        break;
    }
    
    // Dynamic adjustment for HOLD signals
    if (modifiedIndicators[key].signal === 'HOLD') {
      const holdWeightMultiplier = marketAnalysis.volatility > 70 ? 1.2 : 0.8;
      modifiedIndicators[key].weight *= holdWeightMultiplier;
    }
  });
  
  // Get individual signal weights
  const buyWeight = sumSignalWeights(modifiedIndicators, 'BUY');
  const sellWeight = sumSignalWeights(modifiedIndicators, 'SELL');
  const holdWeight = sumSignalWeights(modifiedIndicators, 'HOLD');
  const neutralWeight = sumSignalWeights(modifiedIndicators, 'NEUTRAL');
  const totalWeight = buyWeight + sellWeight + holdWeight + neutralWeight || 1;
  
  // Enhanced AI integration
  const aiPrediction = getAIPrediction(klineData);
  
  // Adjust AI prediction based on market regime
  const adjustedAI = adjustPredictionForRegime(
    aiPrediction.prediction, 
    aiPrediction.confidence,
    marketAnalysis
  );
  
  // Create enhanced AI explanation
  let explanation = '';
  if (adjustedAI.prediction !== aiPrediction.prediction || 
      Math.abs(adjustedAI.confidence - aiPrediction.confidence) > 5) {
    explanation = `AI initially predicted ${aiPrediction.prediction} (${aiPrediction.confidence}%), ` +
                 `adjusted to ${adjustedAI.prediction} (${adjustedAI.confidence}%) based on ${marketAnalysis.regime} market regime`;
  } else if (Math.abs(aiPrediction.predictedChangePercent) < 0.2) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent.toFixed(2)}% (minimal change)`;
  } else if (Math.abs(aiPrediction.predictedChangePercent) < 0.5) {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent.toFixed(2)}% (moderate change)`;
  } else {
    explanation = `Price expected to move ${aiPrediction.predictedChangePercent > 0 ? '+' : ''}${aiPrediction.predictedChangePercent.toFixed(2)}% (significant change)`;
  }
  
  console.log(`Market Regime: ${marketAnalysis.regime} ${marketAnalysis.direction} with ${marketAnalysis.strength}% strength`);
  console.log(`Adjusted AI Prediction: ${adjustedAI.prediction} with ${adjustedAI.confidence}% confidence`);
  
  // Calculate AI contribution to weights with market-aware adjustments
  let aiBuyWeight = 0;
  let aiSellWeight = 0;
  let aiHoldWeight = 0;
  
  if (adjustedAI.confidence > 40) {
    const baseWeight = Math.min(3.5, (adjustedAI.confidence / 100) * 4.0);
    const changeMultiplier = Math.min(2.0, 1 + (Math.abs(aiPrediction.predictedChangePercent) / 1.5));
    const aiWeight = baseWeight * changeMultiplier;
    
    if (adjustedAI.prediction === 'BUY') {
      aiBuyWeight = aiWeight;
    } else if (adjustedAI.prediction === 'SELL') {
      aiSellWeight = aiWeight;
    } else if (adjustedAI.prediction === 'HOLD') {
      aiHoldWeight = aiWeight * 0.8;
    }
  }
  
  // Adjust weights with AI contribution
  const adjustedBuyWeight = buyWeight + aiBuyWeight;
  const adjustedSellWeight = sellWeight + aiSellWeight;
  const adjustedHoldWeight = holdWeight + aiHoldWeight;
  const adjustedTotalWeight = adjustedBuyWeight + adjustedSellWeight + adjustedHoldWeight + neutralWeight;
  
  // Store adjusted AI prediction
  const enhancedAiPrediction = {
    ...aiPrediction,
    prediction: adjustedAI.prediction,
    confidence: adjustedAI.confidence,
    explanation,
    marketRegime: marketAnalysis.regime,
    marketDirection: marketAnalysis.direction,
    marketPhase: marketAnalysis.phase
  };
  
  return {
    buyWeight: adjustedBuyWeight,
    sellWeight: adjustedSellWeight,
    holdWeight: adjustedHoldWeight,
    neutralWeight,
    totalWeight: adjustedTotalWeight,
    aiPrediction: enhancedAiPrediction,
    marketContext: marketAnalysis
  };
};

// Advanced overall signal determination with adaptive thresholds
export const determineOverallSignal = (weights: TradingSignalWeight): { 
  overallSignal: SignalType, 
  confidence: number 
} => {
  const { 
    buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight, 
    aiPrediction, marketContext 
  } = weights;
  
  console.log('Signal weights:', { buyWeight, sellWeight, holdWeight, neutralWeight, totalWeight });
  
  // Adaptive thresholds based on market regime
  let buyThreshold = 0.25;  
  let sellThreshold = 0.25;
  let holdThreshold = 0.30;
  
  // Adjust thresholds based on market conditions if context available
  if (marketContext) {
    switch (marketContext.regime) {
      case 'TRENDING':
        // Make it easier to follow the trend, harder to go against it
        if (marketContext.direction === 'UP') {
          buyThreshold *= 0.85;  // Lower threshold for buy signals in uptrend
          sellThreshold *= 1.2;  // Higher threshold for sell signals in uptrend
        } else if (marketContext.direction === 'DOWN') {
          sellThreshold *= 0.85; // Lower threshold for sell signals in downtrend
          buyThreshold *= 1.2;   // Higher threshold for buy signals in downtrend
        }
        break;
        
      case 'RANGING':
        // More conservative in ranging markets
        buyThreshold *= 1.1;
        sellThreshold *= 1.1;
        holdThreshold *= 0.9;
        break;
        
      case 'VOLATILE':
        // Much higher bar for signals in volatile markets
        buyThreshold *= 1.2;
        sellThreshold *= 1.2;
        holdThreshold *= 0.8;
        break;
        
      case 'ACCUMULATION':
        // Favor buy signals in accumulation
        buyThreshold *= 0.8;
        sellThreshold *= 1.3;
        break;
        
      case 'DISTRIBUTION':
        // Favor sell signals in distribution
        sellThreshold *= 0.8;
        buyThreshold *= 1.3;
        break;
    }
  }
  
  console.log('Adjusted thresholds:', { buyThreshold, sellThreshold, holdThreshold });
  
  // Calculate proportions of each signal type
  const buyProportion = totalWeight > 0 ? buyWeight / totalWeight : 0;
  const sellProportion = totalWeight > 0 ? sellWeight / totalWeight : 0;
  const holdProportion = totalWeight > 0 ? holdWeight / totalWeight : 0;
  
  // Enhanced signal confirmation logic
  const isStrongBuyConfirmation = (
    (buyWeight > 1.8 * sellWeight && buyProportion > buyThreshold) ||
    (buyWeight > 1.2 * sellWeight && buyProportion > 0.4) ||
    (buyProportion > 0.5)
  );
  
  const isStrongSellConfirmation = (
    (sellWeight > 1.8 * buyWeight && sellProportion > sellThreshold) ||
    (sellWeight > 1.2 * buyWeight && sellProportion > 0.4) ||
    (sellProportion > 0.5)
  );
  
  // Context for confidence calculation
  const confidenceContext = marketContext ? {
    volatility: marketContext.volatility,
    regime: marketContext.regime,
    direction: marketContext.direction
  } : undefined;
  
  let overallSignal: SignalType;
  let confidence: number;
  
  // Decision logic with more sophisticated rules
  if (isStrongBuyConfirmation) {
    overallSignal = 'BUY';
    confidence = calculateConfidence(buyWeight, totalWeight, { 
      ...confidenceContext, 
      signal: 'BUY' 
    });
    
    // Adjustments based on proportions
    if (buyProportion > 0.45) {
      confidence = Math.min(100, confidence + 12);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 50) {
      if (aiPrediction.prediction === 'BUY') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'SELL') {
        confidence = Math.max(0, confidence - 10);
      }
    }
  } 
  else if (isStrongSellConfirmation) {
    overallSignal = 'SELL';
    confidence = calculateConfidence(sellWeight, totalWeight, {
      ...confidenceContext,
      signal: 'SELL'
    });
    
    if (sellProportion > 0.45) {
      confidence = Math.min(100, confidence + 12);
    }
    
    // AI consistency bonus
    if (aiPrediction && aiPrediction.confidence > 50) {
      if (aiPrediction.prediction === 'SELL') {
        confidence = Math.min(100, confidence + 8);
      } else if (aiPrediction.prediction === 'BUY') {
        confidence = Math.max(0, confidence - 10);
      }
    }
  } 
  else if (holdProportion > holdThreshold && holdWeight > 0) {
    overallSignal = 'HOLD';
    confidence = calculateConfidence(holdWeight + neutralWeight, totalWeight, {
      ...confidenceContext,
      signal: 'HOLD'
    });
    
    if (aiPrediction && aiPrediction.confidence > 55 && aiPrediction.prediction === 'HOLD') {
      confidence = Math.min(100, confidence + 5);
    }
  }
  // Check for moderate signals
  else if (buyWeight > sellWeight && buyWeight > holdWeight) {
    overallSignal = 'BUY';
    
    // Calculate confidence based on market context
    const strengthMultiplier = marketContext && marketContext.direction === 'UP' ? 0.9 : 0.85;
    confidence = calculateConfidence(buyWeight, totalWeight, {
      ...confidenceContext,
      signal: 'BUY'
    }) * strengthMultiplier;
  }
  else if (sellWeight > buyWeight && sellWeight > holdWeight) {
    overallSignal = 'SELL';
    
    // Calculate confidence based on market context
    const strengthMultiplier = marketContext && marketContext.direction === 'DOWN' ? 0.9 : 0.85;
    confidence = calculateConfidence(sellWeight, totalWeight, {
      ...confidenceContext,
      signal: 'SELL'
    }) * strengthMultiplier;
  }
  else {
    // Default to HOLD when truly in doubt
    overallSignal = 'HOLD';
    
    // Calculate confidence based on how mixed the signals are
    const maxWeight = Math.max(buyWeight, sellWeight);
    confidence = calculateConfidence(maxWeight, totalWeight, {
      ...confidenceContext,
      signal: 'HOLD'
    }) * 0.7;
  }
  
  // Final market context adjustment
  if (marketContext && overallSignal !== 'HOLD') {
    const isAlignedWithMarket = 
      (overallSignal === 'BUY' && marketContext.direction === 'UP') ||
      (overallSignal === 'SELL' && marketContext.direction === 'DOWN');
      
    // Boost confidence if signal aligns with market direction
    if (isAlignedWithMarket && marketContext.strength > 60) {
      confidence = Math.min(100, confidence * 1.1);
    }
    // Reduce confidence if signal contradicts strong market direction
    else if (!isAlignedWithMarket && marketContext.strength > 70) {
      confidence = Math.max(0, confidence * 0.85);
    }
  }
  
  console.log(`Signal decision: ${overallSignal} with confidence: ${confidence.toFixed(1)}%, buyProportion: ${(buyProportion*100).toFixed(1)}%, sellProportion: ${(sellProportion*100).toFixed(1)}%, holdProportion: ${(holdProportion*100).toFixed(1)}%`);
  
  return { overallSignal, confidence: Math.round(confidence) };
};

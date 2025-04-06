import { KlineData } from '../binanceService';
import { detectMarketRegime, adjustPredictionForRegime } from './marketRegime';
import { analyzeMultipleTimeframes } from './multitimeframe';

// For feature extraction - we'll convert raw kline data into features for our model
export const extractFeatures = (klineData: KlineData[], lookbackPeriods: number = 14): number[][] => {
  const features: number[][] = [];
  
  // Make sure we have enough data
  if (klineData.length < lookbackPeriods + 1) {
    console.warn('Not enough data for feature extraction');
    return features;
  }
  
  // Extract features for each data point, starting from lookbackPeriods
  for (let i = lookbackPeriods; i < klineData.length; i++) {
    const dataPoint: number[] = [];
    
    // Price features - normalized against the current price
    const currentPrice = klineData[i].close;
    
    // Add price changes for lookback periods
    for (let j = 1; j <= lookbackPeriods; j++) {
      const pastPrice = klineData[i - j].close;
      // Percent change from past price to current
      dataPoint.push((currentPrice - pastPrice) / pastPrice * 100);
    }
    
    // Add volume changes
    const currentVolume = klineData[i].volume;
    for (let j = 1; j <= lookbackPeriods; j++) {
      const pastVolume = klineData[i - j].volume;
      // Normalized volume change
      if (pastVolume > 0) {
        dataPoint.push((currentVolume - pastVolume) / pastVolume);
      } else {
        dataPoint.push(0);
      }
    }
    
    // Add price volatility (high-low range)
    for (let j = 1; j <= lookbackPeriods; j++) {
      const priceRange = (klineData[i - j].high - klineData[i - j].low) / klineData[i - j].close * 100;
      dataPoint.push(priceRange);
    }
    
    // Add candle body size
    for (let j = 1; j <= lookbackPeriods; j++) {
      const bodySize = Math.abs(klineData[i - j].open - klineData[i - j].close) / klineData[i - j].close * 100;
      dataPoint.push(bodySize);
    }
    
    features.push(dataPoint);
  }
  
  return features;
};

// Enhanced predictive model with early signal detection
export const predictPriceMovement = (klineData: KlineData[]): {
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  predictedChange: number;
} => {
  try {
    if (klineData.length < 50) {
      return { 
        prediction: 'NEUTRAL', 
        confidence: 0,
        predictedChange: 0
      };
    }
    
    // Extract recent price data
    const recentData = klineData.slice(-30);
    const prices = recentData.map(kline => kline.close);
    const volumes = recentData.map(kline => kline.volume);
    const lastPrice = prices[prices.length - 1];
    
    // Calculate weighted price momentum (more recent prices have higher weight)
    let momentumSum = 0;
    let weightSum = 0;
    
    // Improved momentum calculation using shorter lookback windows to detect changes earlier
    for (let i = 3; i < prices.length; i++) {
      const weight = Math.pow(i, 1.5); // Higher exponential weight for recent changes
      const priceChange = (prices[i] - prices[i - 3]) / prices[i - 3];
      momentumSum += priceChange * weight;
      weightSum += weight;
    }
    
    const weightedMomentum = momentumSum / weightSum;
    
    // Calculate volume trend with emphasis on recent volume surges
    const veryRecentVolumeAvg = volumes.slice(-3).reduce((sum, vol) => sum + vol, 0) / 3;
    const recentVolumeAvg = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
    const olderVolumeAvg = volumes.slice(-15, -5).reduce((sum, vol) => sum + vol, 0) / 10;
    
    // Check for volume surges that might indicate an incoming move
    const volumeSurge = veryRecentVolumeAvg / recentVolumeAvg;
    const volumeTrend = recentVolumeAvg / olderVolumeAvg - 1;
    
    // Enhanced volatility calculation - consider both price and volume volatility
    const priceVolatility = prices.slice(-10).map((price, i, arr) => {
      if (i === 0) return 0;
      return Math.abs((price - arr[i - 1]) / arr[i - 1]);
    }).reduce((sum, val) => sum + val, 0) / 9;

    const volumeVolatility = volumes.slice(-10).map((vol, i, arr) => {
      if (i === 0) return 0;
      return Math.abs((vol - arr[i - 1]) / arr[i - 1]);
    }).reduce((sum, val) => sum + val, 0) / 9;
    
    // Check for price acceleration (second derivative of price) - a key early indicator
    const priceDeltas = [];
    for (let i = 1; i < prices.length; i++) {
      priceDeltas.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const acceleration = [];
    for (let i = 1; i < priceDeltas.length; i++) {
      acceleration.push(priceDeltas[i] - priceDeltas[i-1]);
    }
    
    // Calculate average acceleration with higher weight for recent values
    let accSum = 0;
    let accWeightSum = 0;
    for (let i = 0; i < acceleration.length; i++) {
      const weight = i + 1;
      accSum += acceleration[i] * weight;
      accWeightSum += weight;
    }
    const weightedAcceleration = accSum / accWeightSum;
    
    // Combine signals - improved ensemble model with earlier signal detection
    // Weight acceleration heavily as it predicts future direction
    const accelerationFactor = Math.sign(weightedAcceleration) * Math.min(1, Math.abs(weightedAcceleration) * 20);
    const volumeFactor = Math.min(1, Math.max(-1, Math.log(volumeSurge) * 2)) * Math.sign(weightedMomentum);
    
    const combinedSignal = weightedMomentum * 0.4 + accelerationFactor * 0.4 + volumeFactor * 0.2;
    
    // Predict next price change percentage - with improved precision for small movements
    const predictedChange = combinedSignal * 100; // Convert to percentage
    
    // Determine direction and confidence with improved thresholds for earlier signals
    let prediction: 'UP' | 'DOWN' | 'NEUTRAL';
    let confidence: number;
    
    // More sensitive thresholds to catch moves earlier
    if (Math.abs(predictedChange) < 0.08) {
      prediction = 'NEUTRAL';
      confidence = Math.min(100, Math.abs(predictedChange / 0.08 * 100));
    } else if (predictedChange > 0) {
      prediction = 'UP';
      confidence = Math.min(100, 50 + predictedChange * 15); // More responsive confidence scaling
    } else {
      prediction = 'DOWN';
      confidence = Math.min(100, 50 + Math.abs(predictedChange) * 15);
    }
    
    // If we detect strong acceleration, increase confidence to generate earlier signals
    if (Math.abs(weightedAcceleration) > 0.001) {
      confidence = Math.min(100, confidence * 1.2);
    }
    
    // If volume surge detected, further increase confidence
    if (volumeSurge > 1.5 && Math.abs(weightedMomentum) > 0) {
      confidence = Math.min(100, confidence * 1.15);
      // Strengthen prediction based on momentum direction with volume confirmation
      if ((weightedMomentum > 0 && prediction === 'UP') || (weightedMomentum < 0 && prediction === 'DOWN')) {
        confidence = Math.min(100, confidence * 1.1);
      }
    }
    
    // Format the predicted change to have 2 decimal places but keep as number
    const formattedPredictedChange = parseFloat(predictedChange.toFixed(2));
    
    return {
      prediction,
      confidence: Math.round(confidence),
      predictedChange: formattedPredictedChange
    };
  } catch (error) {
    console.error('Error in price prediction model:', error);
    return { 
      prediction: 'NEUTRAL', 
      confidence: 0,
      predictedChange: 0 
    };
  }
};

// Enhanced prediction that combines traditional indicators with ML prediction
export const getAIPrediction = (klineData: KlineData[]): {
  prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
  confidence: number;
  predictedChangePercent: number;
  shortTermPrediction: 'UP' | 'DOWN' | 'NEUTRAL';
  mediumTermPrediction: 'UP' | 'DOWN' | 'NEUTRAL';
  explanation?: string;
} => {
  // Get base prediction from the model - now with earlier signal detection
  const shortTermPrediction = predictPriceMovement(klineData);
  
  // Medium term prediction (using less recent data to simulate longer timeframe)
  const extendedKlineData = [...klineData]; // Create a copy to avoid mutation
  if (extendedKlineData.length > 50) {
    // Add some statistical noise to simulate future data for medium-term prediction
    const lastKline = { ...extendedKlineData[extendedKlineData.length - 1] };
    const volatility = calculateVolatility(extendedKlineData.slice(-20));
    
    for (let i = 0; i < 5; i++) {
      const randomChange = (Math.random() - 0.5) * volatility * 2 * lastKline.close;
      const newClose = Math.max(0, lastKline.close + randomChange);
      const newHigh = Math.max(newClose * (1 + Math.random() * 0.01), newClose);
      const newLow = Math.min(newClose * (1 - Math.random() * 0.01), newClose);
      
      extendedKlineData.push({
        ...lastKline,
        openTime: lastKline.openTime + 60000 * (i + 1),
        closeTime: lastKline.closeTime + 60000 * (i + 1),
        open: lastKline.close,
        high: newHigh,
        low: newLow,
        close: newClose,
        volume: lastKline.volume * (0.8 + Math.random() * 0.4)
      });
    }
  }
  
  const mediumTermPrediction = predictPriceMovement(extendedKlineData);
  
  // Get market regime analysis
  const marketRegime = detectMarketRegime(klineData);
  
  // Get multi-timeframe analysis (if we have enough data)
  const multitimeframe = klineData.length >= 200 ? analyzeMultipleTimeframes(klineData) : null;
  
  // NEW: Early signal detection using divergences and fractals
  const divAndFractals = detectDivergencesAndFractals(klineData);
  
  // Determine trading signal based on short and medium term predictions
  let prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' = 'NEUTRAL';
  let confidence = 0;
  let explanation = "";
  
  // Rules for signal generation combining short and medium term with early pattern detection
  if (shortTermPrediction.prediction === 'UP' && mediumTermPrediction.prediction === 'UP') {
    prediction = 'BUY';
    confidence = (shortTermPrediction.confidence * 0.7 + mediumTermPrediction.confidence * 0.3);
    explanation = "Strong upward momentum detected across multiple timeframes";
  } else if (shortTermPrediction.prediction === 'DOWN' && mediumTermPrediction.prediction === 'DOWN') {
    prediction = 'SELL';
    confidence = (shortTermPrediction.confidence * 0.7 + mediumTermPrediction.confidence * 0.3);
    explanation = "Strong downward momentum detected across multiple timeframes";
  } else if (mediumTermPrediction.prediction === 'UP' && shortTermPrediction.prediction !== 'DOWN') {
    prediction = 'BUY';
    confidence = mediumTermPrediction.confidence * 0.6;
    explanation = "Medium-term uptrend detected without short-term bearish signals";
  } else if (mediumTermPrediction.prediction === 'DOWN' && shortTermPrediction.prediction !== 'UP') {
    prediction = 'SELL';
    confidence = mediumTermPrediction.confidence * 0.6;
    explanation = "Medium-term downtrend detected without short-term bullish signals";
  } else if (shortTermPrediction.prediction === 'NEUTRAL' && mediumTermPrediction.prediction === 'NEUTRAL') {
    prediction = 'HOLD';
    confidence = (shortTermPrediction.confidence + mediumTermPrediction.confidence) / 2;
    explanation = "No significant trend detected in either timeframe";
  } else {
    prediction = 'HOLD';
    confidence = 40; // Lower confidence for mixed signals
    explanation = "Mixed signals between short and medium-term trends";
  }
  
  // Incorporate early pattern signals to get ahead of price movements
  if (divAndFractals.hasBullishDivergence && confidence < 90) {
    if (prediction !== 'BUY') {
      prediction = 'BUY';
      explanation = "Bullish divergence detected - early buy signal";
    }
    confidence = Math.max(confidence, 60); // Minimum confidence for divergence signals
  } else if (divAndFractals.hasBearishDivergence && confidence < 90) {
    if (prediction !== 'SELL') {
      prediction = 'SELL';
      explanation = "Bearish divergence detected - early sell signal";
    }
    confidence = Math.max(confidence, 60); // Minimum confidence for divergence signals
  }
  
  // Factor in fractals for early reversal detection
  if (divAndFractals.hasUpperFractal && prediction === 'BUY' && confidence < 90) {
    confidence = Math.max(0, confidence - 10); // Reduce buy confidence when upper fractal forms
    explanation += " - Caution: Upper fractal detected";
  } else if (divAndFractals.hasLowerFractal && prediction === 'SELL' && confidence < 90) {
    confidence = Math.max(0, confidence - 10); // Reduce sell confidence when lower fractal forms
    explanation += " - Caution: Lower fractal detected";
  }
  
  // Apply multi-timeframe alignment adjustment for confirmation
  if (multitimeframe) {
    // If timeframes strongly agree, boost confidence
    if (multitimeframe.alignmentScore > 70) {
      if ((prediction === 'BUY' && multitimeframe.dominantSignal === 'UP') ||
          (prediction === 'SELL' && multitimeframe.dominantSignal === 'DOWN')) {
        confidence = Math.min(100, confidence * (1 + multitimeframe.alignmentScore / 200));
        explanation += " with strong multi-timeframe confirmation";
      }
      // If they strongly disagree, reduce confidence
      else if ((prediction === 'BUY' && multitimeframe.dominantSignal === 'DOWN') ||
               (prediction === 'SELL' && multitimeframe.dominantSignal === 'UP')) {
        confidence = Math.max(0, confidence * (1 - multitimeframe.alignmentScore / 150));
        explanation += " but conflicts with other timeframes";
      }
    }
    
    // If timeframes show mixed signals but strong aligned change in one direction
    if (Math.abs(multitimeframe.weightedPredictedChange) > 0.5 && multitimeframe.alignmentScore > 60) {
      if (multitimeframe.weightedPredictedChange > 0.5 && prediction !== 'BUY') {
        prediction = 'BUY';
        confidence = Math.min(85, multitimeframe.weightedConfidence);
        explanation = "Multi-timeframe analysis indicates bullish momentum";
      } else if (multitimeframe.weightedPredictedChange < -0.5 && prediction !== 'SELL') {
        prediction = 'SELL';
        confidence = Math.min(85, multitimeframe.weightedConfidence);
        explanation = "Multi-timeframe analysis indicates bearish momentum";
      }
    }
  }
  
  // Adjust for market regime
  const adjustedSignal = adjustPredictionForRegime(prediction, confidence, marketRegime);
  prediction = adjustedSignal.prediction;
  confidence = adjustedSignal.confidence;
  
  // Add market regime context to explanation
  if (marketRegime) {
    explanation = `${explanation} [${marketRegime.regime.toLowerCase()} ${marketRegime.direction.toLowerCase()} market]`;
  }
  
  return {
    prediction,
    confidence: Math.min(100, Math.round(confidence)),
    predictedChangePercent: shortTermPrediction.predictedChange,
    shortTermPrediction: shortTermPrediction.prediction,
    mediumTermPrediction: mediumTermPrediction.prediction,
    explanation: explanation
  };
};

// NEW: Detect divergences and fractals for early signal detection
interface DivergenceAndFractalResult {
  hasBullishDivergence: boolean;
  hasBearishDivergence: boolean;
  hasUpperFractal: boolean;
  hasLowerFractal: boolean;
}

function detectDivergencesAndFractals(klineData: KlineData[]): DivergenceAndFractalResult {
  if (klineData.length < 30) {
    return {
      hasBullishDivergence: false,
      hasBearishDivergence: false,
      hasUpperFractal: false,
      hasLowerFractal: false
    };
  }
  
  const prices = klineData.map(k => k.close);
  const highs = klineData.map(k => k.high);
  const lows = klineData.map(k => k.low);
  
  // Calculate RSI for divergence detection
  const deltas = [];
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i] - prices[i-1]);
  }
  
  const gains = deltas.map(d => d > 0 ? d : 0);
  const losses = deltas.map(d => d < 0 ? -d : 0);
  
  // Calculate average gains and losses over 14 periods
  const avgGain = [];
  const avgLoss = [];
  
  // First average gain and loss
  avgGain.push(gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14);
  avgLoss.push(losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14);
  
  // Rest of average gains and losses
  for (let i = 14; i < prices.length - 1; i++) {
    avgGain.push((avgGain[avgGain.length - 1] * 13 + gains[i]) / 14);
    avgLoss.push((avgLoss[avgLoss.length - 1] * 13 + losses[i]) / 14);
  }
  
  // Calculate RS and RSI
  const rs = [];
  for (let i = 0; i < avgGain.length; i++) {
    rs.push(avgLoss[i] === 0 ? 100 : avgGain[i] / avgLoss[i]);
  }
  
  const rsi = rs.map(r => 100 - (100 / (1 + r)));
  
  // Check for RSI divergences (using last 30 candles)
  let hasBullishDivergence = false;
  let hasBearishDivergence = false;
  
  const lastPrices = prices.slice(-30);
  const lastRsi = rsi.slice(-30 + 14); // Account for RSI calculation window
  
  // Look for bullish divergence: prices making lower lows but RSI making higher lows
  const priceIsLowerLow = lastPrices[lastPrices.length - 1] < Math.min(...lastPrices.slice(-10, -1));
  const rsiIsHigherLow = lastRsi[lastRsi.length - 1] > Math.min(...lastRsi.slice(-10, -1));
  
  if (priceIsLowerLow && rsiIsHigherLow && lastRsi[lastRsi.length - 1] < 40) {
    hasBullishDivergence = true;
  }
  
  // Look for bearish divergence: prices making higher highs but RSI making lower highs
  const priceIsHigherHigh = lastPrices[lastPrices.length - 1] > Math.max(...lastPrices.slice(-10, -1));
  const rsiIsLowerHigh = lastRsi[lastRsi.length - 1] < Math.max(...lastRsi.slice(-10, -1));
  
  if (priceIsHigherHigh && rsiIsLowerHigh && lastRsi[lastRsi.length - 1] > 60) {
    hasBearishDivergence = true;
  }
  
  // Detect fractals (patterns that signal potential reversals)
  // Upper fractal: a candle with two lower highs on each side
  const hasUpperFractal = 
    highs.length >= 5 && 
    highs[highs.length - 3] > highs[highs.length - 5] &&
    highs[highs.length - 3] > highs[highs.length - 4] &&
    highs[highs.length - 3] > highs[highs.length - 2] && 
    highs[highs.length - 3] > highs[highs.length - 1];
  
  // Lower fractal: a candle with two higher lows on each side
  const hasLowerFractal = 
    lows.length >= 5 && 
    lows[lows.length - 3] < lows[lows.length - 5] &&
    lows[lows.length - 3] < lows[lows.length - 4] &&
    lows[lows.length - 3] < lows[lows.length - 2] && 
    lows[lows.length - 3] < lows[lows.length - 1];
  
  return {
    hasBullishDivergence,
    hasBearishDivergence,
    hasUpperFractal,
    hasLowerFractal
  };
}

// Helper function to calculate price volatility
const calculateVolatility = (klineData: KlineData[]): number => {
  if (klineData.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < klineData.length; i++) {
    const returnVal = (klineData[i].close - klineData[i-1].close) / klineData[i-1].close;
    returns.push(returnVal);
  }
  
  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

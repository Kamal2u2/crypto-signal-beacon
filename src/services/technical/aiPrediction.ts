import { KlineData } from '../binanceService';

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

// Enhanced predictive model using weighted moving average and trend detection
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
    
    for (let i = 5; i < prices.length; i++) {
      const weight = i;
      const priceChange = (prices[i] - prices[i - 5]) / prices[i - 5];
      momentumSum += priceChange * weight;
      weightSum += weight;
    }
    
    const weightedMomentum = momentumSum / weightSum;
    
    // Calculate volume trend
    const recentVolumeAvg = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
    const olderVolumeAvg = volumes.slice(-10, -5).reduce((sum, vol) => sum + vol, 0) / 5;
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
    
    // Combine signals - improved ensemble model with volatility adjustment
    // Weight the momentum by volume trend and adjust for volatility
    const combinedSignal = weightedMomentum * (1 + volumeTrend * 0.5) / (1 + priceVolatility * volumeVolatility * 0.5);
    
    // Predict next price change percentage - with improved precision for small movements
    const predictedChange = combinedSignal * 100; // Convert to percentage
    
    // Determine direction and confidence with improved thresholds
    let prediction: 'UP' | 'DOWN' | 'NEUTRAL';
    let confidence: number;
    
    if (Math.abs(predictedChange) < 0.12) {
      prediction = 'NEUTRAL';
      confidence = Math.min(100, Math.abs(predictedChange / 0.12 * 100));
    } else if (predictedChange > 0) {
      prediction = 'UP';
      confidence = Math.min(100, 50 + predictedChange * 12);
    } else {
      prediction = 'DOWN';
      confidence = Math.min(100, 50 + Math.abs(predictedChange) * 12);
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
} => {
  // Get base prediction from the model
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
  
  // Determine trading signal based on short and medium term predictions
  let prediction: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' = 'NEUTRAL';
  let confidence = 0;
  
  // Rules for signal generation combining short and medium term
  if (shortTermPrediction.prediction === 'UP' && mediumTermPrediction.prediction === 'UP') {
    prediction = 'BUY';
    confidence = (shortTermPrediction.confidence * 0.7 + mediumTermPrediction.confidence * 0.3);
  } else if (shortTermPrediction.prediction === 'DOWN' && mediumTermPrediction.prediction === 'DOWN') {
    prediction = 'SELL';
    confidence = (shortTermPrediction.confidence * 0.7 + mediumTermPrediction.confidence * 0.3);
  } else if (mediumTermPrediction.prediction === 'UP' && shortTermPrediction.prediction !== 'DOWN') {
    prediction = 'BUY';
    confidence = mediumTermPrediction.confidence * 0.6;
  } else if (mediumTermPrediction.prediction === 'DOWN' && shortTermPrediction.prediction !== 'UP') {
    prediction = 'SELL';
    confidence = mediumTermPrediction.confidence * 0.6;
  } else if (shortTermPrediction.prediction === 'NEUTRAL' && mediumTermPrediction.prediction === 'NEUTRAL') {
    prediction = 'HOLD';
    confidence = (shortTermPrediction.confidence + mediumTermPrediction.confidence) / 2;
  } else {
    prediction = 'HOLD';
    confidence = 40; // Lower confidence for mixed signals
  }
  
  return {
    prediction,
    confidence: Math.min(100, Math.round(confidence)),
    predictedChangePercent: shortTermPrediction.predictedChange,
    shortTermPrediction: shortTermPrediction.prediction,
    mediumTermPrediction: mediumTermPrediction.prediction
  };
};

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
};

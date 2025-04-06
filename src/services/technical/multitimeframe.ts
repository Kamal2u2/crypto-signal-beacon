
import { KlineData, TimeInterval } from '../binanceService';
import { predictPriceMovement } from './aiPrediction';

// Define the timeframes to analyze and their weights
const TIMEFRAMES: { interval: TimeInterval; weight: number }[] = [
  { interval: '5m', weight: 0.15 },
  { interval: '15m', weight: 0.25 },
  { interval: '1h', weight: 0.35 },
  { interval: '4h', weight: 0.25 },
];

export interface TimeframeSignal {
  interval: TimeInterval;
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  predictedChange: number;
}

export interface MultitimeframeAnalysis {
  signals: TimeframeSignal[];
  alignmentScore: number; // 0-100, how aligned the signals are
  dominantSignal: 'UP' | 'DOWN' | 'NEUTRAL';
  weightedPredictedChange: number;
  weightedConfidence: number;
}

/**
 * Simulates analysis for different timeframes by resampling the data
 * @param klineData Original kline data (assumed to be the smallest timeframe)
 * @returns Multi-timeframe analysis result
 */
export const analyzeMultipleTimeframes = (klineData: KlineData[]): MultitimeframeAnalysis => {
  if (klineData.length < 200) {
    return {
      signals: [],
      alignmentScore: 0,
      dominantSignal: 'NEUTRAL',
      weightedPredictedChange: 0,
      weightedConfidence: 0
    };
  }

  const signals: TimeframeSignal[] = [];
  let weightedChangeSum = 0;
  let weightedConfidenceSum = 0;
  let totalWeight = 0;
  
  // Count signals for alignment score
  let upCount = 0;
  let downCount = 0;
  let neutralCount = 0;
  
  // Process each timeframe
  for (const tf of TIMEFRAMES) {
    // For higher timeframes, we need to resample the data
    // This is a simplified approach - in real systems we would use actual higher timeframe data
    const resampledData = resampleKlineData(klineData, tf.interval);
    
    // Get prediction for this timeframe
    const prediction = predictPriceMovement(resampledData);
    
    signals.push({
      interval: tf.interval,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      predictedChange: prediction.predictedChange
    });
    
    // Update weighted sums
    weightedChangeSum += prediction.predictedChange * tf.weight;
    weightedConfidenceSum += prediction.confidence * tf.weight;
    totalWeight += tf.weight;
    
    // Update signal counts
    if (prediction.prediction === 'UP') upCount += tf.weight;
    else if (prediction.prediction === 'DOWN') downCount += tf.weight;
    else neutralCount += tf.weight;
  }
  
  // Calculate alignment score (100 = all signals agree, 0 = evenly split)
  const maxSignal = Math.max(upCount, downCount, neutralCount);
  const alignmentScore = ((maxSignal / totalWeight) - (1/3)) * 150; // Scale to 0-100
  
  // Determine dominant signal
  let dominantSignal: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (upCount > downCount && upCount > neutralCount) {
    dominantSignal = 'UP';
  } else if (downCount > upCount && downCount > neutralCount) {
    dominantSignal = 'DOWN';
  }
  
  return {
    signals,
    alignmentScore: Math.max(0, Math.min(100, Math.round(alignmentScore))),
    dominantSignal,
    weightedPredictedChange: weightedChangeSum / totalWeight,
    weightedConfidence: weightedConfidenceSum / totalWeight
  };
};

/**
 * Resamples kline data to a higher timeframe
 * This is a simplified approach - in production, use actual data from different timeframes
 * @param klineData Original kline data
 * @param targetInterval Target timeframe
 * @returns Resampled kline data
 */
const resampleKlineData = (klineData: KlineData[], targetInterval: TimeInterval): KlineData[] => {
  // This is a simplified implementation
  // In a real system, you would fetch actual data for each timeframe
  
  // Define multipliers for each timeframe compared to the base (assuming base is 1m)
  const intervalMultipliers: Record<TimeInterval, number> = {
    '1m': 1,
    '3m': 3,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440
  };
  
  // Determine the base interval and target multiplier
  // For simplicity, assume the input data is 1m timeframe
  const baseInterval: TimeInterval = '1m';
  const baseMultiplier = intervalMultipliers[baseInterval];
  const targetMultiplier = intervalMultipliers[targetInterval];
  const ratio = targetMultiplier / baseMultiplier;
  
  // If ratio is 1, no resampling needed
  if (ratio === 1) return [...klineData];
  
  const resampledData: KlineData[] = [];
  
  // Group data by the ratio and create new candles
  for (let i = 0; i < klineData.length; i += ratio) {
    if (i + ratio > klineData.length) break;
    
    const chunk = klineData.slice(i, i + ratio);
    
    const newCandle: KlineData = {
      openTime: chunk[0].openTime,
      closeTime: chunk[chunk.length - 1].closeTime,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
      trades: chunk.reduce((sum, c) => sum + (c.trades || 0), 0),
      quoteAssetVolume: chunk.reduce((sum, c) => sum + (c.quoteAssetVolume || 0), 0),
      takerBuyBaseAssetVolume: chunk.reduce((sum, c) => sum + (c.takerBuyBaseAssetVolume || 0), 0),
      takerBuyQuoteAssetVolume: chunk.reduce((sum, c) => sum + (c.takerBuyQuoteAssetVolume || 0), 0)
    };
    
    resampledData.push(newCandle);
  }
  
  return resampledData;
};

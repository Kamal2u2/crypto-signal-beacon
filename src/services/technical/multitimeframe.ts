
import { KlineData, TimeInterval } from '../binanceService';
import { SignalType } from './types';
import { calculateSMA, calculateEMA } from './movingAverages';
import { calculateRSI } from './oscillators';
import { calculateMACD } from './macd';
import { calculateBollingerBands } from './bollingerBands';
import { predictPriceMovement } from './aiPrediction';

// Define the valid timeframes for multi-timeframe analysis
const VALID_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

// Weight for each timeframe (higher weight for longer timeframes)
const TIMEFRAME_WEIGHTS: Record<TimeInterval, number> = {
  '1m': 0.2,
  '5m': 0.4,
  '15m': 0.6,
  '30m': 0.8,
  '1h': 1.0,
  '4h': 1.5,
  '1d': 2.0
};

// Interface for MTF analysis result
interface MTFAnalysisResult {
  dominantSignal: 'UP' | 'DOWN' | 'NEUTRAL';
  alignmentScore: number; // 0-100 score indicating timeframe alignment
  timeframeSignals: Record<TimeInterval, 'UP' | 'DOWN' | 'NEUTRAL'>;
  weightedConfidence: number;
  weightedPredictedChange: number;
}

/**
 * Analyze multiple timeframes from a single dataset
 * This function simulates different timeframes from the provided data
 * @param klineData The candlestick data (should be 1m data ideally)
 * @returns Analysis across multiple timeframes
 */
export const analyzeMultipleTimeframes = (klineData: KlineData[]): MTFAnalysisResult => {
  // Need sufficient data for multi-timeframe analysis
  if (klineData.length < 200) {
    return {
      dominantSignal: 'NEUTRAL',
      alignmentScore: 0,
      timeframeSignals: {} as Record<TimeInterval, 'UP' | 'DOWN' | 'NEUTRAL'>,
      weightedConfidence: 0,
      weightedPredictedChange: 0
    };
  }
  
  // Results by timeframe
  const results: Record<TimeInterval, {
    signal: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    predictedChange: number;
  }> = {} as Record<TimeInterval, {
    signal: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    predictedChange: number;
  }>;
  
  // Analyze each timeframe
  VALID_TIMEFRAMES.forEach(timeframe => {
    // Create simulated data for this timeframe by aggregating candles
    const timeframeData = simulateTimeframe(klineData, timeframe);
    if (timeframeData.length < 30) return; // Skip if not enough data
    
    // Analyze this timeframe
    results[timeframe] = analyzeTimeframe(timeframeData);
  });
  
  // Skip incomplete results
  const timeframes = Object.keys(results).filter(tf => VALID_TIMEFRAMES.includes(tf as TimeInterval)) as TimeInterval[];
  if (timeframes.length < 3) {
    return {
      dominantSignal: 'NEUTRAL',
      alignmentScore: 0,
      timeframeSignals: {} as Record<TimeInterval, 'UP' | 'DOWN' | 'NEUTRAL'>,
      weightedConfidence: 0,
      weightedPredictedChange: 0
    };
  }
  
  // Count signals by type
  const signalCounts = {
    UP: 0,
    DOWN: 0,
    NEUTRAL: 0
  };
  
  let totalWeight = 0;
  let weightedConfidenceSum = 0;
  let weightedChangeSum = 0;
  const timeframeSignals: Record<TimeInterval, 'UP' | 'DOWN' | 'NEUTRAL'> = {} as Record<TimeInterval, 'UP' | 'DOWN' | 'NEUTRAL'>;
  
  timeframes.forEach(tf => {
    const weight = TIMEFRAME_WEIGHTS[tf];
    const result = results[tf];
    timeframeSignals[tf] = result.signal;
    
    signalCounts[result.signal] += weight;
    totalWeight += weight;
    weightedConfidenceSum += result.confidence * weight;
    weightedChangeSum += result.predictedChange * weight;
  });
  
  // Determine dominant signal type
  let dominantSignal: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  const upScore = signalCounts.UP / totalWeight;
  const downScore = signalCounts.DOWN / totalWeight;
  
  // Require a clearer majority for non-neutral signals
  if (upScore > downScore && upScore > 0.5) {
    dominantSignal = 'UP';
  } else if (downScore > upScore && downScore > 0.5) {
    dominantSignal = 'DOWN';
  }
  
  // Calculate alignment score (how consistent are timeframes?)
  const maxCount = Math.max(signalCounts.UP, signalCounts.DOWN, signalCounts.NEUTRAL);
  const alignmentScore = (maxCount / totalWeight) * 100;
  
  // Calculate weighted average confidence and change
  const weightedConfidence = weightedConfidenceSum / totalWeight;
  const weightedPredictedChange = weightedChangeSum / totalWeight;
  
  return {
    dominantSignal,
    alignmentScore,
    timeframeSignals,
    weightedConfidence,
    weightedPredictedChange
  };
};

/**
 * Simulate higher timeframe data from 1m candles
 * @param baseData Original kline data (1m timeframe ideally)
 * @param targetTimeframe Target timeframe to simulate
 * @returns Kline data for the target timeframe
 */
function simulateTimeframe(baseData: KlineData[], targetTimeframe: TimeInterval): KlineData[] {
  if (baseData.length === 0) return [];
  
  // Determine candle aggregation factor
  let aggregationFactor = 1;
  if (targetTimeframe === '5m') aggregationFactor = 5;
  else if (targetTimeframe === '15m') aggregationFactor = 15;
  else if (targetTimeframe === '30m') aggregationFactor = 30;
  else if (targetTimeframe === '1h') aggregationFactor = 60;
  else if (targetTimeframe === '4h') aggregationFactor = 240;
  else if (targetTimeframe === '1d') aggregationFactor = 1440;
  
  // If the requested timeframe is the same as the base data, return as-is
  if (aggregationFactor === 1) return baseData;
  
  const result: KlineData[] = [];
  let currentCandle: KlineData | null = null;
  
  for (let i = 0; i < baseData.length; i++) {
    const candle = baseData[i];
    
    // Use modulo to determine start of new candle
    if (i % aggregationFactor === 0) {
      if (currentCandle !== null) {
        result.push(currentCandle);
      }
      
      // Start a new candle
      currentCandle = {
        openTime: candle.openTime,
        closeTime: candle.openTime + (aggregationFactor * 60000) - 1, // -1ms to not overlap
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      };
    } else if (currentCandle !== null) {
      // Update existing candle
      currentCandle.high = Math.max(currentCandle.high, candle.high);
      currentCandle.low = Math.min(currentCandle.low, candle.low);
      currentCandle.close = candle.close; // Last closing price becomes the close
      currentCandle.volume += candle.volume; // Sum the volumes
    }
  }
  
  // Add the last candle
  if (currentCandle !== null) {
    result.push(currentCandle);
  }
  
  return result;
}

/**
 * Analyze a specific timeframe
 * @param timeframeData Candlestick data for the timeframe
 * @returns Signal analysis for the timeframe
 */
function analyzeTimeframe(timeframeData: KlineData[]): {
  signal: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  predictedChange: number;
} {
  const closes = timeframeData.map(candle => candle.close);
  
  // Calculate key indicators
  const sma20 = calculateSMA(closes, 20);
  const ema9 = calculateEMA(closes, 9);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bbands = calculateBollingerBands(closes);
  
  // Get the latest values
  const close = closes[closes.length - 1];
  const sma = sma20[sma20.length - 1];
  const rsi = rsi14[rsi14.length - 1];
  const macdValue = macd.macd[macd.macd.length - 1];
  const macdSignal = macd.signal[macd.signal.length - 1];
  
  // Run AI prediction for this timeframe
  const prediction = predictPriceMovement(timeframeData);
  
  // Build signal from indicators
  let bullSignals = 0;
  let bearSignals = 0;
  
  // Price above SMA20
  if (close > sma) bullSignals++;
  else bearSignals++;
  
  // RSI indicator
  if (rsi < 30) bullSignals++;
  else if (rsi > 70) bearSignals++;
  
  // MACD indicator
  if (macdValue > macdSignal) bullSignals++;
  else if (macdValue < macdSignal) bearSignals++;
  
  // Determine signal
  let signal: 'UP' | 'DOWN' | 'NEUTRAL';
  
  if (prediction.prediction === 'UP') {
    bullSignals += 2; // Give more weight to AI prediction
  } else if (prediction.prediction === 'DOWN') {
    bearSignals += 2;
  }
  
  // Determine final signal with bias toward neutrality
  if (bullSignals > bearSignals + 1) {
    signal = 'UP';
  } else if (bearSignals > bullSignals + 1) {
    signal = 'DOWN';
  } else {
    signal = 'NEUTRAL';
  }
  
  return {
    signal,
    confidence: prediction.confidence,
    predictedChange: prediction.predictedChange
  };
}

/**
 * Convert signal type to direction
 * @param signal Trading signal
 * @returns Direction as UP/DOWN/NEUTRAL
 */
export const signalToDirection = (signal: SignalType): 'UP' | 'DOWN' | 'NEUTRAL' => {
  switch (signal) {
    case 'BUY':
      return 'UP';
    case 'SELL':
      return 'DOWN';
    default:
      return 'NEUTRAL';
  }
};
